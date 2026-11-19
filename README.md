# Bilcode Monitoring Frontend

Repository mandiri **Next.js 16 + shadcn/ui Nova + Tailwind CSS**. Dependency, lockfile, source, dan konfigurasi frontend seluruhnya berada pada folder ini. Frontend tidak mengimpor source backend atau package pada parent.

## Setup lokal

Preset shadcn/ui: `b1Q5GC` (Nova/Radix, neutral dengan aksen biru, IBM Plex Sans, ikon Lucide, radius none). Komponen dan token CSS mengikuti preset ini; warna status digunakan untuk menandai kondisi monitoring.

Untuk menerapkan ulang preset:

```bash
pnpm dlx shadcn@latest apply --preset b1Q5GC
```

Perintah tersebut menimpa komponen UI, font, dan token CSS. Setelah menjalankannya, pastikan layout memakai font preset dan CSS aplikasi tidak menimpa token tersebut.

Prasyarat: Node.js 24+ dan pnpm 10.33.1.

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm run dev
```

Buka http://localhost:3100. Backend dijalankan sebagai service terpisah. Jika backend belum tersedia, panel menampilkan error koneksi; proses build frontend tidak membutuhkan backend berjalan.

## Koneksi backend

```dotenv
API_URL=http://127.0.0.1:4100
```

`API_URL` adalah origin backend **dari sisi server Next.js**, bukan browser, tanpa akhiran `/api`. Request browser `/api/*` diteruskan oleh Next.js ke `${API_URL}/api/*`.

Saat deployment berbeda container, gunakan nama service/backend yang dapat dijangkau frontend, misalnya `http://monitor-api:4100`, bukan localhost frontend. Isi `APP_ORIGIN` pada backend dengan origin frontend publik. Login panel tetap menggunakan cookie HttpOnly pada origin frontend; cookie Bilcode dan password GOWA tidak disimpan pada environment browser.

Next.js menghasilkan rewrites saat build. Tetapkan `API_URL` sebelum `pnpm run build` dan rebuild apabila alamat tersebut berubah. Environment deployment dapat memasok variabel ini langsung tanpa file `.env.local`.

## Build dan service terpisah

```bash
pnpm install --frozen-lockfile
pnpm run build
pnpm start
```

`pnpm start` memakai output standalone dan menyalin aset statis yang diperlukan ke folder standalone sebelum menjalankan server. Runtime default mendengarkan `127.0.0.1:3100`. Atur `FRONTEND_HOST=0.0.0.0` untuk jaringan container dan `PORT` bila membutuhkan port lain.

Untuk mengirim artifact standalone ke server berbeda, sertakan `.next/standalone` beserta `.next/static` pada `.next/standalone/.next/static`. Jika ada `public/`, salin juga ke `.next/standalone/public`. Jalankan `PORT=3100 HOSTNAME=0.0.0.0 node server.js` dari root artifact. Source backend dan dependency parent tidak dibutuhkan.

## Halaman

- **Ringkasan:** status monitoring, start/stop, pengecekan manual, kesiapan sesi/GOWA, dan riwayat terbaru.
- **Sesi Bilcode:** upload/paste cookie JSON, validasi, penghapusan credential, serta panduan pergantian sesi.
- **Log & riwayat:** pengecekan, aktivitas backend, notifikasi, request HTTP, filter, dan pagination.
- **Konfigurasi:** interval, penerima, credential GOWA, dan peringatan autentikasi. Pengiriman JSON percobaan memakai dialog konfirmasi.

Login menggunakan akun panel yang dikonfigurasi di backend, bukan akun Bilcode. Credential panel tidak dibundel ke JavaScript frontend. Tema terang/gelap disimpan pada browser; waktu ditampilkan dalam WIB.

## Verifikasi

```bash
pnpm test
pnpm run typecheck
pnpm run build
pnpm audit
pnpm run format
```

Instalasi dan build frontend tidak membutuhkan folder backend. Pengujian browser sebelumnya mencakup login/logout, navigasi, konfigurasi, import/hapus cookie dummy, dialog, tab keyboard, pagination, tema, viewport 390/820/1366 piksel, dan teks 200%. Desain dijelaskan di `DESIGN.md`.

## Sesi panel

Access JWT berlaku 15 menit dan hanya disimpan di memori aplikasi. Frontend memasok header Bearer dan otomatis memanggil `/api/auth/refresh` sebelum token kedaluwarsa atau setelah respons 401, lalu mencoba ulang request satu kali. Refresh cookie HttpOnly berumur maksimal 30 hari; browser mengelolanya tanpa localStorage. Setelah reload, cookie ini dipakai untuk memulihkan sesi panel. Refresh bersamaan dalam satu tab digabung; browser yang mendukung Web Locks juga mengurutkan refresh antartab.

Jika refresh token tidak valid atau masa sesi habis, panel meminta login kembali. Keluar dari panel tidak menghentikan worker monitoring. Lima pengujian `pnpm test` memeriksa bootstrap sesi, masa token, refresh bersamaan, sesi dicabut, dan logout saat refresh masih berjalan.

## GitHub Actions dan VPS

Panduan branch, GitHub Environment secrets, Neon development, serta deployment Docker tersedia di [deploy/README.md](deploy/README.md).
