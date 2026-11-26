/**
 * Pencarian ringan untuk chatbot (BM25 di memori Worker): memilih potongan informasi situs yang paling relevan
 * dengan pertanyaan, supaya AI mendapat bahan yang tepat, bukan satu ringkasan tetap yang sudah terpotong.
 * Gratis: tidak memakai layanan luar, model embedding, maupun kuota AI. Murni fungsi (mudah diuji).
 */

export interface ChatChunk {
  id: string;
  /** Asal informasi, mis. "Layanan", "Karya", "Artikel". Dipakai sebagai label di prompt. */
  source: string;
  title: string;
  text: string;
  /** Kata kunci tambahan (opsional). */
  keywords?: string;
}

export interface ChatHit {
  chunk: ChatChunk;
  score: number;
  /** Jumlah kata pertanyaan yang cocok. */
  matched: number;
}

const STOPWORDS = new Set(
  (
    'yang dan di ke dari untuk dengan pada ini itu apa siapa bagaimana berapa kapan dimana mana adalah ada saya kami kita anda ' +
    'bisa dapat apakah tentang atau juga akan sudah belum tidak bukan sebagai oleh dalam para si sang nya lah kah pun ' +
    'mohon tolong minta info informasi tanya bertanya kak min admin halo hai assalamualaikum selamat pagi siang sore malam ' +
    'ya iya gak ngga nggak dong sih deh kok saja aja lagi masih mau ingin boleh bolehkah gimana kenapa mengapa'
  ).split(' ')
);

const SUFFIXES = ['kan', 'lah', 'kah', 'nya', 'an', 'i'];
const PREFIXES = ['meng', 'meny', 'peng', 'peny', 'mem', 'men', 'pem', 'pen', 'ber', 'ter', 'per', 'me', 'pe', 'di', 'ke', 'se'];

/** Pemotongan imbuhan sederhana; diterapkan sama pada pertanyaan dan dokumen, jadi cukup untuk mencocokkan. */
export function stem(word: string): string {
  let w = word;
  // Sampai dua akhiran berurutan (mis. "bayarannya" -> "bayaran" -> "bayar") agar sama dengan "bayaran"/"membayar".
  for (let pass = 0; pass < 2; pass++) {
    if (w.length <= 5) break;
    const s = SUFFIXES.find((x) => w.endsWith(x) && w.length - x.length >= 4);
    if (!s) break;
    w = w.slice(0, -s.length);
  }
  if (w.length > 5) {
    for (const p of PREFIXES) {
      if (w.startsWith(p) && w.length - p.length >= 4) {
        w = w.slice(p.length);
        break;
      }
    }
  }
  return w;
}

export function tokenize(text: string): string[] {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t))
    .map(stem);
}

interface Indexed {
  chunk: ChatChunk;
  tf: Map<string, number>;
  len: number;
  titleTokens: Set<string>;
  keywordTokens: Set<string>;
}

export interface ChatIndex {
  docs: Indexed[];
  df: Map<string, number>;
  avgLen: number;
}

export function buildIndex(chunks: ChatChunk[]): ChatIndex {
  const docs: Indexed[] = [];
  const df = new Map<string, number>();
  let total = 0;
  for (const chunk of chunks) {
    const titleTokens = new Set(tokenize(chunk.title));
    const keywordTokens = new Set(tokenize(chunk.keywords ?? ''));
    // Judul dihitung dua kali supaya topik lebih menentukan daripada kata yang kebetulan muncul di isi.
    const tokens = [...tokenize(chunk.title), ...tokenize(chunk.title), ...tokenize(chunk.text), ...tokenize(chunk.keywords ?? '')];
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    for (const t of tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
    docs.push({ chunk, tf, len: tokens.length, titleTokens, keywordTokens });
    total += tokens.length;
  }
  return { docs, df, avgLen: docs.length ? total / docs.length : 1 };
}

const K1 = 1.4;
const B = 0.75;

export function search(index: ChatIndex, query: string, limit = 6): ChatHit[] {
  const q = Array.from(new Set(tokenize(query)));
  if (!q.length || !index.docs.length) return [];
  const n = index.docs.length;
  const hits: ChatHit[] = [];
  for (const d of index.docs) {
    let score = 0;
    let matched = 0;
    for (const term of q) {
      const f = d.tf.get(term);
      if (!f) continue;
      matched++;
      const df = index.df.get(term) ?? 0;
      const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
      score += idf * ((f * (K1 + 1)) / (f + K1 * (1 - B + (B * d.len) / index.avgLen)));
      if (d.titleTokens.has(term)) score += idf * 0.8;
      if (d.keywordTokens.has(term)) score += idf * 1.2;
    }
    if (matched > 0) hits.push({ chunk: d.chunk, score: score * (1 + 0.15 * (matched - 1)), matched });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}

/** Susun potongan terbaik menjadi teks untuk prompt, dibatasi total karakter. */
export function formatHits(hits: ChatHit[], maxChars: number): string {
  const lines: string[] = [];
  let used = 0;
  for (const h of hits) {
    const head = h.chunk.title ? `${h.chunk.source} - ${h.chunk.title}` : h.chunk.source;
    const room = maxChars - used - head.length - 6;
    if (room < 80) break;
    const body = h.chunk.text.length > room ? `${h.chunk.text.slice(0, room - 1).trimEnd()}…` : h.chunk.text;
    const line = `[${head}] ${body}`;
    lines.push(line);
    used += line.length + 1;
  }
  return lines.join('\n');
}
