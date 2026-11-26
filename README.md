# RUtusdev — Fase 1 (Frontend + API Leads)

Struktur:
- `web/`      → frontend React + Vite + TypeScript (`web/src`), aset statis & admin di `web/public`; hasil build: `web/dist`
- `worker/`   → Worker: `POST /api/leads`, `GET /api/health`
- `supabase/schema.sql` → tabel `leads`, `activity_logs` + RLS

## Admin CMS
- Dashboard: `/admin/` (login Supabase Auth; hanya user yang ada di `admin_profiles`).
- `SUPABASE_URL` + **anon** key (bukan service-role) cukup diisi sekali di `wrangler.jsonc`; Worker menyajikan `/admin/config.js` otomatis.
- Buat user di Supabase → Authentication, lalu jalankan insert `admin_profiles` (ada di akhir schema.sql).
- Buat bucket R2: `npx wrangler r2 bucket create rutusdev-media`.
- Konten terbit muncul di situs publik segera: cache konten publik dibuang otomatis saat admin menyimpan (lihat "Cache, MFA, gambar, paginasi").

## Setup
1. Supabase: buat proyek → SQL Editor → jalankan `supabase/schema.sql`.
2. Isi `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ALLOWED_ORIGIN`, `TURNSTILE_SITE_KEY` di `wrangler.jsonc`.
3. Cloudflare Turnstile: buat widget → tempel *site key* di `wrangler.jsonc` (TURNSTILE_SITE_KEY) dan `web/.env` (VITE_TURNSTILE_SITE_KEY; harus sama), lalu simpan secret:
       npx wrangler secret put TURNSTILE_SECRET
       npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
4. Lokal: salin `.dev.vars.example` → `.dev.vars`, lalu `npm i && npm run build && npm run dev:api (terminal 1), npm run dev (terminal 2, proxy ke API)`.
5. Rilis: `npm run deploy` (menjalankan `npm run check:release` lebih dulu; gagal bila placeholder belum diganti). Di Cloudflare (Workers Builds), `bun install` otomatis membangun `web/dist` lewat skrip `postinstall`, jadi perintah deploy cukup `npx wrangler deploy`.

## Keamanan yang sudah diterapkan
Service-role key hanya di secret Worker • RLS deny-by-default • validasi & batas ukuran di server •
Turnstile + honeypot • cek origin • batas 8 KB payload.

## Rate limit
Binding `ratelimits` (`RATE_LIMITER`, `RATE_LIMITER_ADMIN`) sudah ada di `wrangler.jsonc`. Detail, perlindungan login, notifikasi lead,
analytics, dan backup otomatis: `docs/OPERASIONAL.md`.

## Placeholder & konten
Tidak ada lagi nomor WhatsApp, testimoni, atau statistik contoh di kode. WhatsApp/email/statistik diisi di Admin → Pengaturan
(kosong = disembunyikan); testimoni dari Admin → Testimoni. `npm run check:release` memastikan tidak ada placeholder tersisa.

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
- Backup/pemulihan & checklist rilis: `docs/OPERASIONAL.md`. Variabel env & secret (agar tidak hilang saat deploy): `docs/ENV.md`.

