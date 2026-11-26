"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Clock,
  Send,
  RefreshCw,
  TriangleAlert,
  Users,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { BidResults, type BidResult } from "@/components/bid-results";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Project = {
  projectId: number;
  title: string;
  available: boolean;
  hasApplied: boolean;
  version: string;
  applicationState: string | null;
  draft?: {
    state: string;
    version: string;
    isDevelopment: boolean;
    reason: string | null;
    lastError: string | null;
    autoAttempted: boolean;
    proposalPayload: unknown;
  } | null;
  payload: {
    description?: string;
    deadline?: string;
    service_type?: string;
    bids_count?: number | null;
  };
  observedAt: string;
};
type Application = {
  id: string;
  projectId: number;
  title: string;
  state: string;
  source?: string;
  status: string | null;
  upstreamId: number | null;
  lastError: string | null;
  proposalPayload: unknown;
  updatedAt: string;
  confirmedAt?: string | null;
  submittedAt?: string;
  attempts?: BidResult[];
  _count?: { attempts: number };
  events: {
    id: string;
    previousStatus: string | null;
    nextStatus: string;
    sentAt: string | null;
  }[];
};
type Dashboard = {
  projects: Project[];
  applications: Application[];
  aiConfigured: boolean;
  autoBid?: boolean;
  model: string;
  proposedAmount: number;
  page: number;
  pages: number;
  projectTotal: number;
  applicationTotal: number;
  projectPages: number;
  applicationPages: number;
  counts: {
    projects: { all: number; available: number; archive: number };
    applications: Record<string, number>;
  };
  sync: { lastSyncedAt: string | null; lastError: string | null } | null;
};
const localState: Record<string, string> = {
  GENERATING: "AI menyusun proposal",
  SUBMITTING: "Mengirim penawaran",
  UNKNOWN: "Menunggu kepastian",
  CONFIRMED: "Tercatat di Bilcode",
  FAILED: "Belum terkirim",
};
const time = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Belum diperiksa";

