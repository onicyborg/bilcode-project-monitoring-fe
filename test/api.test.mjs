import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function client(handler) {
  const calls = [];
  let now = 1000;
  const exports = {};
  const source = ts.transpileModule(readFileSync("src/lib/api.ts", "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  vm.runInNewContext(source, {
    exports,
    Date: class extends Date {
      static now() {
        return now;
      }
    },
    fetch: async (path, options) => {
      calls.push({ path, ...options });
      const { status = 200, data = {} } = await handler(path, options, calls);
      return new Response(JSON.stringify(data), { status });
    },
  });
  return {
    api: exports.api,
    calls,
    advance: (ms) => {
      now += ms;
    },
  };
}
const tokens = (value = "access-A") => ({
  access_token: value,
  expires_in: 900,
});

test("reload bootstraps from the HttpOnly refresh cookie and parallel requests share one refresh", async () => {
  const { api, calls } = client(async (path) => {
    if (path === "/api/auth/refresh") {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { data: tokens() };
    }
    return { data: { ok: true } };
  });
  await Promise.all([
    api("/auth/me"),
    api("/monitor/summary"),
    api("/logs/events"),
  ]);
  assert.equal(calls.filter((c) => c.path === "/api/auth/refresh").length, 1);
  for (const call of calls.filter((c) => c.path !== "/api/auth/refresh")) {
    assert.equal(call.headers.Authorization, "Bearer access-A");
    assert.equal(call.credentials, "include");
  }
});

test("login keeps access JWT in memory and refreshes before its 15-minute expiry", async () => {
  const { api, calls, advance } = client(async (path) => ({
    data: tokens(path.endsWith("refresh") ? "access-B" : "access-A"),
  }));
  await api("/auth/login", "POST", { username: "operator", password: "dummy" });
  await api("/auth/me");
  assert.equal(calls.at(-1).headers.Authorization, "Bearer access-A");
  advance(901_000);
  await api("/monitor/summary");
  assert.equal(calls.filter((c) => c.path.endsWith("refresh")).length, 1);
  assert.equal(calls.at(-1).headers.Authorization, "Bearer access-B");
});

test("concurrent 401 responses refresh once and retry each request once", async () => {
  const { api, calls } = client(async (path, options) => {
    if (path.endsWith("login")) return { data: tokens("old") };
    if (path.endsWith("refresh")) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { data: tokens("new") };
    }
    return {
      status: options.headers.Authorization === "Bearer new" ? 200 : 401,
    };
  });
  await api("/auth/login", "POST", {});
  await Promise.all([api("/auth/me"), api("/monitor/summary")]);
  assert.equal(calls.filter((c) => c.path.endsWith("refresh")).length, 1);
  assert.equal(
    calls.filter((c) => c.headers.Authorization === "Bearer new").length,
    2,
  );
});

test("revoked refresh sessions return 401 without recursive retries and allow login again", async () => {
  const { api, calls } = client(async (path) =>
    path.endsWith("refresh")
      ? { status: 401, data: { message: "expired" } }
      : { data: tokens() },
  );
  await assert.rejects(api("/auth/me"), (error) => error.status === 401);
  assert.equal(calls.length, 1);
  await api("/auth/login", "POST", {});
  await api("/auth/me");
  assert.equal(calls.at(-1).headers.Authorization, "Bearer access-A");
});

test("logout waits for in-flight rotation and removes access credentials", async () => {
  let release;
  const ready = new Promise((resolve) => {
    release = resolve;
  });
  const { api, calls } = client(async (path) => {
    if (path.endsWith("refresh")) {
      await ready;
      return { data: tokens() };
    }
    return { data: {} };
  });
  const loading = api("/auth/me");
  const logout = api("/auth/logout", "POST");
  assert.equal(
    calls.some((c) => c.path.endsWith("logout")),
    false,
  );
  release();
  await Promise.all([loading, logout]);
  await api("/auth/me");
  assert.equal(calls.filter((c) => c.path.endsWith("refresh")).length, 2);
  assert.equal(
    calls.find((c) => c.path.endsWith("logout")).headers.Authorization,
    "Bearer access-A",
  );
});
