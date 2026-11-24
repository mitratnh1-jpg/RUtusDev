# RUtusdev — Fase 1 (Frontend + API Leads)

Struktur:
- `public/`   → situs statis (disajikan Cloudflare Assets)
- `worker/`   → Worker: `POST /api/leads`, `GET /api/health`
- `supabase/schema.sql` → tabel `leads`, `activity_logs` + RLS

## Admin CMS
- Dashboard: `/admin/` (login Supabase Auth; hanya user yang ada di `admin_profiles`).
- Isi `public/admin/config.js` dengan SUPABASE_URL + **anon** key (bukan service-role).
- Buat user di Supabase → Authentication, lalu jalankan insert `admin_profiles` (ada di akhir schema.sql).
- Buat bucket R2: `npx wrangler r2 bucket create rutusdev-media`.
- Konten terbit muncul di situs publik (cache ±60 dtk). Aktifkan MFA untuk akun admin.

## Setup
1. Supabase: buat proyek → SQL Editor → jalankan `supabase/schema.sql`.
2. Isi `SUPABASE_URL` dan `ALLOWED_ORIGIN` di `wrangler.jsonc`.
3. Cloudflare Turnstile: buat widget → tempel *site key* di `public/index.html`
   (`data-sitekey`), lalu simpan secret:
       npx wrangler secret put TURNSTILE_SECRET
       npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
4. Lokal: salin `.dev.vars.example` → `.dev.vars`, lalu `npm i && npm run dev`.
5. Deploy: `npm run deploy`.

## Keamanan yang sudah diterapkan
Service-role key hanya di secret Worker • RLS deny-by-default • validasi & batas ukuran di server •
Turnstile + honeypot • cek origin • batas 8 KB payload.

## Rate limit (disarankan)
Kode sudah mendukung binding `RATE_LIMITER`. Aktifkan lewat konfigurasi Rate Limiting Cloudflare
(lihat dokumentasi terbaru Workers), atau buat aturan Rate Limiting/WAF untuk `/api/leads`.

## Ganti placeholder
Nomor WhatsApp & email di `public/index.html`, konten contoh Work/testimoni/statistik.

## SEO & halaman publik
Worker merender `/articles`, `/articles/:slug`, `/work/:slug` (title, description, canonical, Open Graph,
JSON-LD), plus `/sitemap.xml` dan `/robots.txt`. Hanya konten berstatus terbit yang tampil; slug wajib
huruf kecil/angka/minus. Isi artikel & proyek ditampilkan sebagai teks biasa (paragraf dipisah baris kosong).
Pastikan `ALLOWED_ORIGIN` di wrangler.jsonc berisi domain final agar canonical & sitemap benar.