export function BidsPanel({
  monitoringRunning,
  onUnauthorized,
}: {
  monitoringRunning: boolean;
  onUnauthorized: () => void;
}) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [view, setView] = useState("projects");
  const [projectPage, setProjectPage] = useState(1);
  const [applicationPage, setApplicationPage] = useState(1);
  const [projectFilter, setProjectFilter] = useState("available");
  const [applicationFilter, setApplicationFilter] = useState("all");
  const [selected, setSelected] = useState<Project | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [highlight, setHighlight] = useState<number | null>(null);
  const query = `/bids?projectPage=${projectPage}&applicationPage=${applicationPage}&projectFilter=${projectFilter}&applicationFilter=${applicationFilter}&limit=10${highlight ? `&focusProject=${highlight}` : ""}`;
  const page = view === "projects" ? projectPage : applicationPage;
  const pages =
    view === "projects" ? data?.projectPages : data?.applicationPages;
  const setPage = (update: (page: number) => number) =>
    view === "projects" ? setProjectPage(update) : setApplicationPage(update);
  useEffect(() => {
    if (data && projectPage > data.projectPages)
      setProjectPage(data.projectPages);
    if (data && applicationPage > data.applicationPages)
      setApplicationPage(data.applicationPages);
  }, [data, projectPage, applicationPage]);
  const load = useCallback(async () => {
    try {
      const next = await api<Dashboard>(query);
      if (!next.counts)
        throw new Error(
          "Filter penawaran memerlukan backend terbaru. Selesaikan deployment backend, lalu segarkan halaman.",
        );
      setData(next);
      setError("");
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) onUnauthorized();
      else
        setError(
          reason instanceof Error
            ? reason.message
            : "Data penawaran belum tersedia.",
        );
    }
  }, [query, onUnauthorized]);
  useEffect(() => {
    let active = true;
    setData(null);
    const run = async () => {
      try {
        const next = await api<Dashboard>(query);
        if (!next.counts)
          throw new Error(
            "Filter penawaran memerlukan backend terbaru. Selesaikan deployment backend, lalu segarkan halaman.",
          );
        if (active) {
          setData(next);
          setError("");
        }
      } catch (reason) {
        if (!active) return;
        if (reason instanceof ApiError && reason.status === 401)
          onUnauthorized();
        else
          setError(
            reason instanceof Error
              ? reason.message
              : "Data penawaran belum tersedia.",
          );
      }
    };
    void run();
    const interval = setInterval(() => void run(), 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [query, onUnauthorized]);
  useEffect(() => {
    const id = Number(
      new URLSearchParams(window.location.search).get("project"),
    );
    if (id > 0) {
      setHighlight(id);
      setProjectFilter("all");
    }
  }, []);
  async function refresh() {
    setWorking(true);
    setError("");
    try {
      await api("/bids/refresh", "POST");
      await load();
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) onUnauthorized();
      else
        setError(
          reason instanceof Error ? reason.message : "Sinkronisasi gagal.",
        );
    } finally {
      setWorking(false);
    }
  }
  async function submit() {
    if (!selected || working) return;
    setWorking(true);
    setError("");
    try {
      const result = await api<Application>(
        `/bids/projects/${selected.projectId}/submit`,
        "POST",
        { confirmed: true, version: selected.version },
      );
      if (result.state === "CONFIRMED")
        toast.success("Penawaran tercatat di Bilcode.");
      else if (result.state === "UNKNOWN")
        toast.warning(
          "Hasil belum pasti. Sistem akan memeriksa riwayat bid tanpa mengirim ulang.",
        );
      else
        toast.error(
          result.lastError ||
            "Proposal belum dikirim. Periksa riwayat pengajuan.",
        );
      setSelected(null);
      await load();
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) onUnauthorized();
      await load();
      const message =
        reason instanceof Error
          ? reason.message
          : "Pengajuan belum selesai. Segarkan status sebelum mencoba lagi.";
      setError(message);
      toast.error(message);
    } finally {
      setWorking(false);
    }
  }
  return (
    <div className="bids-workspace">
      <div className="panel bids-toolbar">
        <div>
          <h2>Analisis proyek & pengajuan</h2>
          <p>
            {data?.autoBid
              ? "Bid otomatis aktif untuk pengembangan sistem. Proyek lain menunggu persetujuanmu."
              : "Bid otomatis nonaktif. AI tetap menyiapkan draft saat monitoring berjalan; pengiriman menunggu persetujuanmu."}{" "}
            Ubah pengaturan melalui menu Konfigurasi.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void refresh()}
          disabled={working}
        >
          <RefreshCw size={16} aria-hidden="true" />
          {working ? "Memproses…" : "Sinkronkan Bilcode"}
        </Button>
        <p className="field-help">
          Status terakhir: {time(data?.sync?.lastSyncedAt)}.{" "}
          {monitoringRunning
            ? "Pengecekan bid mengikuti jadwal monitoring."
            : "Monitoring berhenti; pengecekan berkala bid juga berhenti. Sinkronisasi manual tetap tersedia."}
        </p>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {data?.sync?.lastError && (
        <p className="notice">
          <TriangleAlert size={18} aria-hidden="true" />
          {data.sync.lastError}
        </p>
      )}
      <Tabs value={view} onValueChange={setView}>
        <TabsList className="bid-view-tabs" aria-label="Tampilan penawaran">
          <TabsTrigger value="projects">
            Proyek
            {data ? ` (${data.counts.projects.available} tersedia)` : ""}
          </TabsTrigger>
          <TabsTrigger value="applications">
            Penawaran saya{data ? ` (${data.counts.applications.all})` : ""}
          </TabsTrigger>
        </TabsList>
        {!data ? (
          <p className="loading-state">
            {error
              ? "Data penawaran belum dapat ditampilkan."
              : "Memuat proyek dan penawaran…"}
          </p>
        ) : (
          <>
            {!data.aiConfigured && (
              <p className="notice">
                <TriangleAlert size={18} aria-hidden="true" />
                AI belum diaktifkan. Atur VIKEY_API_KEY pada environment backend
                sebelum mengajukan.
              </p>
            )}
            <TabsContent value="projects">
              <section aria-labelledby="bid-projects-title">
                {highlight && (
                  <p className="notice">
                    Menampilkan proyek #{highlight} dari tautan notifikasi.{" "}
                    <button
                      className="inline-button"
                      onClick={() => {
                        setHighlight(null);
                        setProjectFilter("available");
                        setProjectPage(1);
                      }}
                    >
                      Kembali ke proyek yang bisa diajukan
                    </button>
                  </p>
                )}
                <div className="bid-filter-bar">
                  <label htmlFor="project-filter">Tampilkan proyek</label>
                  <select
                    id="project-filter"
                    value={projectFilter}
                    disabled={working}
                    onChange={(e) => {
                      setProjectFilter(e.target.value);
                      setProjectPage(1);
                      setHighlight(null);
                    }}
                  >
                    <option value="available">
                      Bisa diajukan ({data.counts.projects.available})
                    </option>
                    <option value="archive">
                      Arsip ({data.counts.projects.archive})
                    </option>
                    <option value="all">
                      Semua ({data.counts.projects.all})
                    </option>
                  </select>
                  <p className="field-help">
                    {projectFilter === "available"
                      ? "Hanya proyek tersedia yang belum diajukan atau masih dapat dicoba ulang. Kelayakan akun tetap diperiksa Bilcode."
                      : projectFilter === "archive"
                        ? "Arsip mencakup proyek tidak tersedia, sudah diajukan, atau masih diproses. Data tidak dihapus."
                        : "Daftar lengkap proyek yang tersimpan. Hanya proyek yang memenuhi syarat ketersediaan dapat diajukan."}
                  </p>
                </div>
                <div className="bid-section-heading">
                  <h2 id="bid-projects-title">
                    {projectFilter === "available"
                      ? "Proyek yang bisa diajukan"
                      : projectFilter === "archive"
                        ? "Arsip proyek"
                        : "Semua proyek"}
                  </h2>
                  <span>{data.projectTotal} proyek</span>
                </div>
                {!data.projects.length ? (
                  <div className="panel empty">
                    <Send size={26} aria-hidden="true" />
                    <h3>
                      {projectFilter === "available"
                        ? "Belum ada proyek yang bisa diajukan"
                        : "Tidak ada proyek pada filter ini"}
                    </h3>
                    <p>
                      Proyek lama tetap tersedia melalui filter Arsip atau
                      Semua. Jalankan monitoring atau sinkronkan Bilcode untuk
                      memperbarui ketersediaan.
                    </p>
                  </div>
                ) : (
                  <div className="bid-project-grid">
                    {data.projects.map((project) => {
                      const canSubmit =
                        project.available &&
                        !project.hasApplied &&
                        (!project.applicationState ||
                          project.applicationState === "FAILED") &&
                        data.aiConfigured;
                      return (
                        <article
                          className="panel bid-project"
                          key={project.projectId}
                          data-highlighted={highlight === project.projectId}
                        >
                          <div className="bid-project-meta">
                            <span>
                              #{project.projectId} ·{" "}
                              {project.payload.service_type || "Proyek Bilcode"}
                            </span>
                            <span className="status status-neutral">
                              {project.applicationState === "UNKNOWN"
                                ? "Belum pasti"
                                : ["GENERATING", "SUBMITTING"].includes(
                                      project.applicationState || "",
                                    )
                                  ? "Sedang diproses"
                                  : project.applicationState === "CONFIRMED"
                                    ? "Sudah diajukan"
                                    : project.applicationState === "FAILED" &&
                                        project.available
                                      ? "Bisa dicoba ulang"
                                      : project.hasApplied
                                        ? "Sudah dilamar"
                                        : project.available
                                          ? "Tersedia"
                                          : "Tidak tersedia"}
                            </span>
                          </div>
                          <h3>{project.title}</h3>
                          <p className="field-help">
                            <Clock size={14} aria-hidden="true" /> Deadline:{" "}
                            {project.payload.deadline || "Belum jelas"}
                          </p>
                          <p className="field-help">
                            <Users size={14} aria-hidden="true" />
                            {typeof project.payload.bids_count === "number" &&
                            Number.isSafeInteger(project.payload.bids_count) &&
                            project.payload.bids_count >= 0
                              ? `${new Intl.NumberFormat("id-ID").format(project.payload.bids_count)} pelamar`
                              : "Jumlah pelamar belum tersedia"}
                          </p>
                          <details open={highlight === project.projectId}>
                            <summary>Detail kebutuhan</summary>
                            <p className="bid-description">
                              {project.payload.description ||
                                "Deskripsi belum tersedia."}
                            </p>
                          </details>
                          {project.draft && (
                            <div>
                              <p className="field-help">
                                {project.draft.version !== project.version
                                  ? "Lingkup berubah; draft perlu diperbarui."
                                  : project.draft.state === "READY"
                                    ? project.draft.isDevelopment
                                      ? "Pengembangan sistem · draft siap"
                                      : "Persetujuan manual · draft siap"
                                    : project.draft.state === "PREPARING"
                                      ? "AI sedang menilai & menyusun draft…"
                                      : "Draft gagal · klasifikasi belum dapat digunakan"}
                              </p>
                              <p className="field-help">
                                {project.draft.reason ||
                                  project.draft.lastError}
                              </p>
                              {project.draft.reason &&
                                project.draft.lastError && (
                                  <p className="field-help">
                                    {project.draft.lastError}
                                  </p>
                                )}
                              {project.draft.autoAttempted &&
                                !project.applicationState && (
                                  <p className="field-help">
                                    Proses otomatis sudah dicoba. Periksa
                                    ketersediaan dan konfirmasi manual bila
                                    ingin melanjutkan.
                                  </p>
                                )}
                              {project.draft.proposalPayload != null && (
                                <details>
                                  <summary>Draft proposal tersimpan</summary>
                                  <pre className="bid-payload">
                                    {JSON.stringify(
                                      project.draft.proposalPayload,
                                      null,
                                      2,
                                    )}
                                  </pre>
                                </details>
                              )}
                            </div>
                          )}
                          <p className="field-help">
                            Terlihat pada {time(project.observedAt)}
                          </p>
                          <Button
                            disabled={working || !canSubmit}
                            onClick={() => setSelected(project)}
                          >
                            <Send size={16} aria-hidden="true" />
                            {project.applicationState &&
                            project.applicationState !== "FAILED"
                              ? localState[project.applicationState] ||
                                project.applicationState
                              : project.applicationState === "FAILED"
                                ? "Konfirmasi & coba lagi"
                                : project.draft?.state === "READY" &&
                                    project.draft.version === project.version
                                  ? "Konfirmasi & kirim draft"
                                  : "Konfirmasi & ajukan"}
                          </Button>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            </TabsContent>
            <TabsContent value="applications">
              <section aria-labelledby="my-bids-title">
                <div className="bid-filter-bar">
                  <label htmlFor="application-filter">Status penawaran</label>
                  <select
                    id="application-filter"
                    value={applicationFilter}
                    disabled={working}
                    onChange={(e) => {
                      setApplicationFilter(e.target.value);
                      setApplicationPage(1);
                    }}
                  >
                    {Object.entries({
                      all: "Semua",
                      selected: "Dipilih",
                      rejected: "Ditolak Bilcode",
                      applied: "Menunggu keputusan",
                      confirmed: "Tercatat di Bilcode",
                      failed: "Gagal dikirim",
                      unknown: "Belum pasti",
                      processing: "Sedang diproses",
                    }).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label} ({data.counts.applications[value] || 0})
                      </option>
                    ))}
                  </select>
                  <p className="field-help">
                    Urutan pengajuan terbaru ke terlama. Tercatat di Bilcode
                    berarti terkirim; keputusan dipilih atau ditolak ditampilkan
                    terpisah.
                  </p>
                </div>
                <div className="bid-section-heading">
                  <h2 id="my-bids-title">Penawaran saya</h2>
                  <span>{data.applicationTotal} pengajuan</span>
                </div>
                {!data.applications.length ? (
                  <div className="panel empty">
                    <h3>Belum ada penawaran pada filter ini</h3>
                    <p>
                      Bid manual dari dashboard Bilcode juga akan muncul setelah
                      sinkronisasi pertama.
                    </p>
                  </div>
                ) : (
                  <div className="bid-applications">
                    {data.applications.map((app) => (
                      <article className="panel bid-application" key={app.id}>
                        <div className="bid-application-heading">
                          <div>
                            <p className="section-label">
                              Proyek #{app.projectId}
                              {app.source === "AUTO"
                                ? " · Otomatis"
                                : " · Manual"}
                              {app.upstreamId
                                ? ` · Bid #${app.upstreamId}`
                                : ""}
                            </p>
                            <h3>{app.title}</h3>
                          </div>
                          <span
                            className={`status ${app.state === "FAILED" || (app.state === "CONFIRMED" && app.status === "rejected") ? "status-bad" : app.state === "CONFIRMED" && app.status === "selected" ? "status-good" : app.state === "UNKNOWN" ? "status-warn" : "status-neutral"}`}
                          >
                            {app.state === "CONFIRMED"
                              ? (
                                  {
                                    selected: "Dipilih",
                                    rejected: "Ditolak",
                                    applied: "Menunggu keputusan",
                                  } as Record<string, string>
                                )[app.status || ""] || "Tercatat di Bilcode"
                              : app.state === "FAILED"
                                ? "Gagal dikirim"
                                : localState[app.state] || app.state}
                          </span>
                        </div>
                        <p>
                          <span className="field-help">
                            Diajukan {time(app.submittedAt || app.confirmedAt)}{" "}
                            · Status diperbarui {time(app.updatedAt)}
                          </span>
                        </p>
                        <p>
                          Status Bilcode:{" "}
                          <strong>{app.status || "Belum diketahui"}</strong>
                        </p>
                        {app.lastError &&
                          (!app.attempts?.length ||
                            (app.confirmedAt &&
                              app.attempts[0].createdAt < app.confirmedAt)) && (
                            <p className="notice">{app.lastError}</p>
                          )}
                        {!app.attempts?.length && (
                          <p className="field-help">
                            Belum ada detail respons untuk pengajuan ini.
                            Catatan lama tetap ditampilkan jika tersedia.
                          </p>
                        )}
                        <BidResults
                          projectId={app.projectId}
                          currentState={app.state}
                          latest={app.attempts?.[0]}
                          total={app._count?.attempts || 0}
                          onUnauthorized={onUnauthorized}
                        />
                        {app.events.length > 0 && (
                          <ul className="bid-transitions">
                            {app.events.map((event) => (
                              <li key={event.id}>
                                <span>
                                  {event.previousStatus || "Pengajuan baru"} →{" "}
                                  {event.nextStatus}
                                </span>
                                <span>
                                  {event.sentAt
                                    ? "WhatsApp terkirim"
                                    : "WhatsApp menunggu"}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {app.proposalPayload !== null && (
                          <details>
                            <summary>Lihat payload proposal</summary>
                            <pre className="bid-payload">
                              {JSON.stringify(app.proposalPayload, null, 2)}
                            </pre>
                          </details>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </TabsContent>
            <div className="pagination">
              <span>
                Halaman {page} dari {pages}
              </span>
              <div>
                <Button
                  variant="outline"
                  disabled={working || page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  disabled={working || page >= (pages || 1)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Berikutnya
                </Button>
              </div>
            </div>
            <p className="field-help">
              Model: {data.model}. Nilai proposed_amount dikirim sebagai 0
              mengikuti alur Bilcode yang sudah diuji; bukan rekomendasi harga
              pekerjaan.
            </p>
          </>
        )}
      </Tabs>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!working && !open) setSelected(null);
        }}
      >
        <DialogContent
          onInteractOutside={(event) => {
            if (working) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            if (working) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Ajukan penawaran untuk {selected?.title}?</DialogTitle>
            <DialogDescription>
              {selected?.draft?.state === "READY" &&
              selected.draft.version === selected.version
                ? "Konfirmasi ini akan mengirim draft yang sudah tersimpan ke Bilcode tanpa generate AI ulang."
                : "Konfirmasi ini mengizinkan AI menyusun proposal lalu langsung mengirimnya ke Bilcode."}
            </DialogDescription>
          </DialogHeader>
          <div className="notice">
            <TriangleAlert size={18} aria-hidden="true" />
            <div>
              Judul dan deskripsi proyek dikirim ke Vikey untuk analisis. Sistem
              mengirim proposed_amount: 0 dan estimasi hari dari AI yang
              dibatasi deadline. Pastikan kamu bersedia mengerjakan lingkup
              proyek ini.
            </div>
          </div>
          <p className="field-help">
            Jika hasil pengiriman tidak pasti, sistem memeriksa my-bids dan
            tidak mengulang POST otomatis. Saat proses berjalan, jangan menutup
            tab; jika terputus, cek penawaran yang tersimpan sebelum mencoba
            lagi.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={working}
              onClick={() => setSelected(null)}
            >
              Batal
            </Button>
            <Button disabled={working} onClick={() => void submit()}>
              <ArrowUpRight size={16} aria-hidden="true" />
              {working ? "Memproses pengajuan…" : "Ya, kirim penawaran"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
