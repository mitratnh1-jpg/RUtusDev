// FAQ bawaan chatbot RUtusdev (data murni). Dipakai bersama oleh:
//  - browser (web/src/Chat.tsx): tombol pertanyaan cepat dijawab LANGSUNG dari sini (tanpa server, tanpa AI, tanpa kuota)
//    dan jadi cadangan bila server/AI tidak bisa dihubungi;
//  - Worker (worker/chat.ts): jawaban cadangan bila Workers AI mati, kuota habis, atau error.
// Jawaban sengaja TIDAK memuat angka harga, durasi, atau janji yang tidak tertulis di situs.
import { PACKAGES, REPLY_TIME, SECURITY_POINTS, SERVICE_KINDS, STACK, STEPS } from './siteFacts';

export interface ChatContext { wa: string; email: string; services: string[] }
// boost: pengali skor. Kata niat (harga, durasi) harus mengalahkan kata topik (website, aplikasi) yang sering ikut muncul di kalimat yang sama.
export interface ChatFaq { id: string; q: string; a: string; keywords: string[]; boost?: number }

export const CHAT_QUICK_IDS = ['layanan', 'paket', 'harga', 'proses', 'mulai', 'kontak'] as const;

const list = (a: string[]) => (a.length <= 1 ? a.join('') : `${a.slice(0, -1).join(', ')}, dan ${a[a.length - 1]}`);

