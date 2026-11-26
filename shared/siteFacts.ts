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
  { n: 'Mulai', pr: 'Landing page', d: 'Satu halaman, formulir konsultasi, dan SEO dasar. Cocok untuk memvalidasi ide dengan cepat.' },
  { n: 'Studio', pr: 'Website + CMS', d: 'Layanan, portofolio, artikel, prospek, dan pustaka media yang bisa Anda kelola sendiri.' },
  { n: 'Custom', pr: 'Aplikasi web', d: 'CRM, alur penjualan, penawaran, dan faktur yang mengikuti proses kerja Anda.' },
];
export const SECURITY_POINTS = [
  'Akses data ditolak secara bawaan (RLS)',
  'Turnstile dan honeypot di formulir',
  'Batas ukuran dan laju permintaan',
  'Rahasia hanya tersimpan di Worker',
];
export const SERVICE_KINDS = ['website dan landing page', 'aplikasi web', 'sistem informasi', 'aplikasi custom'];
export const REPLY_TIME = '1×24 jam kerja';
