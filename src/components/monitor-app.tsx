"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  RotateCw as ArrowClockwise,
  CheckCircle,
  Clock,
  Cookie,
  Settings as GearSix,
  ListChecks,
  Moon,
  Pause,
  Play,
  LogOut as SignOut,
  Sun,
  Upload as UploadSimple,
  TriangleAlert as Warning,
  MessageCircle as WhatsappLogo,
  ArrowUpRight,
  ChevronRight,
  ShieldCheck,
  Activity,
  Bell,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CookieDropzone } from "@/components/cookie-dropzone";
import { BilcodeOtpLogin } from "@/components/bilcode-otp-login";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  api,
  ApiError,
  type CheckRun,
  type Configuration,
  type EventLog,
  type Notification,
  type Paginated,
  type Summary,
} from "@/lib/api";

type Page = "overview" | "session" | "logs" | "settings";
type Action = (
  key: string,
  path: string,
  method?: string,
  body?: unknown,
  success?: string,
) => Promise<boolean>;
const navigation = [
  { page: "overview", href: "/", text: "Ringkasan", icon: ListChecks },
  { page: "session", href: "/session", text: "Sesi Bilcode", icon: Cookie },
  { page: "logs", href: "/logs", text: "Log & riwayat", icon: Clock },
  { page: "settings", href: "/settings", text: "Konfigurasi", icon: GearSix },
] as const;

