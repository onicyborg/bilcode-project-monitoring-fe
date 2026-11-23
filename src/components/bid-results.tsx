"use client";

import { useEffect, useState } from "react";
import { api, ApiError, type Paginated } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type BidResult = {
  id: string;
  outcome: string;
  phase: string;
  httpStatus: number | null;
  postHttpStatus: number | null;
  code: string | null;
  message: string;
  action: string;
  response: { message?: string; errors?: Record<string, string[]> } | null;
  createdAt: string;
};
const phases: Record<string, string> = {
  PRECHECK: "Pemeriksaan sebelum pengajuan",
  AI: "Penyusunan proposal AI",
  RECHECK_PROJECT: "Pemeriksaan ulang proyek",
  POST_BID: "Pengiriman ke Bilcode",
  RECONCILE: "Pencocokan riwayat Bilcode",
};
const outcomes: Record<string, string> = {
  CONFIRMED: "Tercatat di Bilcode",
  FAILED: "Pengajuan gagal",
  UNKNOWN: "Hasil belum pasti",
};
const time = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

function Result({ result }: { result: BidResult }) {
  const errors = result.response?.errors;
  return (
    <section
      className="bid-result"
      data-outcome={result.outcome}
      aria-label="Hasil percobaan pengajuan"
    >
      <div className="bid-result-heading">
        <strong>{outcomes[result.outcome] || result.outcome}</strong>
        <time dateTime={result.createdAt}>{time(result.createdAt)} WIB</time>
      </div>
      <p className="bid-result-message">{result.message}</p>
      <dl className="bid-result-facts">
        <div>
          <dt>Tahap</dt>
          <dd>{phases[result.phase] || result.phase}</dd>
        </div>
        <div>
          <dt>Status HTTP tahap ini</dt>
          <dd>{result.httpStatus ?? "Tidak tersedia"}</dd>
        </div>
        {result.postHttpStatus !== null && result.phase !== "POST_BID" && (
          <div>
            <dt>Status HTTP pengiriman</dt>
            <dd>{result.postHttpStatus}</dd>
          </div>
        )}
        {result.code && (
          <div>
            <dt>Kode</dt>
            <dd>{result.code}</dd>
          </div>
        )}
      </dl>
      {errors && (
        <div className="bid-validation">
          <strong>Field yang perlu diperiksa</strong>
          <ul>
            {Object.entries(errors).map(([field, messages]) => (
              <li key={field}>
                <code>{field}</code>
                <ul>
                  {messages.map((message, index) => (
                    <li key={index}>{message}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="bid-result-action">
        <h4>Yang perlu kamu lakukan</h4>
        <p>{result.action}</p>
      </div>
      {result.response && Object.keys(result.response).length > 0 && (
        <details>
          <summary>Lihat respons yang disimpan</summary>
          <p className="field-help">
            Hanya pesan dan validasi yang relevan disimpan. Credential
            disamarkan.
          </p>
          <pre className="bid-payload">
            {JSON.stringify(result.response, null, 2)}
          </pre>
        </details>
      )}
    </section>
  );
}

export function BidResults({
  projectId,
  latest,
  total,
  currentState,
  onUnauthorized,
}: {
  projectId: number;
  latest?: BidResult;
  total: number;
  currentState: string;
  onUnauthorized: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<BidResult> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError("");
    api<Paginated<BidResult>>(
      `/bids/projects/${projectId}/attempts?page=${page}&limit=5`,
    )
      .then((value) => {
        if (active) setData(value);
      })
      .catch((reason) => {
        if (!active) return;
        if (reason instanceof ApiError && reason.status === 401)
          onUnauthorized();
        else
          setError(
            reason instanceof Error
              ? reason.message
              : "Riwayat belum dapat dimuat.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, page, projectId, latest?.id, onUnauthorized, reload]);
  return (
    <div className="bid-results">
      {latest && (
        <>
          {currentState === "CONFIRMED" && latest.outcome !== "CONFIRMED" && (
            <p className="notice">
              Pengajuan saat ini sudah tercatat di Bilcode. Catatan berikut
              adalah hasil saat percobaan terdahulu.
            </p>
          )}
          <Result result={latest} />
        </>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        {total > 0 && (
          <DialogTrigger asChild>
            <Button
              variant="outline"
              onClick={() => {
                setPage(1);
                setData(null);
              }}
            >
              Riwayat hasil pengajuan ({total})
            </Button>
          </DialogTrigger>
        )}
        <DialogContent className="bid-history-dialog">
          <DialogHeader>
            <DialogTitle>Riwayat pengajuan proyek #{projectId}</DialogTitle>
            <DialogDescription>
              Hasil setiap percobaan tetap tersimpan meskipun pengajuan dicoba
              lagi. Riwayat dibaca dari database, tanpa mengirim bid.
            </DialogDescription>
          </DialogHeader>
          {loading && <p role="status">Memuat riwayat…</p>}
          {error && (
            <div className="form-error" role="alert">
              <p>{error}</p>
              <Button variant="outline" onClick={() => setReload((r) => r + 1)}>
                Coba muat lagi
              </Button>
            </div>
          )}
          {!loading && !error && data && (
            <>
              {!data.items.length && (
                <p>Belum ada hasil percobaan yang tersimpan.</p>
              )}
              <div className="bid-history-list">
                {data.items.map((result) => (
                  <Result key={result.id} result={result} />
                ))}
              </div>
              <div className="pagination">
                <span>
                  Halaman {data.page} dari {data.pages}
                </span>
                <div>
                  <Button
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    variant="outline"
                    disabled={page >= data.pages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
