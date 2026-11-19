export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: "include",
    cache: "no-store",
    ...(body !== undefined
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = Array.isArray(data.message)
      ? data.message.join(" ")
      : data.message;
    throw new ApiError(
      message || "Request gagal. Periksa koneksi backend.",
      response.status,
    );
  }
  return data as T;
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
