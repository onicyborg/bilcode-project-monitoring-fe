"use client";

import { useRef, useState } from "react";
import { FileJson, Upload } from "lucide-react";

export function CookieDropzone({
  disabled,
  onLoad,
}: {
  disabled: boolean;
  onLoad: (contents: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState(false);
  const [filename, setFilename] = useState("");
  const [error, setError] = useState("");
  const unavailable = disabled || reading;

  async function readFiles(files: FileList) {
    if (unavailable || files.length === 0) return;
    setError("");
    if (files.length !== 1) {
      setError("Pilih satu file JSON cookie saja.");
      return;
    }
    const file = files[0];
    if (!file.name.toLowerCase().endsWith(".json")) {
      setError("Gunakan file export cookie dengan format .json.");
      return;
    }
    if (file.size > 100000) {
      setError("File terlalu besar. Batas file cookie 100 KB.");
      return;
    }
    setReading(true);
    try {
      const contents = await file.text();
      try {
        JSON.parse(contents);
      } catch {
        setError(
          "Isi file bukan JSON yang valid. Ekspor ulang cookie lalu coba lagi.",
        );
        return;
      }
      onLoad(contents);
      setFilename(file.name);
    } catch {
      setError("File tidak dapat dibaca. Pilih kembali file cookie.");
    } finally {
      setReading(false);
    }
  }

  return (
    <div>
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        hidden
        disabled={unavailable}
        aria-label="Pilih file export cookie JSON"
        onChange={(event) => {
          if (event.currentTarget.files)
            void readFiles(event.currentTarget.files);
          event.currentTarget.value = "";
        }}
      />
      <button
        id="cookie-file"
        type="button"
        className="cookie-dropzone"
        data-dragging={dragging && !unavailable}
        disabled={unavailable}
        aria-describedby="cookie-file-help cookie-file-status"
        aria-invalid={!!error}
        aria-busy={reading}
        onClick={() => input.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!unavailable) {
            dragDepth.current++;
            setDragging(true);
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = unavailable ? "none" : "copy";
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          dragDepth.current = 0;
          setDragging(false);
          void readFiles(event.dataTransfer.files);
        }}
      >
        {filename ? (
          <FileJson size={26} aria-hidden="true" />
        ) : (
          <Upload size={26} aria-hidden="true" />
        )}
        <span className="dropzone-title">
          {reading
            ? "Membaca file…"
            : dragging
              ? "Lepaskan file JSON di sini"
              : "Seret file JSON ke sini atau klik untuk memilih"}
        </span>
        <span className="dropzone-description">
          Satu file .json, maksimal 100 KB
        </span>
      </button>
      <p id="cookie-file-status" className="dropzone-status" aria-live="polite">
        {filename
          ? `${filename} siap. Klik Simpan cookie untuk menyimpannya.`
          : "File dibaca di browser dan disimpan setelah kamu menekan Simpan cookie."}
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
