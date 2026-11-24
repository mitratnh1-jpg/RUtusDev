# Operasional RUtusdev — Backup, Pemulihan, Checklist Rilis

## Backup otomatis (GitHub Actions)
Workflow `.github/workflows/backup.yml` berjalan tiap Minggu malam (bisa juga dijalankan manual lewat tab Actions → *Backup mingguan* → Run workflow):
dump database (terenkripsi gpg AES256) ke `db/` dan sinkron media R2 ke `media/` di bucket cadangan; dump lebih dari 90 hari dihapus.
Secrets yang harus dibuat tercantum di bagian atas file workflow. Catatan penting:
- Pakai connection string **Session pooler** Supabase (runner GitHub tidak mendukung IPv6).
- Taruh bucket cadangan di akun/penyedia **berbeda** dari produksi, dan buat kunci R2 produksi untuk workflow ini **read-only**.
- Simpan `BACKUP_PASSPHRASE` di password manager. Tanpa itu dump tidak bisa dipulihkan.
- Jalankan workflow manual sekali sebelum rilis dan pastikan file muncul di bucket. Jika workflow gagal, GitHub mengirim email ke pemilik repo.
- Dekripsi: `gpg --batch --pinentry-mode loopback --passphrase "$BACKUP_PASSPHRASE" -d rutusdev-YYYY-MM-DD.dump.gpg > db.dump`, lalu `pg_restore` seperti di bawah.

### Backup manual (cadangan tambahan)
**Database** (connection string ada di Supabase → Project Settings → Database):
    pg_dump "$SUPABASE_DB_URL" --no-owner --format=custom -f rutusdev-$(date +%F).dump
Simpan juga folder `supabase/` (SQL skema) di repository privat.

**Media R2**: sinkronkan bucket `rutusdev-media` ke penyimpanan lain, misalnya dengan rclone (S3-compatible endpoint R2).

## Pemulihan
1. Buat proyek Supabase baru → jalankan `supabase/schema.sql`.
2. Restore data: `pg_restore --no-owner -d "$SUPABASE_DB_URL" --data-only rutusdev-YYYY-MM-DD.dump`.
3. Buat ulang user admin (Supabase Auth) + baris `admin_profiles`.
4. Salin media ke bucket R2, perbarui `SUPABASE_URL`/secret di Worker, lalu `npm run deploy`.
**Uji pemulihan ke proyek terpisah minimal sekali per kuartal.**

## Notifikasi lead baru
Setiap lead yang masuk memicu notifikasi (tidak menunda respons form; kegagalan hanya muncul di `wrangler tail`):
- **Email (Resend)**: verifikasi domain di resend.com, lalu `npx wrangler secret put RESEND_API_KEY`, isi `NOTIFY_TO` (boleh beberapa alamat, pisah koma) dan `NOTIFY_FROM` di `wrangler.jsonc`.
- **Webhook** (untuk WhatsApp/Telegram/Slack lewat n8n, Make, Zapier, atau bot sendiri): `npx wrangler secret put NOTIFY_WEBHOOK_URL` (wajib https). Worker mengirim JSON `{ text, event: "lead.created", lead }`.
Keduanya boleh aktif bersamaan. Uji: kirim form di situs, cek inbox dan tab Prospek.

## Rate limit & login
- `wrangler.jsonc` memakai binding `ratelimits`: `RATE_LIMITER` (lead, 5/menit/IP) dan `RATE_LIMITER_ADMIN` (API admin, 120/menit/IP). Berlaku juga di `*.workers.dev`.
  Ubah angka `limit` bila perlu (`period` hanya 10 atau 60 detik). Tambahkan juga aturan WAF Rate Limiting untuk `/api/leads` bila ingin lapisan kedua.
- Login admin langsung ke Supabase Auth, jadi Worker tidak bisa membatasinya. Perlindungannya: di Supabase → Authentication → **Attack Protection** aktifkan **CAPTCHA (Turnstile)** dengan secret yang sama
  (halaman login sudah mengirim token), dan cek **Rate Limits** bawaan Auth. Matikan **Allow new users to sign up**.

## Analytics
Cloudflare Web Analytics (tanpa cookie): Cloudflare → Analytics & Logs → Web Analytics → tambah situs → salin token (32 karakter hex) ke
`CF_BEACON_TOKEN` di `wrangler.jsonc` **dan** `VITE_CF_BEACON_TOKEN` di `web/.env`. Beacon dipasang di landing page dan halaman artikel/proyek.

## Log
Aksi admin tercatat di tabel `activity_logs` (aktor, aksi, entitas, waktu). Log Worker: `npx wrangler tail`.

## Checklist sebelum rilis
- [ ] `npm run check:release` lolos (tidak ada placeholder `GANTI…`; dijalankan otomatis oleh `npm run deploy`)
- [ ] Domain final di `ALLOWED_ORIGIN`; WhatsApp/email/statistik di Settings admin (kosong = disembunyikan)
- [ ] Testimoni asli ditambahkan di admin (hanya dengan izin klien) atau dibiarkan kosong
- [ ] Secret: `SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET`, `RESEND_API_KEY`/`NOTIFY_WEBHOOK_URL`
- [ ] Supabase Attack Protection (CAPTCHA) aktif, sign-up publik mati
- [ ] Lead tes → notifikasi masuk; workflow backup dijalankan manual sekali dan hasilnya terverifikasi
- [ ] Turnstile site key & secret terpasang; kirim form tes → lead muncul di admin
- [ ] MFA aktif di akun admin; hanya satu admin di `admin_profiles`
- [ ] RLS aktif di semua tabel (cek di Supabase → Table editor)
- [ ] Tidak ada service-role key di `public/` atau repository
- [ ] Sitemap dikirim ke Google Search Console; cek `/robots.txt`
- [ ] Uji di HP, cek kuota free tier Workers/Supabase/R2, jadwalkan backup pertama