function time(value: string | null | undefined) {
  return value
    ? new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date(value))
    : "Belum tersedia";
}
function statusName(value: string) {
  return (
    (
      {
        SUCCESS: "Berhasil",
        ERROR: "Gagal",
        AUTH_ERROR: "Autentikasi gagal",
        CANCELLED: "Dibatalkan",
        RUNNING: "Memproses",
        STOPPED: "Berhenti",
        ACTIVE: "Aktif",
        SENT: "Terkirim",
        PENDING: "Menunggu",
        FAILED: "Gagal dikirim",
        MISSING: "Belum terhubung",
        UNVERIFIED: "Perlu validasi",
        VALID: "Valid",
        INVALID: "Sesi bermasalah",
        INFO: "Info",
        WARNING: "Peringatan",
      } as Record<string, string>
    )[value] || value
  );
}
function Status({ value }: { value: string }) {
  const kind = ["VALID", "SUCCESS", "SENT", "ACTIVE"].includes(value)
    ? "good"
    : ["INVALID", "ERROR", "AUTH_ERROR", "FAILED"].includes(value)
      ? "bad"
      : ["UNVERIFIED", "WARNING"].includes(value)
        ? "warn"
        : "neutral";
  return (
    <Badge variant="outline" className={`status status-${kind}`}>
      {statusName(value)}
    </Badge>
  );
}
function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fact">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
function Notice({
  children,
  error = false,
}: {
  children: React.ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={`notice ${error ? "notice-error" : ""}`}
      role={error ? "alert" : undefined}
    >
      <Warning size={19} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
function Empty({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty">
      <ListChecks size={28} aria-hidden="true" />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
function Confirm({
  title,
  description,
  label,
  onConfirm,
  children,
}: {
  title: string;
  description: string;
  label: string;
  onConfirm: () => Promise<unknown>;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={sending}
          >
            Batal
          </Button>
          <Button
            disabled={sending}
            onClick={async () => {
              setSending(true);
              try {
                await onConfirm();
                setOpen(false);
              } finally {
                setSending(false);
              }
            }}
          >
            {sending ? "Memproses…" : label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MonitorApp({ page }: { page: Page }) {
  const [user, setUser] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [logKind, setLogKind] = useState("checks");
  const [logPage, setLogPage] = useState(1);
  const [level, setLevel] = useState("");
  const [rows, setRows] = useState<Paginated<
    CheckRun | EventLog | Notification
  > | null>(null);
  const refreshId = useRef(0);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    api<{ username: string }>("/auth/me")
      .then((value) => setUser(value.username))
      .catch((reason) => {
        if (!(reason instanceof ApiError && reason.status === 401))
          setError(
            "Backend belum dapat dihubungi. Periksa service lokal lalu coba masuk kembali.",
          );
      })
      .finally(() => setBooting(false));
  }, []);

  const load = useCallback(async () => {
    const current = ++refreshId.current;
    try {
      const result = await api<Summary>("/monitor/summary");
      if (current !== refreshId.current) return;
      setSummary(result);
      if (page === "logs") {
        const endpoint =
          logKind === "checks"
            ? "/logs/checks"
            : logKind === "notifications"
              ? "/logs/notifications"
              : `/logs/events?category=${logKind === "requests" ? "REQUEST" : "ACTIVITY"}`;
        const separator = endpoint.includes("?") ? "&" : "?";
        const data = await api<Paginated<CheckRun | EventLog | Notification>>(
          `${endpoint}${separator}page=${logPage}&limit=15${level && ["events", "requests"].includes(logKind) ? `&level=${level}` : ""}`,
        );
        if (current !== refreshId.current) return;
        setRows(data);
      }
      setError("");
    } catch (reason) {
      if (current !== refreshId.current) return;
      if (reason instanceof ApiError && reason.status === 401) {
        setUser(null);
        setSummary(null);
      } else
        setError(
          reason instanceof Error ? reason.message : "Pembaruan data gagal.",
        );
    }
  }, [page, logKind, logPage, level]);
  useEffect(() => {
    if (!user) return;
    void load();
    const interval = setInterval(() => void load(), 10000);
    return () => clearInterval(interval);
  }, [user, load]);

  const action: Action = async (key, path, method = "POST", body, success) => {
    setBusy(key);
    try {
      await api(path, method, body);
      if (success) toast.success(success);
      await load();
      return true;
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) setUser(null);
      toast.error(
        reason instanceof Error ? reason.message : "Aksi gagal. Coba kembali.",
      );
      return false;
    } finally {
      setBusy("");
    }
  };

  if (booting)
    return (
      <main className="boot" aria-live="polite">
        <Clock size={28} />
        <p>Memuat panel monitoring…</p>
      </main>
    );
  if (!user) return <Login error={error} onLogin={setUser} />;
  const running = Boolean(summary?.state.desiredRunning);

  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Lewati navigasi
      </a>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="header-context">
            <span>Workspace</span>
            <ChevronRight size={14} aria-hidden="true" />
            <strong>Bilcode Monitoring</strong>
          </div>
          <Link className="mobile-wordmark" href="/">
            Bilcode<span>Monitoring</span>
          </Link>
          <div className="header-tools">
            <span className="environment">Zona waktu · WIB</span>
            <Button
              variant="ghost"
              size="icon"
              aria-label={
                theme === "dark" ? "Gunakan tema terang" : "Gunakan tema gelap"
              }
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                try {
                  await api("/auth/logout", "POST");
                  setUser(null);
                  setSummary(null);
                } catch {
                  toast.error("Gagal keluar. Coba kembali.");
                }
              }}
            >
              <SignOut size={18} />
              Keluar<span className="sr-only"> {user}</span>
            </Button>
          </div>
        </div>
      </header>
      <nav className="main-nav" aria-label="Navigasi utama">
        <Link className="sidebar-brand" href="/">
          Bilcode<span>Project Monitoring</span>
        </Link>
        <p className="nav-label">Workspace</p>
        <div className="nav-links">
          {navigation.map((item) => (
            <Link
              key={item.page}
              href={item.href}
              aria-current={page === item.page ? "page" : undefined}
              className={page === item.page ? "active" : ""}
            >
              <item.icon size={19} aria-hidden="true" />
              <span>{item.text}</span>
              <ChevronRight
                size={15}
                className="nav-chevron"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
        <div className="sidebar-workflow">
          <p>Alur notifikasi</p>
          <span>
            <Cookie size={16} aria-hidden="true" /> Sesi Bilcode
          </span>
          <ChevronRight size={14} aria-hidden="true" />
          <span>
            <ListChecks size={16} aria-hidden="true" /> Pengecekan proyek
          </span>
          <ChevronRight size={14} aria-hidden="true" />
          <span>
            <WhatsappLogo size={16} aria-hidden="true" /> Notifikasi WhatsApp
          </span>
        </div>
        <div className="sidebar-bottom">
          <span className="operator-initial" aria-hidden="true">
            {user.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <strong>{user}</strong>
            <span>Operator monitoring</span>
          </div>
          <ShieldCheck size={18} aria-hidden="true" />
        </div>
      </nav>
      <main id="main" className="content">
        <div className="page-heading">
          <div>
            <p className="section-label">
              {page === "overview"
                ? "Pusat kendali"
                : "Workspace / " +
                  navigation.find((item) => item.page === page)?.text}
            </p>
            <h1>
              {
                {
                  overview: "Semua dalam pantauan.",
                  session: "Sesi Bilcode",
                  logs: "Log & riwayat",
                  settings: "Konfigurasi",
                }[page]
              }
            </h1>
            <p>
              {
                {
                  overview:
                    "Kelola pengecekan proyek dan pengiriman notifikasi dari satu tempat.",
                  session:
                    "Hubungkan akun dan kelola sesi untuk pengecekan proyek.",
                  logs: "Telusuri pengecekan, aktivitas backend, dan hasil pengiriman.",
                  settings:
                    "Atur frekuensi pengecekan dan tujuan notifikasi WhatsApp.",
                }[page]
              }
            </p>
          </div>
          <Button
            variant="outline"
            aria-label="Segarkan data"
            onClick={() => void load()}
            disabled={!!busy}
          >
            <ArrowClockwise size={18} />
            Segarkan
          </Button>
        </div>
        {error && (
          <Notice error>
            {error}{" "}
            <button className="inline-button" onClick={() => void load()}>
              Coba lagi
            </button>
          </Notice>
        )}
        {!summary ? (
          <div className="panel loading-state" aria-live="polite">
            Mengambil status dari backend…
          </div>
        ) : (
          <>
            {page === "overview" && (
              <Overview summary={summary} busy={busy} action={action} />
            )}
            {page === "session" && (
              <SessionPanel
                summary={summary}
                busy={busy}
                action={action}
                onSessionChanged={() => void load()}
              />
            )}
            {page === "settings" && (
              <SettingsPanel
                key={summary.config.updatedAt}
                config={summary.config}
                running={running}
                busy={busy}
                action={action}
              />
            )}
            {page === "logs" && (
              <section className="panel">
                <h2 className="sr-only">Riwayat monitoring dan aktivitas</h2>
                <div className="panel-toolbar">
                  <Tabs
                    value={logKind}
                    onValueChange={(value) => {
                      setLogKind(value);
                      setLogPage(1);
                      setRows(null);
                    }}
                  >
                    <TabsList aria-label="Jenis log">
                      <TabsTrigger value="checks">Pengecekan</TabsTrigger>
                      <TabsTrigger value="events">Aktivitas</TabsTrigger>
                      <TabsTrigger value="notifications">
                        Notifikasi
                      </TabsTrigger>
                      <TabsTrigger value="requests">Request API</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  {["events", "requests"].includes(logKind) && (
                    <div className="filter">
                      <Label htmlFor="log-level">Level</Label>
                      <select
                        id="log-level"
                        value={level}
                        onChange={(event) => {
                          setLevel(event.target.value);
                          setLogPage(1);
                        }}
                      >
                        <option value="">Semua</option>
                        {["INFO", "SUCCESS", "WARNING", "ERROR"].map(
                          (value) => (
                            <option value={value} key={value}>
                              {statusName(value)}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                  )}
                </div>
                {!rows ? (
                  <p className="loading-state" aria-live="polite">
                    Memuat riwayat…
                  </p>
                ) : (
                  <>
                    <LogRows kind={logKind} rows={rows.items} />
                    <div className="pagination">
                      <span>
                        {rows.total} catatan · Halaman {rows.page} dari{" "}
                        {rows.pages}
                      </span>
                      <div>
                        <Button
                          variant="outline"
                          disabled={logPage <= 1}
                          onClick={() => setLogPage((value) => value - 1)}
                        >
                          Sebelumnya
                        </Button>
                        <Button
                          variant="outline"
                          disabled={logPage >= rows.pages}
                          onClick={() => setLogPage((value) => value + 1)}
                        >
                          Berikutnya
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </section>
            )}
          </>
        )}
      </main>
      <footer className="app-footer">
        <span>Bilcode Monitoring</span>
        <span>Waktu dalam WIB · Tampilan diperbarui setiap 10 detik</span>
      </footer>
    </div>
  );
}

function Login({
  error,
  onLogin,
}: {
  error: string;
  onLogin: (username: string) => void;
}) {
  const { theme, setTheme } = useTheme();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <main className="login-shell">
      <div className="login-intro">
        <span className="wordmark">
          Bilcode<span>Project Monitoring</span>
        </span>
        <p className="login-eyebrow">Dari proyek baru ke WhatsApp kamu.</p>
        <h1>
          Tetap terhubung.
          <br />
          Tanpa terus memeriksa.
        </h1>
        <p>
          Satu ruang untuk mengelola sesi Bilcode, memantau proyek, dan mengatur
          notifikasi WhatsApp.
        </p>
        <div className="login-note">
          <Pause size={22} aria-hidden="true" />
          <span>
            Monitoring baru dimulai setelah sesi divalidasi dan kamu menekan
            Mulai.
          </span>
        </div>
        <div className="login-flow">
          <span>
            <Cookie size={20} aria-hidden="true" />
            Hubungkan akun
          </span>
          <ChevronRight size={16} aria-hidden="true" />
          <span>
            <ListChecks size={20} aria-hidden="true" />
            Pantau proyek
          </span>
          <ChevronRight size={16} aria-hidden="true" />
          <span>
            <WhatsappLogo size={20} aria-hidden="true" />
            Terima kabar
          </span>
        </div>
      </div>
      <section className="login-panel">
        <div className="login-panel-top">
          <p className="section-label">Workspace operator</p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={
              theme === "dark" ? "Gunakan tema terang" : "Gunakan tema gelap"
            }
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun /> : <Moon />}
          </Button>
        </div>
        <h2>Masuk ke monitoring</h2>
        <p>Selamat datang kembali. Masuk untuk mengelola monitoring kamu.</p>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setMessage("");
            const form = new FormData(event.currentTarget);
            try {
              const result = await api<{ username: string }>(
                "/auth/login",
                "POST",
                {
                  username: form.get("username"),
                  password: form.get("password"),
                },
              );
              onLogin(result.username);
            } catch (reason) {
              setMessage(
                reason instanceof Error ? reason.message : "Gagal masuk.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="field">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              required
              maxLength={80}
            />
          </div>
          <div className="field">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={256}
            />
          </div>
          {(message || error) && (
            <p role="alert" className="form-error">
              {message || error}
            </p>
          )}
          <Button className="full-width" disabled={busy}>
            {busy ? "Memeriksa akun…" : "Masuk ke panel"}
          </Button>
        </form>
        <p className="login-help">
          Akun panel berbeda dari akun Bilcode. Hubungkan sesi Bilcode setelah
          masuk.
        </p>
      </section>
    </main>
  );
}

function Overview({
  summary,
  busy,
  action,
}: {
  summary: Summary;
  busy: string;
  action: Action;
}) {
  const { state, session, config } = summary;
  const running = state.desiredRunning;
  const title = !state.leaseHealthy
    ? "Pengendali terputus"
    : !running
      ? "Monitoring dihentikan"
      : state.lastError
        ? "Monitoring perlu diperiksa"
        : state.busy
          ? "Sedang memeriksa proyek"
          : "Monitoring berjalan";
  return (
    <>
      <div className="metric-grid" aria-label="Ringkasan aktivitas">
        <div className="metric">
          <div className="metric-label">
            <Activity size={18} aria-hidden="true" />
            Pengecekan
          </div>
          <strong>
            {summary.statistics.checks24h}
            <span>kali</span>
          </strong>
          <p>Dalam 24 jam terakhir</p>
        </div>
        <div className="metric">
          <div className="metric-label">
            <Bell size={18} aria-hidden="true" />
            Proyek dinotifikasikan
          </div>
          <strong>
            {summary.statistics.notificationsSent}
            <span>proyek</span>
          </strong>
          <p>Total pengiriman berhasil</p>
        </div>
        <div className="metric">
          <div className="metric-label">
            <Timer size={18} aria-hidden="true" />
            Interval pengecekan
          </div>
          <strong>
            {config.intervalSeconds / 60}
            <span>menit</span>
          </strong>
          <Link href="/settings">
            Atur frekuensi <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
      <div className="overview-grid">
        <section className={`control-panel ${running ? "is-running" : ""}`}>
          <div className="control-heading">
            <div className="control-icon">
              {running ? (
                <Play size={27} fill="currentColor" />
              ) : (
                <Pause size={27} fill="currentColor" />
              )}
            </div>
            <span className="control-label">Status monitoring</span>
            <Status
              value={
                !running
                  ? "STOPPED"
                  : state.lastError
                    ? "ERROR"
                    : state.busy
                      ? "RUNNING"
                      : "ACTIVE"
              }
            />
          </div>
          <h2>{title}</h2>
          <p>
            {!running
              ? "Tidak ada pengecekan atau refresh token otomatis. Kamu dapat menggunakan akun Bilcode di browser."
              : `API diperiksa setiap ${config.intervalSeconds / 60} menit. Proyek baru akan dikirim sebagai teks JSON ke WhatsApp.`}
          </p>
          <div className="control-actions">
            {running ? (
              <Button
                onClick={() =>
                  void action(
                    "stop",
                    "/monitor/stop",
                    "POST",
                    undefined,
                    "Monitoring dihentikan. Request Bilcode sudah berhenti.",
                  )
                }
                disabled={busy === "stop"}
              >
                <Pause />
                {busy === "stop" ? "Menghentikan…" : "Hentikan monitoring"}
              </Button>
            ) : (
              <Button
                onClick={() =>
                  void action(
                    "start",
                    "/monitor/start",
                    "POST",
                    undefined,
                    "Monitoring diaktifkan.",
                  )
                }
                disabled={
                  !!busy ||
                  session.authStatus !== "VALID" ||
                  !config.hasGowaPassword ||
                  !state.leaseHealthy
                }
              >
                <Play />
                {busy === "start" ? "Memulai…" : "Mulai monitoring"}
              </Button>
            )}
            <Button
              variant="outline"
              disabled={running || !!busy || session.authStatus !== "VALID"}
              onClick={() =>
                void action(
                  "check",
                  "/monitor/check",
                  "POST",
                  undefined,
                  "Pengecekan manual selesai. Periksa hasil pada riwayat.",
                )
              }
            >
              <ArrowClockwise />
              {busy === "check" ? "Memeriksa…" : "Cek & kirim sekarang"}
            </Button>
          </div>
          {session.authStatus !== "VALID" && (
            <p className="control-hint">
              Sesi belum siap.{" "}
              <Link href="/session">Hubungkan dan validasi sesi</Link> untuk
              melanjutkan.
            </p>
          )}
          {state.lastError && (
            <p role="alert" className="form-error">
              {state.lastError}
            </p>
          )}
          <dl className="control-times">
            <Fact label="Pengecekan terakhir">{time(state.lastCheckAt)}</Fact>
            <Fact label="Jadwal berikutnya">
              {running ? time(state.nextCheckAt) : "Monitoring berhenti"}
            </Fact>
          </dl>
        </section>
        <aside className="connection-panel panel">
          <div className="panel-title">
            <h2>Koneksi layanan</h2>
            <span className="subtle">Bilcode & WhatsApp</span>
          </div>
          <div className="connection-item">
            <div>
              <Cookie size={22} />
              <h3>Sesi Bilcode</h3>
            </div>
            <Status value={session.authStatus} />
            <p>
              {session.refreshedAt
                ? `Token diperbarui ${time(session.refreshedAt)}`
                : "Belum ada refresh token yang berhasil."}
            </p>
            <Link href="/session">Kelola sesi</Link>
          </div>
          <div className="connection-item">
            <div>
              <WhatsappLogo size={23} />
              <h3>WhatsApp</h3>
            </div>
            <Status
              value={
                state.gowaConnected === true
                  ? "VALID"
                  : state.gowaConnected === false
                    ? "INVALID"
                    : "UNVERIFIED"
              }
            />
            <p>
              Device <code>{config.deviceId}</code> · +{config.phone}
            </p>
            <Button
              variant="outline"
              disabled={!!busy || !config.hasGowaPassword}
              onClick={() =>
                void action(
                  "connection",
                  "/settings/gowa/check",
                  "POST",
                  undefined,
                  "Pemeriksaan koneksi GOWA selesai.",
                )
              }
            >
              {busy === "connection" ? "Memeriksa…" : "Uji koneksi GOWA"}
            </Button>
          </div>
        </aside>
      </div>
      <div className="summary-strip">
        <ShieldCheck size={16} aria-hidden="true" />
        <span>
          Peringatan autentikasi{" "}
          <strong>{config.authAlerts ? "aktif" : "nonaktif"}</strong>.{" "}
          {config.authAlerts
            ? "Kendala sesi akan diberitahukan melalui WhatsApp."
            : "Aktifkan dari Konfigurasi untuk menerima peringatan sesi."}
        </span>
      </div>
      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Pengecekan terbaru</h2>
            <p>
              Hasil request Bilcode dan pengiriman proyek pada setiap siklus.
            </p>
          </div>
          <Link href="/logs">Lihat seluruh log</Link>
        </div>
        <CheckTable rows={summary.latestChecks} />
      </section>
    </>
  );
}

function SessionPanel({
  summary,
  busy,
  action,
  onSessionChanged,
}: {
  summary: Summary;
  busy: string;
  action: Action;
  onSessionChanged: () => void;
}) {
  const [text, setText] = useState("");
  const [uploadRevision, setUploadRevision] = useState(0);
  const running = summary.state.desiredRunning;
  return (
    <div className="two-column">
      <section className="panel form-panel">
        <div className="panel-title">
          <div>
            <h2>Akun & sesi Bilcode</h2>
            <p>
              Login lewat OTP email atau impor sesi dari export cookie Bilcode.
            </p>
          </div>
          <Status value={summary.session.authStatus} />
        </div>
        {running && (
          <Notice>
            Monitoring sedang aktif. <Link href="/">Hentikan monitoring</Link>{" "}
            sebelum mengganti atau memvalidasi sesi.
          </Notice>
        )}
        <ol className="session-steps" aria-label="Tahapan menghubungkan akun">
          <li data-complete={summary.session.hasCookie}>
            <span>01</span>Hubungkan akun
          </li>
          <li data-complete={summary.session.authStatus === "VALID"}>
            <span>02</span>Validasi sesi
          </li>
          <li data-complete={running}>
            <span>03</span>Mulai monitoring
          </li>
        </ol>
        <BilcodeOtpLogin
          disabled={running || !!busy}
          onConnected={() => {
            setText("");
            setUploadRevision((revision) => revision + 1);
            onSessionChanged();
          }}
        />
        <details className="cookie-import">
          <summary>
            <UploadSimple size={18} aria-hidden="true" />
            <span>
              Gunakan file cookie
              <span>Alternatif jika kamu sudah memiliki export sesi.</span>
            </span>
            <ChevronRight size={18} aria-hidden="true" />
          </summary>
          <div className="cookie-import-body">
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                const ok = await action(
                  "cookie",
                  "/session/cookie",
                  "PUT",
                  { cookieJson: text },
                  "Cookie tersimpan. Lanjutkan dengan validasi sesi.",
                );
                if (ok) {
                  setText("");
                  setUploadRevision((revision) => revision + 1);
                }
              }}
            >
              <div className="field">
                <Label htmlFor="cookie-file">File export cookie</Label>
                <CookieDropzone
                  key={uploadRevision}
                  disabled={running || !!busy}
                  onLoad={setText}
                />
                <p id="cookie-file-help" className="field-help">
                  Format JSON, maksimal 100 KB. Isi cookie tidak ditampilkan
                  kembali setelah disimpan.
                </p>
              </div>
              <div className="field">
                <Label htmlFor="cookie-json">Isi JSON cookie</Label>
                <Textarea
                  id="cookie-json"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  disabled={running || !!busy}
                  maxLength={100000}
                  rows={10}
                  spellCheck={false}
                  placeholder={
                    '[\n  { "name": "bilcode_refresh_token", "value": "...", "domain": ".bilcode.id" }\n]'
                  }
                  className="json-input"
                />
              </div>
              <div className="form-actions">
                <Button disabled={running || !!busy || !text.trim()}>
                  <UploadSimple />
                  {busy === "cookie" ? "Menyimpan…" : "Simpan cookie"}
                </Button>
              </div>
            </form>
          </div>
        </details>
        <div className="validation-section">
          <div>
            <h3>Pastikan sesi siap digunakan</h3>
            <p>
              Validasi memeriksa akses akun tanpa mengirim notifikasi proyek.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={running || !!busy || !summary.session.hasCookie}
            onClick={() =>
              void action(
                "validate",
                "/session/validate",
                "POST",
                undefined,
                "Sesi valid dan dapat mengakses API proyek.",
              )
            }
          >
            <ShieldCheck size={17} aria-hidden="true" />
            {busy === "validate" ? "Memvalidasi…" : "Validasi sesi"}
          </Button>
        </div>
        <dl className="details-list">
          <Fact label="Sesi disimpan">{time(summary.session.importedAt)}</Fact>
          <Fact label="Validasi terakhir">
            {time(summary.session.validatedAt)}
          </Fact>
          <Fact label="Refresh terakhir">
            {time(summary.session.refreshedAt)}
          </Fact>
        </dl>
        {summary.session.lastError && (
          <Notice error>{summary.session.lastError}</Notice>
        )}
        <div className="danger-zone">
          <div>
            <h3>Hapus sesi tersimpan</h3>
            <p>Riwayat pengecekan dan notifikasi tetap disimpan.</p>
          </div>
          <Confirm
            title="Hapus credential Bilcode?"
            description="Monitoring harus berhenti. Untuk memulai kembali, kamu perlu mengunggah cookie dari sesi login yang baru."
            label="Hapus sesi"
            onConfirm={() =>
              action(
                "remove-cookie",
                "/session/cookie",
                "DELETE",
                undefined,
                "Credential Bilcode dihapus.",
              )
            }
          >
            <Button
              variant="outline"
              disabled={running || !!busy || !summary.session.hasCookie}
            >
              Hapus sesi
            </Button>
          </Confirm>
        </div>
      </section>
      <aside className="instructions">
        <h2>Login dari mobile atau desktop</h2>
        <ol>
          <li>Hentikan monitoring dan tunggu status berhenti.</li>
          <li>Masukkan email akun Bilcode, lalu minta kode OTP.</li>
          <li>Buka email dan masukkan kode terbaru pada panel ini.</li>
          <li>Verifikasi dan simpan sesi, lalu jalankan validasi.</li>
          <li>Mulai monitoring melalui halaman Ringkasan.</li>
        </ol>
        <Notice>
          Login Bilcode di perangkat lain dapat mencabut sesi service. Jangan
          menggunakan salinan sesi yang sama secara bersamaan.
        </Notice>
        <p className="subtle">
          Validasi melakukan request refresh dan pembacaan API. Validasi tidak
          mengirim notifikasi proyek.
        </p>
      </aside>
    </div>
  );
}

function SettingsPanel({
  config,
  running,
  busy,
  action,
}: {
  config: Configuration;
  running: boolean;
  busy: string;
  action: Action;
}) {
  const [alerts, setAlerts] = useState(config.authAlerts);
  return (
    <div className="two-column">
      <section className="panel form-panel">
        <div className="panel-title">
          <div>
            <h2>Pengaturan monitoring</h2>
            <p>
              Perubahan diterapkan pada pengecekan berikutnya setelah monitoring
              dimulai.
            </p>
          </div>
        </div>
        {running && (
          <Notice>Hentikan monitoring sebelum mengubah konfigurasi.</Notice>
        )}
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            await action(
              "settings",
              "/settings",
              "PUT",
              {
                intervalSeconds: Number(form.get("minutes")) * 60,
                phone: String(form.get("phone")).replace(/^\+/, ""),
                gowaUrl: form.get("gowaUrl"),
                gowaUsername: form.get("gowaUsername"),
                gowaPassword: form.get("gowaPassword") || undefined,
                deviceId: form.get("deviceId"),
                authAlerts: alerts,
              },
              "Konfigurasi berhasil disimpan.",
            );
          }}
        >
          <fieldset disabled={running || !!busy}>
            <legend className="sr-only">Konfigurasi monitoring dan GOWA</legend>
            <div className="form-grid">
              <div className="field">
                <Label htmlFor="minutes">Interval pengecekan (menit)</Label>
                <Input
                  id="minutes"
                  name="minutes"
                  type="number"
                  min={1}
                  max={60}
                  step={1}
                  required
                  defaultValue={config.intervalSeconds / 60}
                />
                <p className="field-help">Antara 1 dan 60 menit.</p>
              </div>
              <div className="field">
                <Label htmlFor="phone">Nomor WhatsApp tujuan</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  defaultValue={config.phone}
                  pattern="\+?[1-9][0-9]{7,14}"
                />
                <p className="field-help">
                  Gunakan kode negara, misalnya 62813…
                </p>
              </div>
            </div>
            <div className="form-divider">
              <h3>Koneksi GOWA</h3>
              <p>Credential ini digunakan backend untuk mengirim notifikasi.</p>
            </div>
            <div className="field">
              <Label htmlFor="gowaUrl">URL GOWA</Label>
              <Input
                id="gowaUrl"
                name="gowaUrl"
                type="url"
                required
                defaultValue={config.gowaUrl}
              />
              <p className="field-help">
                Gunakan origin GOWA yang diizinkan, tanpa path endpoint.
              </p>
            </div>
            <div className="form-grid">
              <div className="field">
                <Label htmlFor="gowaUsername">Username GOWA</Label>
                <Input
                  id="gowaUsername"
                  name="gowaUsername"
                  required
                  defaultValue={config.gowaUsername}
                  autoComplete="off"
                />
              </div>
              <div className="field">
                <Label htmlFor="deviceId">Device ID</Label>
                <Input
                  id="deviceId"
                  name="deviceId"
                  required
                  defaultValue={config.deviceId}
                />
              </div>
            </div>
            <div className="field">
              <Label htmlFor="gowaPassword">Password GOWA</Label>
              <Input
                id="gowaPassword"
                name="gowaPassword"
                type="password"
                autoComplete="new-password"
                placeholder={
                  config.hasGowaPassword
                    ? "Sudah tersimpan. Kosongkan untuk mempertahankan."
                    : "Masukkan password GOWA"
                }
              />
              <p className="field-help">
                Password tersimpan tidak pernah dikirim kembali ke browser.
              </p>
            </div>
            <div className="switch-field">
              <div>
                <Label htmlFor="auth-alerts">Peringatan autentikasi</Label>
                <p>
                  Kirim satu peringatan saat autentikasi gagal dan satu pesan
                  saat pulih.
                </p>
              </div>
              <Switch
                id="auth-alerts"
                checked={alerts}
                onCheckedChange={setAlerts}
              />
            </div>
            <Button type="submit">
              <GearSix />
              {busy === "settings" ? "Menyimpan…" : "Simpan konfigurasi"}
            </Button>
          </fieldset>
        </form>
      </section>
      <aside className="instructions">
        <h2>Uji pengiriman</h2>
        <p>
          Uji memakai konfigurasi yang sudah disimpan. Pesan dikirim sebagai
          teks JSON ke nomor tujuan.
        </p>
        <Button
          variant="outline"
          disabled={!!busy || !config.hasGowaPassword}
          onClick={() =>
            void action(
              "connection",
              "/settings/gowa/check",
              "POST",
              undefined,
              "Pemeriksaan koneksi GOWA selesai.",
            )
          }
        >
          <WhatsappLogo />
          {busy === "connection" ? "Memeriksa…" : "Uji koneksi GOWA"}
        </Button>
        <Confirm
          title="Kirim pesan percobaan?"
          description={`Satu pesan JSON dummy akan dikirim melalui device ${config.deviceId} ke WhatsApp +${config.phone}.`}
          label="Kirim pesan percobaan"
          onConfirm={() =>
            action(
              "test-message",
              "/settings/gowa/test-message",
              "POST",
              undefined,
              "GOWA mengonfirmasi pengiriman pesan percobaan.",
            )
          }
        >
          <Button disabled={!!busy || !config.hasGowaPassword}>
            Kirim JSON percobaan
          </Button>
        </Confirm>
        <Notice>
          Konfirmasi GOWA menunjukkan pesan diproses gateway. Itu bukan bukti
          bahwa pesan sudah dibaca.
        </Notice>
        <div className="endpoint-note">
          <h3>Sumber proyek</h3>
          <code>api.bilcode.id/api/worker/projects/available</code>
          <p>
            Seluruh halaman diperiksa. ID proyek yang sudah dinotifikasikan
            tidak dikirim ulang.
          </p>
        </div>
      </aside>
    </div>
  );
}

function CheckTable({ rows }: { rows: CheckRun[] }) {
  if (!rows.length)
    return (
      <Empty
        title="Belum ada pengecekan"
        description="Hubungkan dan validasi sesi Bilcode, lalu mulai monitoring. Setiap hasil pengecekan akan tercatat di sini."
      />
    );
  return (
    <div
      className="table-scroll"
      role="region"
      aria-label="Riwayat pengecekan"
      tabIndex={0}
    >
      <table>
        <thead>
          <tr>
            <th>Waktu mulai (WIB)</th>
            <th>Status</th>
            <th>Tersedia</th>
            <th>Baru</th>
            <th>Dikirim</th>
            <th>Durasi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td data-label="Waktu mulai (WIB)">
                {time(row.startedAt)}
                {row.error && <p className="row-error">{row.error}</p>}
              </td>
              <td data-label="Status">
                <Status value={row.status} />
              </td>
              <td data-label="Tersedia">{row.available}</td>
              <td data-label="Proyek baru">{row.newProjects}</td>
              <td data-label="Dikirim">{row.sent}</td>
              <td data-label="Durasi">
                {row.durationMs === null
                  ? "Memproses"
                  : `${(row.durationMs / 1000).toFixed(1)} dtk`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function LogRows({
  kind,
  rows,
}: {
  kind: string;
  rows: (CheckRun | EventLog | Notification)[];
}) {
  if (kind === "checks") return <CheckTable rows={rows as CheckRun[]} />;
  if (!rows.length)
    return (
      <Empty
        title="Belum ada catatan untuk tampilan ini"
        description="Aktivitas dan pengiriman akan dicatat saat kamu menggunakan panel. Coba filter lain bila diperlukan."
      />
    );
  if (kind === "notifications")
    return (
      <div
        className="table-scroll"
        role="region"
        aria-label="Riwayat notifikasi"
        tabIndex={0}
      >
        <table>
          <thead>
            <tr>
              <th>Proyek</th>
              <th>Status</th>
              <th>Percobaan</th>
              <th>Waktu</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {(rows as Notification[]).map((row) => (
              <tr key={row.id}>
                <td className="project-key" data-label="Proyek">
                  {row.projectKey}
                  {row.lastError && (
                    <p className="row-error">{row.lastError}</p>
                  )}
                </td>
                <td data-label="Status">
                  <Status value={row.status} />
                </td>
                <td data-label="Percobaan">{row.attempts}</td>
                <td data-label="Waktu (WIB)">
                  {time(row.sentAt || row.createdAt)}
                </td>
                <td data-label="Detail">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline">Lihat JSON</Button>
                    </DialogTrigger>
                    <DialogContent className="json-dialog">
                      <DialogHeader>
                        <DialogTitle>Payload proyek</DialogTitle>
                        <DialogDescription>
                          {row.projectKey} · {statusName(row.status)}
                        </DialogDescription>
                      </DialogHeader>
                      <pre>{JSON.stringify(row.payload, null, 2)}</pre>
                    </DialogContent>
                  </Dialog>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  return (
    <div
      className="table-scroll"
      role="region"
      aria-label="Log aktivitas backend"
      tabIndex={0}
    >
      <table>
        <thead>
          <tr>
            <th>Waktu (WIB)</th>
            <th>Level</th>
            <th>Aktivitas</th>
            <th>Keterangan</th>
          </tr>
        </thead>
        <tbody>
          {(rows as EventLog[]).map((row) => (
            <tr key={row.id}>
              <td data-label="Waktu (WIB)">{time(row.createdAt)}</td>
              <td data-label="Level">
                <Status value={row.level} />
              </td>
              <td data-label="Aktivitas">
                <code>{row.action}</code>
              </td>
              <td data-label="Keterangan">
                {row.message}
                {row.durationMs !== null && (
                  <span className="subtle"> · {row.durationMs} ms</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
