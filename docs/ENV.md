# Strategi variabel lingkungan (env) agar tidak hilang

## Mengapa env "hilang" setiap deploy
`wrangler.jsonc` adalah sumber kebenaran. Setiap `wrangler deploy` (termasuk dari Cloudflare Workers Builds) **mengganti seluruh set variabel**
di dashboard dengan blok `"vars"` di berkas itu. Variabel yang hanya Anda isi lewat dashboard ikut terhapus, atau tertimpa placeholder `GANTI…`.
Cloudflare memberi tanda lewat banner "Update your Wrangler configuration with these changes to keep deployments in sync."
**Secret berbeda:** disimpan terpisah, tidak pernah ditimpa atau dihapus oleh deploy.

## Aturan yang dipakai proyek ini
| Jenis | Tempat | Contoh |
|---|---|---|
| Flag operasional, tidak rahasia | `wrangler.jsonc` → `vars` (ikut git) | `ALLOWED_ORIGIN`, `REQUIRE_MFA`, `CSP_REPORT_ONLY`, `DIAG` |
| Mengungkap backend / data pribadi | **Secret** (tidak ikut git, tidak tampak lagi setelah disimpan) | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NOTIFY_TO`, `SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET`, `RESEND_API_KEY`, `NOTIFY_WEBHOOK_URL`, `CF_API_TOKEN` |
| Publik tapi bukan bagian git | Variabel biasa di dashboard (dilindungi `keep_vars`) | `TURNSTILE_SITE_KEY`, `NOTIFY_FROM`, `CF_ZONE_ID`, `CF_BEACON_TOKEN` |

`"keep_vars": true` (sudah ada di `wrangler.jsonc`) menjaga variabel dashboard yang tidak ditulis di berkas itu. Catatan: variabel yang **ada** di
`wrangler.jsonc` tetap menimpa nilai dashboard, jadi ubah nilainya di berkas itu, bukan di dashboard.

## Langkah sekali jalan (bisa dari HP, lewat dashboard)
1. Deploy versi ini dulu. Variabel di dashboard tidak lagi terhapus.
2. Dashboard → Workers & Pages → `rutusdev` → Settings → **Variables and Secrets**.
3. Untuk `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NOTIFY_TO`: hapus variabelnya, lalu **Add** dengan **Type: Secret**, nama sama, tempel nilai, lalu **Deploy**.
   Lakukan berurutan dan cepat (sekitar satu menit situs menampilkan konten kosong bila `SUPABASE_URL` sedang tidak ada).
   Simpan nilainya di password manager: Secret tidak bisa dilihat lagi.
4. Pastikan `SUPABASE_SERVICE_ROLE_KEY` dan `TURNSTILE_SECRET` bertipe **Secret**, bukan Variable.
5. Cek: lakukan satu deploy dari git, lalu buka lagi halaman Variables and Secrets. Semua entri harus masih ada.

Lewat terminal (alternatif): `npx wrangler secret put SUPABASE_URL` (ulangi untuk nama lain), cek dengan `npx wrangler secret list`.

## Variabel build (VITE_*)
`web/.env` dibaca saat build, bukan saat runtime. Isinya publik (masuk ke JavaScript situs), jadi boleh di git. Alternatifnya, isi di dashboard →
Settings → **Build** → Variables and secrets (`VITE_TURNSTILE_SITE_KEY`, `VITE_SITE_URL`, `VITE_CF_BEACON_TOKEN`); Vite membacanya otomatis.

## Yang dilakukan agar backend sulit ditebak crawler
- `/admin/config.js` kini hanya memuat site key Turnstile (publik). Alamat Supabase dan anon key tidak lagi disajikan ke siapa pun.
- `robots.txt` tidak lagi mendaftarkan `/admin/` dan `/api/`. Gantinya, header `X-Robots-Tag: noindex, nofollow, noarchive` di semua respons `/admin/*` dan `/api/*`.
- `/api/diag` mati (`DIAG=0`), respons error bersifat generik.

Batasnya, supaya tidak keliru: situs tetap tampak berjalan di Cloudflare (header `server`), jalur `/api/*` yang dipanggil JavaScript situs
tetap bisa ditemukan, dan bentuk JSON publik terlihat. Keamanan sebenarnya bertumpu pada RLS Supabase, autentikasi + MFA, Turnstile, dan rate limit,
bukan pada kerahasiaan. Karena `SUPABASE_URL` dan anon key sempat tersaji publik lewat `config.js`, anggap keduanya sudah diketahui orang; pastikan RLS aktif di semua tabel
dan, bila ingin, ganti anon key (publishable) di Supabase → Settings → API Keys.
