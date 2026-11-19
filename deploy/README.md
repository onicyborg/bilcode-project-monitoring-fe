# Deployment frontend ke Vercel

Frontend memakai Vercel Git Integration. Backend NestJS dan GOWA tetap di VPS, database backend memakai Neon. Workflow Docker/SSH frontend telah dihapus. GitHub Actions kini menjalankan pengujian dan build saja.

Branch utama repository tetap `main`. Sesuai alur deployment project, branch yang dipublikasikan Vercel adalah **`development`**. Di Vercel, istilah **Production** merujuk ke domain live project, meskipun branch-nya bernama development dan backend memakai Neon development.

## 1. Import repository

1. Login ke https://vercel.com/new dengan GitHub.
2. Import `onicyborg/bilcode-project-monitoring-fe`; izinkan akses Vercel GitHub App untuk repo ini.
3. Pilih framework **Next.js**, root directory `./`, dan Node.js **24.x**.
4. Install Command: `pnpm install --frozen-lockfile`.
5. Build Command: `pnpm test && pnpm build` (sudah ditetapkan di `vercel.json`). Output Directory biarkan default Next.js. Jangan gunakan output export/static atau `.next/standalone`.

## 2. Tambahkan environment variable

Pada Environment Variables Vercel, tambahkan nilai ini untuk **Production**:

```dotenv
API_URL=https://api-bilcode-monitoring.geats.web.id
```

Gunakan origin tanpa `/api` atau trailing slash. Nilai ini bukan `NEXT_PUBLIC_API_URL`: browser memanggil `/api/*` pada domain frontend, lalu rewrite Next.js meneruskannya ke backend publik HTTPS. Backend harus dapat dijangkau dari internet; hostname Docker internal dan localhost VPS tidak dapat diakses Vercel.

Environment variable GitHub tidak otomatis disalin ke Vercel. Tidak perlu `VPS_ENV`, SSH key, database URL, JWT secret, atau password GOWA pada frontend. Vercel mengatur NODE_ENV/port sendiri. Perubahan API_URL membutuhkan deployment baru karena rewrite ditetapkan saat build.

## 3. Tetapkan branch deployment

1. Setelah project dibuat, buka **Settings > Environments > Production > Branch Tracking / Production Branch**. Pada tampilan Vercel lain pengaturan ini dapat berada di **Settings > Git**.
2. Ubah Production Branch dari `main` menjadi **`development`**.
3. Jika proses import pertama sudah memakai main, jangan gunakan deployment itu sebagai hasil akhir. Setelah mengganti branch, deploy ulang commit terbaru development dari tab Deployments/Create Deployment.
4. `vercel.json` mengaktifkan deployment Git hanya untuk development. Main tetap tersimpan sebagai branch utama dan tidak dipublikasikan otomatis.

## 4. Pasang domain frontend

1. Buka **Settings > Domains**, tambahkan `bilcode-monitoring.geats.web.id` untuk Production.
2. Pada pengelola DNS `geats.web.id`, ganti record hostname `bilcode-monitoring` menjadi **CNAME** dengan target persis yang Vercel tampilkan. Hapus record A/AAAA yang bertabrakan pada hostname yang sama. Jangan menyalin target CNAME project lain.
3. Domain frontend tidak lagi diarahkan ke managed reverse proxy/container VPS. Jika masih ada mapping frontend di panel VPS, hapus mapping itu. Domain `api-bilcode-monitoring.geats.web.id` dan `wa.geats.web.id` tetap diarahkan ke VPS seperti sebelumnya.
4. Tunggu status domain valid dan sertifikat HTTPS aktif di Vercel.

## 5. Pastikan origin backend sesuai

GitHub Environment backend `development` > secret VPS_ENV harus berisi:

```dotenv
APP_ORIGIN=https://bilcode-monitoring.geats.web.id
```

Nilai itu sudah sesuai untuk domain final. Jika ingin login melalui domain bawaan `project.vercel.app` sebelum DNS custom domain selesai, tambahkan origin bawaan yang persis ke APP_ORIGIN, dipisahkan koma, lalu redeploy backend. Jangan memakai wildcard `*.vercel.app`. Preview URL lain tetap ditolak jika tidak terdaftar.

Cookie refresh panel bersifat HttpOnly/Secure, tanpa atribut Domain, dan memakai path `/api/auth`. Respons rewrite diterima browser pada origin frontend sehingga login dan refresh tetap melalui satu origin; tidak perlu melonggarkan CORS backend.

## 6. Deploy dan verifikasi

1. Deploy development melalui Vercel.
2. Buka `https://bilcode-monitoring.geats.web.id/api/health`; respons harus menyebut database connected.
3. Login ke panel, reload untuk memeriksa pemulihan sesi, dan buka halaman Sesi/Log/Konfigurasi.
4. Pastikan monitoring masih berhenti sampai kamu siap mengimpor cookie Bilcode dan menjalankan monitoring.
5. Setelah setup, setiap push ke development otomatis menjalankan build dan deployment Vercel. Build command menjalankan pengujian lebih dulu sehingga pengujian gagal membatalkan deployment. GitHub Actions juga menjalankan CI secara terpisah.

Tidak diperlukan VERCEL_TOKEN atau workflow GitHub Actions deployment tambahan untuk integrasi Git bawaan ini. Secret SSH frontend lama di GitHub tidak digunakan lagi dan dapat dihapus dari environment frontend; jangan menghapus secret environment backend.

## Referensi

- https://vercel.com/docs/git/vercel-for-github
- https://vercel.com/docs/project-configuration/git-configuration
- https://vercel.com/docs/environment-variables
- https://vercel.com/docs/domains/working-with-domains/add-a-domain
