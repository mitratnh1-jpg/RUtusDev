# RUtusdev — Fase 1 (Frontend + API Leads)

Struktur:
- `web/`      → frontend React + Vite + TypeScript (`web/src`), aset statis & admin di `web/public`; hasil build: `web/dist`
- `worker/`   → Worker: `POST /api/leads`, `GET /api/health`
- `supabase/schema.sql` → tabel `leads`, `activity_logs` + RLS

## Admin CMS
- Dashboard: `/admin/` (login Supabase Auth; hanya user yang ada di `admin_profiles`).
- Isi `web/public/admin/config.js` dengan SUPABASE_URL + **anon** key (bukan service-role).
- Buat user di Supabase → Authentication, lalu jalankan insert `admin_profiles` (ada di akhir schema.sql).
- Buat bucket R2: `npx wrangler r2 bucket create rutusdev-media`.
- Konten terbit muncul di situs publik (cache ±60 dtk). Aktifkan MFA untuk akun admin.

## Setup
1. Supabase: buat proyek → SQL Editor → jalankan `supabase/schema.sql`.
2. Isi `SUPABASE_URL` dan `ALLOWED_ORIGIN` di `wrangler.jsonc`.
3. Cloudflare Turnstile: buat widget → tempel *site key* di `web/.env` (VITE_TURNSTILE_SITE_KEY) dan `web/src/App.tsx`
   (`data-sitekey`), lalu simpan secret:
       npx wrangler secret put TURNSTILE_SECRET
       npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
4. Lokal: salin `.dev.vars.example` → `.dev.vars`, lalu `npm i && npm run build && npm run dev:api (terminal 1), npm run dev (terminal 2, proxy ke API)`.
5. Rilis: `npm run deploy`. Di Cloudflare (Workers Builds), `bun install` otomatis membangun `web/dist` lewat skrip `postinstall`, jadi perintah deploy cukup `npx wrangler deploy`.

## Keamanan yang sudah diterapkan
Service-role key hanya di secret Worker • RLS deny-by-default • validasi & batas ukuran di server •
Turnstile + honeypot • cek origin • batas 8 KB payload.

## Rate limit (disarankan)
Kode sudah mendukung binding `RATE_LIMITER`. Aktifkan lewat konfigurasi Rate Limiting Cloudflare
(lihat dokumentasi terbaru Workers), atau buat aturan Rate Limiting/WAF untuk `/api/leads`.

## Ganti placeholder
Nomor WhatsApp & email di `web/.env` (VITE_TURNSTILE_SITE_KEY) dan `web/src/App.tsx`, konten contoh Work/testimoni/statistik.

## SEO & halaman publik
Worker merender `/articles`, `/articles/:slug`, `/work/:slug` (title, description, canonical, Open Graph,
JSON-LD), plus `/sitemap.xml` dan `/robots.txt`. Hanya konten berstatus terbit yang tampil; slug wajib
huruf kecil/angka/minus. Isi artikel & proyek ditampilkan sebagai teks biasa (paragraf dipisah baris kosong).
Pastikan `ALLOWED_ORIGIN` di wrangler.jsonc berisi domain final agar canonical & sitemap benar.

## Settings, Markdown, Rate limit
- Admin → **Settings**: ubah teks Hero (eyebrow, headline, subheadline, tombol) dan kontak (WhatsApp, email).
- Isi artikel/proyek mendukung Markdown dasar: `#`/`##`/`###`, `-` daftar, `**tebal**`, `*miring*`, `` `kode` ``,
  blok ``` dan tautan `[teks](https://…)`. Semua di-escape lebih dulu; HTML mentah tidak dijalankan.
- Rate limit: leads 5/menit/IP dan admin 120/menit/IP (fallback Cache API; tidak aktif di *.workers.dev).
  Untuk perlindungan lebih kuat tambahkan binding `RATE_LIMITER` atau aturan WAF.
- Backup/pemulihan & checklist rilis: `docs/OPERASIONAL.md`.

## Settings, Markdown, Rate limit
- Admin → **Settings**: ubah teks Hero (eyebrow, headline, subheadline, tombol) dan kontak (WhatsApp, email).
- Isi artikel/proyek mendukung Markdown dasar: `#`/`##`/`###`, `-` daftar, `**tebal**`, `*miring*`, kode inline,
  blok kode ``` dan tautan `[teks](https://…)`. Semua di-escape lebih dulu; HTML mentah tidak dijalankan.
- Rate limit: leads 5/menit/IP dan admin 120/menit/IP (fallback Cache API; tidak aktif di *.workers.dev).
  Untuk perlindungan lebih kuat tambahkan binding `RATE_LIMITER` atau aturan WAF.
- Backup/pemulihan & checklist rilis: `docs/OPERASIONAL.md`.

## CRM ringan (Fase 2 – tahap awal)
Di admin: **Pipeline** (kanban 7 tahap + total nilai), **Peluang**, **Organisasi**, **Kontak**, **Riwayat** (catatan/telepon/WhatsApp/email/rapat).
Di tab **Prospek**, tombol *Jadikan peluang* membuat kontak + peluang dari lead form website. Jalankan ulang bagian
"CRM ringan" di `supabase/schema.sql`. Belum ada: proposal/PDF, invoice, tugas/milestone, portal klien.

## Penawaran, Invoice, Tugas
- **Penawaran** & **Invoice**: rincian item satu baris per item (`Deskripsi | Jumlah | Harga satuan`), nomor otomatis
  (PNW-/INV-TAHUNBULAN-xxxx) bila dikosongkan. Tombol **Cetak / PDF** membuka halaman siap cetak (`/admin/cetak.html`);
  di dialog cetak pilih *Simpan sebagai PDF*. Pembayaran dicatat manual (status + kolom "Sudah dibayar").
- **Tugas**: tenggat, prioritas, milestone, terhubung ke peluang. Pipeline menampilkan total **piutang** invoice.
- Jalankan ulang bagian "Penawaran, Invoice, Tugas" di `supabase/schema.sql`.

## Ringkasan & analytics
Tab **Ringkasan** (halaman awal admin): prospek baru, peluang aktif & nilai, nilai menang, win rate, konversi prospek→peluang,
piutang, penawaran terkirim, tugas terlambat; grafik prospek 6 bulan; layanan diminati; sumber peluang; daftar
*Perlu perhatian* (invoice lewat jatuh tempo, tugas terlambat, penawaran terkirim >7 hari); aktivitas terbaru.
Dihitung di browser dari 200 data terbaru per tabel — cukup untuk skala awal; pindahkan ke query agregat bila data membesar.
Statistik pengunjung: aktifkan **Cloudflare Web Analytics** (tanpa cookie) di dashboard Cloudflare.

## Frontend React (landing page)
- `web/src/App.tsx` (section), `Contact.tsx` (form + Turnstile), `Dots.tsx` (hero), `useContent.ts` (konten CMS).
- Variabel publik di `web/.env`: `VITE_SITE_URL` (canonical/OG) dan `VITE_TURNSTILE_SITE_KEY`.
- `npm run typecheck` untuk cek tipe, `npm run build` menghasilkan `web/dist`, `npm run deploy` build + deploy Worker.
- `web/public/styles.css` dipakai bersama oleh landing page dan halaman artikel/proyek yang dirender Worker.
- Catatan SEO: landing page dirender di browser; meta tag & JSON-LD statis di `web/index.html`. Artikel & studi kasus tetap dirender server.
