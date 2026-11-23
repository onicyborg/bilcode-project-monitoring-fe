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

Pada Vercel, isi `API_URL=https://api-bilcode-monitoring.geats.web.id`. Backend harus dapat dijangkau melalui HTTPS publik; hostname Docker internal atau localhost VPS tidak dapat digunakan. Isi `APP_ORIGIN` pada backend dengan origin frontend publik. Login panel tetap menggunakan cookie HttpOnly pada origin frontend; cookie Bilcode dan password GOWA tidak disimpan pada environment browser.

Next.js menghasilkan rewrites saat build. Tetapkan `API_URL` sebelum `pnpm run build` dan rebuild apabila alamat tersebut berubah. Environment deployment dapat memasok variabel ini langsung tanpa file `.env.local`.

## Build dan menjalankan lokal

```bash
pnpm install --frozen-lockfile
pnpm run build
pnpm start
```

`pnpm start` memakai output standalone dan menyalin aset statis yang diperlukan ke folder standalone sebelum menjalankan server. Runtime default mendengarkan `127.0.0.1:3100`. Atur `FRONTEND_HOST=0.0.0.0` untuk jaringan container dan `PORT` bila membutuhkan port lain.

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

## CI/CD Vercel

Frontend dideploy melalui Vercel Git Integration dari branch `development`. Pengujian dan build di GitHub Actions tetap aktif; workflow deployment Docker/SSH frontend telah dihapus. Panduan setup Vercel, environment API_URL, domain, dan origin backend ada di [deploy/README.md](deploy/README.md).

## Menghubungkan sesi Bilcode dari mobile

Halaman Sesi Bilcode menyediakan form email OTP di atas alternatif import cookie. Hentikan monitoring, masukkan email akun Bilcode, tekan Kirim kode OTP, lalu masukkan enam digit kode dari email. Setelah Verifikasi & simpan sesi berhasil, tekan Validasi sesi dan mulai monitoring dari Ringkasan.

Kirim ulang tersedia setelah 60 detik. Kode dihapus dari form setelah verifikasi; tidak ada penyimpanan email/OTP pada localStorage. Setelah reload halaman atau restart backend, minta kode baru. Login ke Bilcode melalui perangkat lain tetap dapat mencabut sesi monitoring.

Deploy backend yang memiliki endpoint OTP sebelum memperbarui frontend. Tidak ada environment variable baru.

## Redesign workspace

Desain mengacu pada skill UI UX Pro Max dengan gaya minimal operasional, IBM Plex Sans, aksen biru, dan kontrol Nova tanpa radius. Desktop memakai navigasi samping; mobile memakai navigasi bawah dengan safe-area spacing. Riwayat tabel menjadi catatan berlabel pada layar kecil. Form OTP menjadi jalur utama, import cookie dapat dibuka jika diperlukan, dan tombol validasi sesi selalu terlihat.

Arah visual dan keputusan layout ada di [DESIGN.md](DESIGN.md). Pemeriksaan browser mencakup empat halaman pada lebar 375/768/1024/1440, tema terang/gelap, form login, navigasi, filter log, konfirmasi pengiriman (dibatalkan), disclosure import cookie, serta pembesaran teks 200%. Tidak ada OTP nyata atau pesan WhatsApp dikirim selama pemeriksaan desain.

## Proyek dan penawaran

Kartu penawaran menampilkan hasil percobaan terakhir, pesan Bilcode yang sudah dibersihkan, tahap, HTTP status, kode, field validasi, dan saran tindakan. Respons tersimpan dapat dibuka sebagai JSON. Tombol Riwayat hasil pengajuan membuka catatan per percobaan dengan pagination; melihatnya tidak menjalankan bid. Catatan tetap ada setelah retry, dan dibedakan dari status aplikasi terkini apabila pengajuan kemudian ditemukan di Bilcode. Data lama menampilkan `lastError` jika tersedia, tanpa respons historis rekaan.

Fitur riwayat membutuhkan backend dengan migrasi `20261123090000_bid_attempt_history`. Deploy backend terlebih dahulu. Tidak ada perubahan environment Vercel.

Halaman `/bids` menampilkan proyek tersimpan dan riwayat penawaran. Notifikasi proyek WhatsApp menyertakan tautan ke halaman ini. Memuat halaman hanya membaca database; tombol Sinkronkan Bilcode memperbarui proyek dan seluruh riwayat bid, tanpa mengirim pengajuan baru.

Pilih Konfirmasi & ajukan untuk melihat izin pemakaian AI dan pengiriman langsung. Satu konfirmasi **Ya, susun & kirim bid** mengizinkan backend menyusun proposal lalu mengirimkannya. Nilai `proposed_amount` tetap **0** mengikuti kontrak payload saat ini. Jika hasil POST belum pasti, penawaran ditandai menunggu kepastian dan tombol pengiriman dikunci; jangan mengulang manual di dashboard Bilcode. Status lokal pengiriman dan status asli Bilcode ditampilkan terpisah.

Pengecekan status bid mengikuti interval monitoring pada backend. Saat monitoring berhenti, pengecekan berkala juga berhenti; sinkronisasi manual masih tersedia. Perubahan status dikirim ke WhatsApp, termasuk untuk bid lama yang diimpor sebagai baseline. Frontend membaca status tersimpan setiap 10 detik. Deploy backend beserta migrasi bid terlebih dahulu dan tambahkan `VIKEY_API_KEY` ke secret backend `VPS_ENV`. Tidak ada API key AI atau environment tambahan pada Vercel.
