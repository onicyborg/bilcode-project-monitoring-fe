# Bilcode Monitoring Frontend

Repository mandiri **Next.js 16 + shadcn/ui New York + Tailwind CSS**. Dependency, lockfile, source, dan konfigurasi frontend seluruhnya berada pada folder ini. Frontend tidak mengimpor source backend atau package pada parent.

## Setup lokal

Prasyarat: Node.js 24+ dan npm.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Buka http://localhost:3100. Backend dijalankan sebagai service terpisah. Jika backend belum tersedia, panel menampilkan error koneksi; proses build frontend tidak membutuhkan backend berjalan.

## Koneksi backend

```dotenv
API_URL=http://127.0.0.1:4100
```

`API_URL` adalah origin backend **dari sisi server Next.js**, bukan browser, tanpa akhiran `/api`. Request browser `/api/*` diteruskan oleh Next.js ke `${API_URL}/api/*`.

Saat deployment berbeda container, gunakan nama service/backend yang dapat dijangkau frontend, misalnya `http://monitor-api:4100`, bukan localhost frontend. Isi `APP_ORIGIN` pada backend dengan origin frontend publik. Login panel tetap menggunakan cookie HttpOnly pada origin frontend; cookie Bilcode dan password GOWA tidak disimpan pada environment browser.

Next.js menghasilkan rewrites saat build. Tetapkan `API_URL` sebelum `npm run build` dan rebuild apabila alamat tersebut berubah. Environment deployment dapat memasok variabel ini langsung tanpa file `.env.local`.

## Build dan service terpisah

```bash
npm ci
npm run build
npm start
```

`npm start` memakai output standalone dan menyalin aset statis yang diperlukan ke folder standalone sebelum menjalankan server. Runtime default mendengarkan `127.0.0.1:3100`. Atur `FRONTEND_HOST=0.0.0.0` untuk jaringan container dan `PORT` bila membutuhkan port lain.

Untuk mengirim artifact standalone ke server berbeda, sertakan `.next/standalone` beserta `.next/static` pada `.next/standalone/.next/static`. Jika ada `public/`, salin juga ke `.next/standalone/public`. Jalankan `PORT=3100 HOSTNAME=0.0.0.0 node server.js` dari root artifact. Source backend dan dependency parent tidak dibutuhkan.

## Halaman

- **Ringkasan:** status monitoring, start/stop, pengecekan manual, kesiapan sesi/GOWA, dan riwayat terbaru.
- **Sesi Bilcode:** upload/paste cookie JSON, validasi, penghapusan credential, serta panduan pergantian sesi.
- **Log & riwayat:** pengecekan, aktivitas backend, notifikasi, request HTTP, filter, dan pagination.
- **Konfigurasi:** interval, penerima, credential GOWA, dan peringatan autentikasi. Pengiriman JSON percobaan memakai dialog konfirmasi.

Login menggunakan akun panel yang dikonfigurasi di backend, bukan akun Bilcode. Credential panel tidak dibundel ke JavaScript frontend. Tema terang/gelap disimpan pada browser; waktu ditampilkan dalam WIB.

## Verifikasi

```bash
npm run typecheck
npm run build
npm audit
npm run format
```

Instalasi dan build frontend tidak membutuhkan folder backend. Pengujian browser sebelumnya mencakup login/logout, navigasi, konfigurasi, import/hapus cookie dummy, dialog, tab keyboard, pagination, tema, viewport 390/820/1366 piksel, dan teks 200%. Desain dijelaskan di `DESIGN.md`.
