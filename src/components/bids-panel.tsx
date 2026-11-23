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
  status: string | null;
  upstreamId: number | null;
  lastError: string | null;
  proposalPayload: unknown;
  updatedAt: string;
  confirmedAt?: string | null;
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
  model: string;
  proposedAmount: number;
  page: number;
  pages: number;
  projectTotal: number;
  applicationTotal: number;
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
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Project | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [highlight, setHighlight] = useState<number | null>(null);
  const load = useCallback(async () => {
    try {
      const next = await api<Dashboard>(`/bids?page=${page}&limit=10`);
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
  }, [page, onUnauthorized]);
  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const next = await api<Dashboard>(`/bids?page=${page}&limit=10`);
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
    setHighlight(
      Number(new URLSearchParams(window.location.search).get("project")) ||
        null,
    );
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [page, onUnauthorized]);
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
          <h2>Konfirmasi sekali, pantau selanjutnya</h2>
          <p>
            AI menyusun lalu langsung mengirim proposal hanya untuk proyek yang
            kamu konfirmasi.
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
      {!data ? (
        <p className="loading-state">Memuat proyek dan penawaran…</p>
      ) : (
        <>
          {!data.aiConfigured && (
            <p className="notice">
              <TriangleAlert size={18} aria-hidden="true" />
              AI belum diaktifkan. Atur VIKEY_API_KEY pada environment backend
              sebelum mengajukan.
            </p>
          )}
          <section aria-labelledby="bid-projects-title">
            <div className="bid-section-heading">
              <h2 id="bid-projects-title">Proyek terdeteksi</h2>
              <span>{data.projectTotal} proyek tersimpan</span>
            </div>
            {!data.projects.length ? (
              <div className="panel empty">
                <Send size={26} aria-hidden="true" />
                <h3>Belum ada proyek tersimpan</h3>
                <p>
                  Jalankan monitoring atau sinkronkan Bilcode untuk mengambil
                  proyek. Tidak ada bid yang dikirim pada saat sinkronisasi.
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
                          {project.hasApplied
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
                          : "Konfirmasi & ajukan"}
                      </Button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
          <section aria-labelledby="my-bids-title">
            <div className="bid-section-heading">
              <h2 id="my-bids-title">Penawaran saya</h2>
              <span>{data.applicationTotal} pengajuan</span>
            </div>
            {!data.applications.length ? (
              <div className="panel empty">
                <h3>Belum ada pengajuan tercatat</h3>
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
                          {app.upstreamId ? ` · Bid #${app.upstreamId}` : ""}
                        </p>
                        <h3>{app.title}</h3>
                      </div>
                      <span
                        className={`status ${app.state === "CONFIRMED" ? "status-good" : app.state === "FAILED" ? "status-bad" : "status-warn"}`}
                      >
                        {localState[app.state] || app.state}
                      </span>
                    </div>
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
                        Belum ada detail respons untuk pengajuan ini. Catatan
                        lama tetap ditampilkan jika tersedia.
                      </p>
                    )}
                    <BidResults
                      projectId={app.projectId}
                      currentState={app.state}
                      latest={app.attempts?.[0]}
                      total={app._count?.attempts || 0}
                      onUnauthorized={onUnauthorized}
                    />
                    <p className="field-help">
                      Diperbarui {time(app.updatedAt)}
                    </p>
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
          <div className="pagination">
            <span>
              Halaman {page} dari {data.pages}
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
                disabled={working || page >= data.pages}
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
              Konfirmasi ini mengizinkan pemakaian AI dan pengiriman bid
              langsung ke Bilcode. Tidak ada tahap tinjau draft berikutnya.
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
              {working ? "AI menyusun & mengirim…" : "Ya, susun & kirim bid"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
