export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

type Tokens = { access_token: string; expires_in: number };
let accessToken: string | undefined;
let expiresAt = 0;
let refreshing: Promise<void> | undefined;
let generation = 0;
const forget = () => {
  accessToken = undefined;
  expiresAt = 0;
  generation++;
};
const remember = (tokens: Tokens) => {
  accessToken = tokens.access_token;
  expiresAt = Date.now() + tokens.expires_in * 1000;
};

async function send(
  path: string,
  method: string,
  body?: unknown,
  token?: string,
) {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: "include",
    cache: "no-store",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new ApiError(
      (Array.isArray(data.message) ? data.message.join(" ") : data.message) ||
        "Request gagal. Periksa koneksi backend.",
      response.status,
    );
  return data;
}

function refresh() {
  if (!refreshing) {
    const current = generation;
    const run = async () => {
      const tokens = await send("/auth/refresh", "POST");
      if (generation !== current)
        throw new ApiError("Sesi panel berubah. Silakan masuk kembali.", 401);
      remember(tokens);
    };
    const locked =
      typeof navigator !== "undefined" && navigator.locks
        ? navigator.locks.request("monitor-panel-refresh", run)
        : run();
    refreshing = Promise.resolve(locked)
      .catch((error) => {
        if (
          error instanceof ApiError &&
          error.status === 401 &&
          generation === current
        )
          forget();
        throw error;
      })
      .finally(() => {
        refreshing = undefined;
      });
  }
  return refreshing;
}

export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  if (path === "/auth/login") {
    generation++;
    const result = await send(path, method, body);
    remember(result);
    return result as T;
  }
  if (path === "/auth/logout") {
    // Finish an in-flight rotation before revoking the cookie it produces.
    await refreshing?.catch(() => {});
    const result = await send(path, method, body, accessToken);
    forget();
    return result as T;
  }
  if (path === "/auth/refresh") {
    await refresh();
    return { access_token: accessToken } as T;
  }
  if (!accessToken || Date.now() >= expiresAt - 30_000) await refresh();
  const sentToken = accessToken;
  try {
    return (await send(path, method, body, sentToken)) as T;
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    // Another request may already have replaced the rejected token.
    if (accessToken === sentToken) await refresh();
    return (await send(path, method, body, accessToken)) as T;
  }
}

export interface CheckRun {
  id: string;
  startedAt: string;
  completedAt: string | null;
  status: string;
  durationMs: number | null;
  available: number;
  newProjects: number;
  sent: number;
  error: string | null;
}
export interface EventLog {
  id: string;
  category: string;
  level: string;
  action: string;
  message: string;
  durationMs: number | null;
  createdAt: string;
}
export interface Notification {
  id: string;
  projectKey: string;
  payload: unknown;
  status: string;
  attempts: number;
  createdAt: string;
  sentAt: string | null;
  lastError: string | null;
}
export interface Configuration {
  id: string;
  intervalSeconds: number;
  phone: string;
  gowaUrl: string;
  gowaUsername: string;
  deviceId: string;
  authAlerts: boolean;
  autoBid: boolean;
  hasGowaPassword: boolean;
  updatedAt: string;
}
export interface Summary {
  state: {
    desiredRunning: boolean;
    busy: boolean;
    leaseHealthy: boolean;
    lastCheckAt: string | null;
    lastSuccessAt: string | null;
    nextCheckAt: string | null;
    lastError: string | null;
    authAlerted: boolean;
    gowaConnected: boolean | null;
    gowaCheckedAt: string | null;
  };
  session: {
    hasCookie: boolean;
    authStatus: string;
    importedAt: string | null;
    validatedAt: string | null;
    refreshedAt: string | null;
    lastError: string | null;
  };
  config: Configuration;
  statistics: { checks24h: number; notificationsSent: number };
  latestChecks: CheckRun[];
}
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}
