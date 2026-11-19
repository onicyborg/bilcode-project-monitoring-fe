# Deployment development

Repository ini memiliki dua branch: `main` untuk kode utama dan `development` untuk deployment. Push ke keduanya menjalankan verifikasi; hanya `development` yang build/publish image GHCR lalu deploy. Workflow manual juga harus memilih branch `development`.

## GitHub Environment

Gunakan Environment **`development`** pada Settings > Environments. Buat secret `VPS_HOST`, `VPS_PORT` (4238), `VPS_USER`, `VPS_KNOWN_HOSTS`, `VPS_SSH_KEY`, dan `VPS_ENV`. `VPS_SSH_PASSPHRASE` opsional. `GITHUB_TOKEN` disediakan otomatis oleh Actions.

Nama dan nilai siap salin ada di file lokal privat `github-environment-secrets.txt` di folder pengelompokan project, di luar kedua repo. File tersebut tidak dipush. Secret `VPS_ENV` adalah seluruh isi environment aplikasi dalam satu nilai multiline, bukan satu secret untuk setiap variabel aplikasi. Template non-rahasia tersedia di `production.env.example`.

Jika secret belum diisi, image tetap dibangun dan diterbitkan, lalu deployment dilewati dengan pemberitahuan pada job summary. Setelah secret terisi, jalankan Actions > Build and deploy > Run workflow > development. Pengisian secret sendiri tidak memicu push baru. Jalankan backend lebih dulu, lalu frontend.

## VPS dan domain

- SSH: host dan port sesuai secret; key deployment khusus sudah dipasang pada VPS.
- Backend: `/opt/bilcode-monitoring-api`, listen lokal `127.0.0.1:4100`.
- Frontend: `/opt/bilcode-monitoring-web`, listen lokal `127.0.0.1:3100`.
- Network Docker bersama: `bilcode-monitoring-services`, dibuat otomatis jika belum ada.
- Domain frontend: `https://bilcode-monitoring.geats.web.id`.
- Domain backend: `https://api-bilcode-monitoring.geats.web.id`.
- Managed reverse proxy/TLS penyedia harus mengarahkan kedua domain ke container VPS yang sama pada private port **8080**. Nginx membedakan route melalui Host; konfigurasi `nginx.conf` repo ini sudah disiapkan pada VPS. Konfigurasi GOWA tetap menggunakan domainnya sendiri.

Browser frontend tetap memanggil `/api/*` pada origin frontend. Next.js meneruskan ke backend melalui network internal Docker. Backend juga tersedia lewat subdomain API, dengan autentikasi Bearer dan origin guard. Cookie refresh panel HttpOnly tetap berada pada origin frontend, tanpa CORS lintas domain untuk penggunaan panel.

## Alur rilis

Image memakai digest SHA256 dari hasil build, bukan mutable latest. Workflow mengirim Compose/script/environment lewat SSH dengan known-host checking, login GHCR menggunakan credential sementara, lalu menjalankan deploy script. Script mengunci deployment, menarik image, dan menunggu health check. Jika pembaruan gagal, script mencoba mengembalikan image serta environment sebelumnya. Migrasi database yang sudah berhasil tidak otomatis dibalik.

Backend memakai **Neon PostgreSQL development**, tidak membuat database di VPS. `DATABASE_URL` memakai pooled connection untuk query Prisma. `DIRECT_DATABASE_URL` memakai endpoint direct untuk migrasi dan session advisory lock worker; jangan memakai transaction pooler untuk session lock. Koneksi wajib TLS. Jika koneksi lock terputus, backend berhenti agar restart policy mengembalikan worker dengan lock baru.

Migrasi dijalankan melalui one-off container sebelum API diperbarui. Pertahankan `ENCRYPTION_KEY` untuk membaca secret terenkripsi, dan kedua JWT secret untuk mempertahankan sesi panel. Jangan menjalankan integration test pada Neon: pengujian memakai PostgreSQL lokal/CI dan database khusus yang dibuat ulang.

Frontend standalone sudah menyertakan aset statis, berjalan sebagai user non-root, dan memerlukan backend hanya ketika request API dibuat. `API_URL=http://bilcode-monitoring-api:4100` ditetapkan saat build image; jika alamat internal berubah, sesuaikan Dockerfile/build arg dan build ulang.

Instalasi database baru dalam keadaan monitoring berhenti. Impor dan validasi cookie Bilcode melalui panel sebelum Mulai. Login/logout panel tidak menggantikan sesi Bilcode. Service Python lama tetap dihentikan untuk menghindari dua poller memakai sesi yang sama.

## Pemeriksaan setelah rilis

```bash
curl -fsS https://api-bilcode-monitoring.geats.web.id/api/health
curl -fsS https://bilcode-monitoring.geats.web.id/api/health
```

Keduanya harus melaporkan database connected. Login melalui panel, muat ulang halaman untuk memeriksa refresh JWT, dan periksa status monitoring sebelum mengaktifkannya.
