import { cp, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const standalone = path.join(root, ".next/standalone");
const server = path.join(standalone, "server.js");
if (!existsSync(server))
  throw new Error("Standalone build is missing. Run pnpm build first.");
await mkdir(path.join(standalone, ".next"), { recursive: true });
await cp(
  path.join(root, ".next/static"),
  path.join(standalone, ".next/static"),
  { recursive: true },
);
if (existsSync(path.join(root, "public"))) {
  await cp(path.join(root, "public"), path.join(standalone, "public"), {
    recursive: true,
  });
}
const child = spawn(process.execPath, [server], {
  cwd: standalone,
  env: {
    ...process.env,
    PORT: process.env.PORT || "3100",
    HOSTNAME: process.env.FRONTEND_HOST || "127.0.0.1",
  },
  stdio: "inherit",
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 0));
child.on("error", () => process.exit(1));
