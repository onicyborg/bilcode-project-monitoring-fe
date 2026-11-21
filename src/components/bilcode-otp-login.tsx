"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function BilcodeOtpLogin({
  disabled,
  onConnected,
}: {
  disabled: boolean;
  onConnected: () => void;
}) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [retryAt, setRetryAt] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    const update = () =>
      setRemaining(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [retryAt]);
  async function request() {
    setBusy(true);
    setError("");
    setMessage("");
    setRetryAt(Date.now() + 60000);
    try {
      await api("/session/otp/request", "POST", { email: email.trim() });
      setSentTo(email.trim());
      setCode("");
      setMessage("Kode dikirim. Periksa kotak masuk dan spam email.");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Permintaan OTP gagal.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function verify() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api("/session/otp/verify", "POST", { email: sentTo, code });
      setCode("");
      setSentTo("");
      setMessage(
        "Sesi tersimpan. Tekan Validasi sesi di bawah sebelum memulai monitoring.",
      );
      onConnected();
    } catch (reason) {
      setCode("");
      setError(
        reason instanceof Error ? reason.message : "Verifikasi OTP gagal.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="otp-login" aria-labelledby="otp-login-title">
      <h3 id="otp-login-title">Hubungkan lewat email OTP</h3>
      <p className="field-help">
        Login akun Bilcode dari panel ini, tanpa ekspor cookie. Login ini dapat
        mengakhiri sesi Bilcode di browser lain.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void (sentTo ? verify() : request());
        }}
      >
        <fieldset disabled={disabled || busy}>
          <div className="field">
            <Label htmlFor="bilcode-email">Email akun Bilcode</Label>
            <Input
              id="bilcode-email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              readOnly={!!sentTo}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          {sentTo && (
            <div className="field">
              <Label htmlFor="bilcode-otp">Kode OTP dari email</Label>
              <Input
                id="bilcode-otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, ""))
                }
                aria-describedby="otp-help"
              />
              <p id="otp-help" className="field-help">
                Gunakan 6 digit kode terbaru. Maksimal 5 percobaan per
                permintaan; jika halaman di-refresh atau backend restart, minta
                kode baru.
              </p>
            </div>
          )}
          <div className="form-actions">
            <Button
              disabled={
                !email.trim() ||
                (!sentTo && remaining > 0) ||
                (!!sentTo && code.length !== 6)
              }
            >
              {busy
                ? "Memproses…"
                : sentTo
                  ? "Verifikasi & simpan sesi"
                  : remaining > 0
                    ? `Tunggu ${remaining} detik`
                    : "Kirim kode OTP"}
            </Button>
            {sentTo && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={remaining > 0}
                  onClick={() => void request()}
                >
                  {remaining > 0
                    ? `Kirim ulang (${remaining} dtk)`
                    : "Kirim ulang kode"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSentTo("");
                    setCode("");
                    setError("");
                    setMessage("");
                  }}
                >
                  Ganti email
                </Button>
              </>
            )}
          </div>
        </fieldset>
      </form>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="field-help" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