## Settings, Markdown, Rate limit
- Admin → **Settings**: ubah teks Hero (eyebrow, headline, subheadline, tombol) dan kontak (WhatsApp, email).
- Isi artikel/proyek mendukung Markdown dasar: `#`/`##`/`###`, `-` daftar, `**tebal**`, `*miring*`, kode inline,
  blok kode ``` dan tautan `[teks](https://…)`. Semua di-escape lebih dulu; HTML mentah tidak dijalankan.
- Rate limit: leads 5/menit/IP dan admin 120/menit/IP (fallback Cache API; tidak aktif di *.workers.dev).
  Untuk perlindungan lebih kuat tambahkan binding `RATE_LIMITER` atau aturan WAF.
- Backup/pemulihan & checklist rilis: `docs/OPERASIONAL.md`. Variabel env & secret (agar tidak hilang saat deploy): `docs/ENV.md`.

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

## Portofolio ternormalisasi
Skema mengikuti rancangan: `project_categories` (kategori, 1 per proyek lewat `projects.category_id`), `technologies` + `project_technologies`
(banyak-ke-banyak, berurutan), dan `project_media` (galeri tambahan; `cover_key` tetap menjadi sampul). Jalankan ulang bagian
"Portofolio ternormalisasi" di `supabase/schema.sql`: tabel dibuat dan data lama (`category`, `technologies`) disalin otomatis.
Kelola di admin: **Kategori proyek**, **Teknologi**, lalu pilih di form **Portofolio** (galeri: satu gambar per baris). Kolom lama tidak
dibaca lagi; hapus setelah backfill diperiksa (perintah ada di akhir schema.sql). Halaman `/work/:slug` menampilkan galeri.

## Cache, MFA, gambar, paginasi
- **Panel admin = aplikasi React** (`web/admin/index.html` + `web/src/admin/*`, TypeScript), dibangun Vite bersama situs publik dan disajikan di `/admin/`. Halaman cetak (`web/public/admin/cetak.*`) masih HTML biasa.
- **Invalidasi cache**: setiap simpan/hapus pada layanan, proyek, kategori, teknologi, artikel, testimoni, klien, pengaturan, dan media membuang cache `/api/public/content`. Cache API hanya per lokasi Cloudflare, jadi lokasi lain menyegarkan sendiri paling lambat ±60 dtk. Untuk purge di semua lokasi: isi `CF_ZONE_ID` di `wrangler.jsonc` dan `wrangler secret put CF_API_TOKEN` (token dengan izin *Cache Purge*). Browser pengunjung menyimpan maks. 10 dtk.
- **MFA (TOTP)**: aktifkan di admin → Keamanan & Log → *Aktifkan MFA* (butuh MFA TOTP aktif di Supabase → Authentication). Setelah itu login meminta kode 6 digit dan API admin menolak token tanpa verifikasi (aal1). Setelah MFA terdaftar, set `REQUIRE_MFA` ke `"1"` di `wrangler.jsonc` untuk mewajibkannya (akun tanpa MFA hanya bisa membuka tab Keamanan). Jika kehilangan autentikator: hapus faktor di Supabase → Authentication → Users → user → Factors.
- **Gambar responsif**: binding `IMAGES` (Cloudflare Images) menyajikan `/media/<kunci>?w=320|480|640|960|1280|1600|1920` sebagai AVIF/WebP sesuai peramban; hasil di-cache. Berkas asli di R2 tetap utuh dan jadi cadangan bila transformasi gagal atau binding tidak ada. GIF tidak diubah. Aktifkan Cloudflare Images di dashboard (kuota gratis 5.000 transformasi unik/bulan).
- **Paginasi**: daftar admin 20 baris per halaman (`GET /api/admin/<tabel>?page=N` → `{rows,total,page,per}`; tanpa `page` tetap array maks. 200 untuk dropdown & dasbor). Log keamanan dan media juga dipaginasi. Daftar artikel publik: 12 per halaman (`/articles?page=N`).

## Header keamanan (CSP, HSTS, dll.)
`worker/security.ts` menambah header ke semua respons (API, halaman SSR, media, aset statis): Content-Security-Policy, HSTS,
`X-Content-Type-Options`, Referrer-Policy, Permissions-Policy, COOP, dan `frame-ancestors 'none'` (anti-clickjacking).
CSP awalnya mode laporan (`CSP_REPORT_ONLY: "1"` di `wrangler.jsonc`): buka landing dan `/admin/`, cek konsol browser; bila tidak ada
pelanggaran CSP, ubah ke `"0"` agar memblokir. Bila menambah skrip/font/embed pihak ketiga, tambahkan domainnya di `worker/security.ts`.
Berkas admin lama (`web/public/admin/index.html`, `admin.js`) sudah dihapus; `npm run check:release` gagal bila muncul lagi.

## Jika halaman publik kosong / "Invalid API key"
`/api/public/content` memakai `SUPABASE_SERVICE_ROLE_KEY` (secret Worker). Bila kunci itu salah/tidak ada, Supabase membalas "Invalid API key".
Worker kini tidak meneruskan/men-cache respons error itu (halaman tampil dengan konten bawaan) dan mencatat `content <tabel> <status>` di `wrangler tail`.
Perbaiki: `npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY` dengan secret key dari Supabase → Settings → API Keys (`sb_secret_…` atau legacy `service_role`).

## Chatbot & CAPTCHA kontak
Lihat `docs/CHATBOT.md`. Binding baru di `wrangler.jsonc`: `ai` (Workers AI) dan `RATE_LIMITER_CHAT`.
