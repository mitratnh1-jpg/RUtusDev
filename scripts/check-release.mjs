// Pengecekan sebelum rilis: gagal (exit 1) bila masih ada placeholder atau konfigurasi wajib yang belum ada.
// Jalankan: npm run check:release   (juga dijalankan otomatis oleh `npm run deploy`)
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const read = p => (existsSync(join(root, p)) ? readFileSync(join(root, p), 'utf8') : '');
const errors = [], warns = [];
const err = m => errors.push(m), warn = m => warns.push(m);

// wrangler.jsonc (komentar baris dibuang sebelum parse)
let w = {};
try { w = JSON.parse(read('wrangler.jsonc').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n')); }
catch (e) { err('wrangler.jsonc tidak bisa dibaca: ' + e.message); }
const v = w.vars || {};
const placeholder = s => !s || /GANTI/i.test(String(s));

// SUPABASE_URL / SUPABASE_ANON_KEY / TURNSTILE_SITE_KEY boleh TIDAK ada di wrangler.jsonc (disimpan sebagai Secret/variabel dashboard,
// lihat docs/ENV.md). Bila ada di sini, nilainya harus asli (bukan placeholder).
if ('SUPABASE_URL' in v && (placeholder(v.SUPABASE_URL) || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(v.SUPABASE_URL))) err('wrangler.jsonc: SUPABASE_URL placeholder/format salah. Hapus barisnya dan simpan sebagai Secret (docs/ENV.md).');
if ('SUPABASE_ANON_KEY' in v && placeholder(v.SUPABASE_ANON_KEY)) err('wrangler.jsonc: SUPABASE_ANON_KEY placeholder. Hapus barisnya dan simpan sebagai Secret (docs/ENV.md).');
if ('TURNSTILE_SITE_KEY' in v && placeholder(v.TURNSTILE_SITE_KEY)) err('wrangler.jsonc: TURNSTILE_SITE_KEY placeholder. Hapus barisnya (isi di dashboard) atau isi nilai asli.');
if (w.keep_vars !== true) err('wrangler.jsonc: set "keep_vars": true agar variabel dari dashboard tidak terhapus setiap deploy.');
if (w.ai?.binding !== 'AI') warn('wrangler.jsonc: binding "ai" (AI) tidak ada: chatbot hanya memakai FAQ bawaan, tanpa Workers AI.');
if (v.REQUIRE_MFA !== '1') warn('REQUIRE_MFA bukan "1": admin belum wajib MFA.');
if (!/^https:\/\//.test(v.ALLOWED_ORIGIN || '') || /example|localhost/.test(v.ALLOWED_ORIGIN)) err('wrangler.jsonc: ALLOWED_ORIGIN harus domain final (https://...).');

const rl = (w.ratelimits || []).map(x => x.name);
for (const n of ['RATE_LIMITER', 'RATE_LIMITER_ADMIN', 'RATE_LIMITER_CHAT']) if (!rl.includes(n)) err(`wrangler.jsonc: binding ratelimits "${n}" tidak ada.`);

// web/.env
const env = Object.fromEntries(read('web/.env').split('\n').filter(l => /^\w+=/.test(l)).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]));
if (placeholder(env.VITE_TURNSTILE_SITE_KEY)) err('web/.env: VITE_TURNSTILE_SITE_KEY belum diisi.');
else if ('TURNSTILE_SITE_KEY' in v && env.VITE_TURNSTILE_SITE_KEY !== v.TURNSTILE_SITE_KEY) err('Site key Turnstile di web/.env berbeda dengan wrangler.jsonc (TURNSTILE_SITE_KEY).');
if (/example|localhost/.test(env.VITE_SITE_URL || '') || !env.VITE_SITE_URL) err('web/.env: VITE_SITE_URL belum diisi.');

// Sisa admin lama di public/ akan menimpa admin React saat build
for (const f of ['web/public/admin/index.html', 'web/public/admin/admin.js']) if (existsSync(join(root, f))) err(`${f}: berkas admin lama, hapus (menimpa panel admin React di dist/admin).`);
if (v.DIAG === '1') warn('DIAG masih "1" (/api/diag aktif). Matikan setelah selesai diagnosis.');
if (v.CSP_REPORT_ONLY === '1') warn('CSP_REPORT_ONLY masih "1" (hanya melaporkan). Hapus variabel ini atau ubah ke "0" agar CSP memblokir.');

// Sisa konten/nomor contoh di kode
const BAD = [/6280000000000/, /Nama Klien/, /12\+\s*(?:<|Proyek|proyek)/, /Cepat di segala skala/, /GANTI\.supabase|GANTI_ANON|GANTI_DENGAN|GANTI_TURNSTILE/];
(function walk(d) {
  for (const f of readdirSync(join(root, d))) {
    const rel = join(d, f), st = statSync(join(root, rel));
    if (st.isDirectory()) { if (!['node_modules', 'dist', '.git', '.wrangler'].includes(f)) walk(rel); continue; }
    if (!/\.(tsx?|jsx?|html|css)$/.test(f)) continue;
    const t = read(rel);
    for (const re of BAD) if (re.test(t)) err(`${rel}: masih ada placeholder/konten contoh (${re.source}).`);
  }
})('web');
(function walk(d) { for (const f of readdirSync(join(root, d))) { const t = read(join(d, f)); for (const re of BAD) if (re.test(t)) err(`${join(d, f)}: placeholder (${re.source}).`); } })('worker');

// Peringatan (tidak menggagalkan)
if (v.CF_BEACON_TOKEN && !env.VITE_CF_BEACON_TOKEN) warn('Token Web Analytics belum lengkap: isi CF_BEACON_TOKEN (wrangler.jsonc) dan VITE_CF_BEACON_TOKEN (web/.env).');
else if (v.CF_BEACON_TOKEN && v.CF_BEACON_TOKEN !== env.VITE_CF_BEACON_TOKEN) warn('CF_BEACON_TOKEN dan VITE_CF_BEACON_TOKEN berbeda.');
warn('Secret tidak bisa dicek dari sini. Pastikan ada: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, TURNSTILE_SECRET (npx wrangler secret list, atau dashboard → Variables and Secrets).');
warn('Isi Admin → Pengaturan (WhatsApp, email, statistik) dan tambah testimoni asli bila sudah ada izin publikasi.');

warns.forEach(m => console.warn('⚠️  ' + m));
errors.forEach(m => console.error('✖  ' + m));
if (errors.length) { console.error(`\n${errors.length} masalah harus diperbaiki sebelum rilis.`); process.exit(1); }
console.log('\n✔ Pengecekan rilis lolos.');
