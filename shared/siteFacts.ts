// Fakta situs yang dipakai bersama oleh halaman (web/src/App.tsx), chatbot di browser, dan Worker (worker/chat.ts).
// Satu sumber agar jawaban chatbot tidak berbeda dari isi halaman. Murni data: tanpa React, DOM, maupun API Worker.
export const STEPS: [string, string][] = [
  ['Konsultasi', 'Positioning, layanan, struktur halaman, dan konten.'],
  ['Desain', 'Design token, komponen, dan prototipe responsif.'],
  ['Pengembangan', 'Frontend, CMS, API, dan pustaka media.'],
  ['Peluncuran', 'SEO, keamanan, uji kualitas, cadangan data, dan rilis.'],
];
export const STACK = ['React', 'Vite', 'TypeScript', 'Cloudflare Workers', 'Supabase', 'R2'];
export const PACKAGES = [
  { n: 'Mulai', pr: 'Rp300.000 – Rp1.250.000', d: 'Landing page satu halaman, formulir konsultasi, dan SEO dasar. Cocok untuk memvalidasi ide dengan cepat. Company profile dan katalog produk tersedia mulai Rp1.000.000.', href: '/layanan/website-statis' },
  { n: 'Studio', pr: 'Rp2.000.000 – Rp8.000.000', d: 'Website + CMS: layanan, portofolio, artikel, dan data yang bisa Anda kelola sendiri lewat panel admin, dari login sederhana sampai multi-role dan laporan.', href: '/layanan/website-dinamis' },
  { n: 'Custom', pr: 'Rp1.000.000 – Rp12.000.000', d: 'Aplikasi web: absensi, pendaftaran online, inventaris, keuangan, CRM, sekolah, LMS, hingga sistem custom (Rp8–15 juta+). Harga mengikuti kompleksitas dan fitur. Toko online mulai Rp3.000.000.', href: '/layanan/aplikasi-web' },
];
// Biaya berulang opsional (dari katalog): cloud/server dan pemeliharaan.
export const RECURRING = ['Cloud: Rp0 (website ringan) hingga Rp350.000+/bulan', 'Pemeliharaan: Rp75.000 – Rp350.000/bulan', 'Domain dibeli terpisah atas nama Anda'];
export const SECURITY_POINTS = [
  'Akses data ditolak secara bawaan (RLS)',
  'Turnstile dan honeypot di formulir',
  'Batas ukuran dan laju permintaan',
  'Rahasia hanya tersimpan di Worker',
];
export const SERVICE_KINDS = ['website dan landing page', 'aplikasi web', 'sistem informasi', 'aplikasi custom'];
export const REPLY_TIME = '1×24 jam kerja';