export function buildChatFaqs(ctx: ChatContext): ChatFaq[] {
  const contact = [ctx.wa ? `WhatsApp +${ctx.wa}` : '', ctx.email ? `email ${ctx.email}` : ''].filter(Boolean).join(' atau ');
  const svc = ctx.services.length ? ` Layanan yang tampil di situs: ${list(ctx.services.slice(0, 8))}.` : '';
  return [
    {
      id: 'layanan', q: 'Layanan apa saja?',
      a: `RUtusdev membangun ${list(SERVICE_KINDS)}.${svc} Ceritakan kebutuhan Anda lewat formulir di bagian Kontak.`,
      // Kata kerja umum (bikin, membuat) sengaja tidak dipakai: sering menyertai pertanyaan harga/proses dan mengalahkan niat sebenarnya.
      keywords: ['layanan', 'jasa', 'website', 'web app', 'aplikasi', 'landing page', 'sistem informasi', 'custom', 'crm'],
    },
    {
      id: 'paket', q: 'Paket yang tersedia',
      a: `Ada tiga paket indikatif:\n${PACKAGES.map(p => `• ${p.n} (${p.pr}): ${p.d}`).join('\n')}\n\nPaket bisa disesuaikan setelah diskusi kebutuhan.`,
      keywords: ['paket', 'pilihan', 'mulai studio', 'studio', 'cms', 'perbedaan', 'jenis'],
    },
    {
      id: 'harga', q: 'Berapa biayanya?',
      a: `Harga ditentukan setelah diskusi kebutuhan; paket di situs bersifat indikatif dan belum memuat angka tetap. Untuk penawaran, kirim ringkasan kebutuhan lewat formulir Kontak${ctx.wa ? ' atau WhatsApp' : ''}.`,
      keywords: ['harga', 'biaya', 'tarif', 'bayar', 'pembayaran', 'berapa', 'murah', 'mahal', 'budget', 'anggaran', 'penawaran', 'quotation', 'invoice', 'faktur', ' dp '],
      boost: 1.6,
    },
    {
      id: 'durasi', q: 'Berapa lama pengerjaannya?',
      a: `Lama pengerjaan bergantung pada lingkup dan kebutuhan Anda, jadi ditentukan setelah diskusi (tahap Konsultasi). Kirim ringkasan kebutuhan lewat formulir Kontak${ctx.wa ? ' atau WhatsApp' : ''} agar kami bisa memberi gambaran.`,
      keywords: ['berapa lama', 'durasi', 'lama pengerjaan', 'waktu pengerjaan', 'kapan selesai', 'estimasi waktu', 'timeline', 'deadline', 'jadwal', 'secepat', 'selesai', 'berapa hari', 'berapa minggu', 'berapa bulan'],
      boost: 1.6,
    },
    {
      id: 'proses', q: 'Bagaimana proses kerjanya?',
      a: `Alurnya ${STEPS.length} tahap:\n${STEPS.map(([b, p], i) => `${i + 1}. ${b}: ${p}`).join('\n')}`,
      keywords: ['proses', 'alur', 'alur kerja', 'proses kerja', 'tahap', 'tahapan', 'cara kerja', 'langkah', 'workflow', 'konsultasi', 'desain', 'peluncuran', 'rilis'],
    },
    {
      id: 'mulai', q: 'Cara memulai proyek',
      a: `Isi formulir di bagian Kontak: nama, email, jenis layanan, dan ringkasan kebutuhan. Kami membalas dalam ${REPLY_TIME}.${contact ? ` Bisa juga lewat ${contact}.` : ''}`,
      keywords: ['mulai', 'memulai', 'cara pesan', 'pesan', 'order', 'konsultasi', 'daftar', 'hubungi', 'form', 'formulir', 'ajukan', 'minta'],
    },
    {
      id: 'teknologi', q: 'Teknologi apa yang dipakai?',
      a: `Stack yang dipakai: ${list(STACK)}. Standarnya terbuka sehingga mudah dirawat.`,
      keywords: ['teknologi', 'stack', 'react', 'vite', 'typescript', 'cloudflare', 'supabase', 'framework', 'bahasa pemrograman', 'database', 'hosting', 'wordpress'],
    },
    {
      id: 'keamanan', q: 'Bagaimana soal keamanan?',
      a: `Praktik keamanan yang diterapkan:\n${SECURITY_POINTS.map(s => `• ${s}`).join('\n')}`,
      keywords: [' aman ', 'amankah', 'datanya', 'keamanan', 'security', 'rls', 'turnstile', 'captcha', 'spam', 'bot', 'rahasia', 'data saya', 'privasi', 'backup', 'cadangan'],
    },
    {
      id: 'karya', q: 'Contoh karya',
      a: 'Contoh proyek ada di bagian Karya pada halaman ini, dan tulisan terbaru ada di bagian Artikel.',
      keywords: ['karya', 'portofolio', 'portfolio', 'contoh', 'proyek', 'project', 'klien', 'artikel', 'blog'],
    },
    {
      id: 'kontak', q: 'Kontak & waktu balasan',
      a: `Balasan pertama dalam ${REPLY_TIME}.${contact ? ` Hubungi ${contact}.` : ' Gunakan formulir di bagian Kontak.'}`,
      keywords: ['kontak', 'telepon', 'telpon', 'whatsapp', ' wa ', 'nomor', 'email', 'surel', 'balas', 'respon', 'jam kerja', 'alamat'],
    },
  ];
}

export function normalizeChatText(text: string): string {
  return ` ${String(text || '').toLowerCase().replace(/[^a-z0-9\u00c0-\u024f]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
}

const MATCH_THRESHOLD = 5; // skor tertinggi harus mencapai ambang ini agar dianggap cocok

// Cari FAQ yang paling cocok dengan teks bebas; null bila tidak ada yang meyakinkan.
export function matchFaq(text: string, faqs: ChatFaq[]): ChatFaq | null {
  const norm = normalizeChatText(text);
  if (norm.trim().length < 2) return null;
  let best: ChatFaq | null = null, bestScore = 0;
  for (const faq of faqs) {
    let score = 0;
    for (const kw of faq.keywords) {
      const needle = kw.startsWith(' ') || kw.endsWith(' ') ? kw : kw.trim();
      if (needle && norm.includes(needle)) score += kw.trim().length;
    }
    score *= faq.boost ?? 1;
    if (score > bestScore) { best = faq; bestScore = score; }
  }
  return bestScore >= MATCH_THRESHOLD ? best : null;
}
