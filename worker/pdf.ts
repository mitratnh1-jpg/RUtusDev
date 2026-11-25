// PDF penawaran & faktur dibuat di server (pdf-lib, font standar PDF) sehingga tidak bergantung pada cetak browser.
// Tata letak mengikuti web/public/admin/cetak.html: kop, penerima, tanggal, tabel rincian, total, catatan.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

export type PdfItem = { desc: string; qty: number; price: number };
export type PdfInput = {
  type: 'proposal' | 'invoice';
  doc: { number: string; title: string; created_at?: string; valid_until?: string | null; issue_date?: string | null; due_date?: string | null;
    paid_amount?: number | string | null; notes?: string | null; scope?: string | null; terms?: string | null; items: PdfItem[] };
  to: { org?: string; contact?: string; email?: string };
  site: { email?: string; whatsapp?: string };
};

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
export const rupiah = (n: number) => 'Rp ' + Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
export const tanggal = (d?: string | null) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || '');
  return m ? `${Number(m[3])} ${BULAN[Number(m[2]) - 1]} ${m[1]}` : '-';
};
const angka = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');

const INK = rgb(0.07, 0.08, 0.11), DIM = rgb(0.42, 0.44, 0.48), LINE = rgb(0.89, 0.89, 0.91), SKY = rgb(0.22, 0.74, 0.97);
const W = 595, H = 842, M = 48, R = W - M;

export async function buildPdf(inp: PdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const reg = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const sets = new Map<PDFFont, Set<number>>([[reg, new Set(reg.getCharacterSet())], [bold, new Set(bold.getCharacterSet())]]);
  // Karakter di luar set font standar (emoji, aksara non-Latin) diganti "?" agar pembuatan PDF tidak gagal.
  const safe = (s: unknown, f: PDFFont) => [...String(s ?? '').replace(/[\r\t]/g, ' ')].map(c => (c === '\n' || sets.get(f)!.has(c.codePointAt(0)!) ? c : '?')).join('');
  const wrap = (text: string, f: PDFFont, size: number, max: number) => {
    const out: string[] = [];
    for (const para of safe(text, f).split('\n')) {
      let line = '';
      for (const word of para.split(' ')) {
        let w = word;
        while (f.widthOfTextAtSize(w, size) > max) { // kata sangat panjang dipotong
          let i = w.length; while (i > 1 && f.widthOfTextAtSize(w.slice(0, i), size) > max) i--;
          if (line) { out.push(line); line = ''; }
          out.push(w.slice(0, i)); w = w.slice(i);
        }
        const t = line ? line + ' ' + w : w;
        if (f.widthOfTextAtSize(t, size) <= max) line = t; else { out.push(line); line = w; }
      }
      out.push(line);
    }
    return out;
  };

  let page: PDFPage = pdf.addPage([W, H]), y = H - M;
  const text = (s: string, x: number, size = 10, f = reg, color = INK, align: 'l' | 'r' = 'l') => {
    const t = safe(s, f), w = f.widthOfTextAtSize(t, size);
    page.drawText(t, { x: align === 'r' ? x - w : x, y, size, font: f, color });
  };
  const newPage = () => { page = pdf.addPage([W, H]); y = H - M; };
  const need = (h: number) => { if (y - h < M + 30) newPage(); };
  const rule = (th = 0.5, color = LINE) => page.drawLine({ start: { x: M, y }, end: { x: R, y }, thickness: th, color });

  const inv = inp.type === 'invoice', d = inp.doc;
  // Kop
  text('RUtusdev', M, 22, bold); page.drawText('.', { x: M + bold.widthOfTextAtSize('RUtusdev', 22), y, size: 22, font: bold, color: SKY });
  text(inv ? 'FAKTUR' : 'PENAWARAN', R, 22, reg, INK, 'r');
  y -= 14; text('Studio pengembangan digital', M, 9, reg, DIM); text(d.number, R, 10, reg, INK, 'r');
  y -= 12; rule(1.5, INK); y -= 26;

  // Penerima & tanggal
  const top = y;
  text('Ditujukan kepada', M, 8, reg, DIM); y -= 14;
  text(inp.to.org || inp.to.contact || '-', M, 11, bold);
  if (inp.to.org && inp.to.contact) { y -= 13; text('u.p. ' + inp.to.contact, M, 10); }
  if (inp.to.email) { y -= 13; text(inp.to.email, M, 10); }
  const bottomLeft = y; y = top;
  const cx = W / 2 + 20;
  const kv = (k: string, v: string) => { text(k, cx, 8, reg, DIM); y -= 13; text(v, cx, 10); y -= 15; };
  if (inv) { kv('Tanggal terbit', tanggal(d.issue_date)); kv('Jatuh tempo', tanggal(d.due_date)); }
  else { kv('Tanggal', tanggal(d.created_at)); kv('Berlaku hingga', tanggal(d.valid_until)); }
  y = Math.min(bottomLeft, y) - 14;

  for (const l of wrap(d.title, bold, 13, R - M)) { need(18); text(l, M, 13, bold); y -= 18; }
  y -= 4;

  // Tabel rincian
  const cNo = M + 4, cDesc = M + 30, cQty = 355, cPrice = 440, cSub = R - 4, descW = cQty - cDesc - 40;
  const head = () => { need(30); text('No', cNo, 8, bold); text('Deskripsi', cDesc, 8, bold); text('Jml', cQty, 8, bold, INK, 'r'); text('Harga satuan', cPrice, 8, bold, INK, 'r'); text('Subtotal', cSub, 8, bold, INK, 'r'); y -= 8; rule(0.8, INK); y -= 14; };
  head();
  let total = 0;
  if (!d.items.length) { text('Belum ada rincian.', cDesc, 10, reg, DIM); y -= 18; }
  d.items.forEach((it, i) => {
    const lines = wrap(it.desc, reg, 10, descW), h = lines.length * 13 + 8;
    if (y - h < M + 30) { newPage(); head(); }
    const sub = it.qty * it.price; total += sub;
    text(String(i + 1), cNo, 10); text(angka(it.qty), cQty, 10, reg, INK, 'r'); text(rupiah(it.price), cPrice, 10, reg, INK, 'r'); text(rupiah(sub), cSub, 10, reg, INK, 'r');
    lines.forEach((l, j) => { if (j) y -= 13; text(l, cDesc, 10); });
    y -= 6; rule(); y -= 14;
  });

  // Total
  const paid = Number(d.paid_amount) || 0, rows: [string, string, boolean][] = [['Total', rupiah(total), true]];
  if (inv) rows.push(['Sudah dibayar', rupiah(paid), false], ['Sisa tagihan', rupiah(Math.max(0, total - paid)), false]);
  need(rows.length * 20 + 10);
  rows.forEach(([k, v, big]) => { if (big) { rule(1.2, INK); y -= 16; } text(k, cPrice, big ? 12 : 10, big ? bold : reg, INK, 'r'); text(v, cSub, big ? 12 : 10, big ? bold : reg, INK, 'r'); y -= big ? 20 : 16; });

  // Catatan / lingkup / syarat
  const block = (title: string, body?: string | null) => {
    if (!body || !body.trim()) return;
    y -= 10; need(40); text(title, M, 11, bold); y -= 16;
    for (const l of wrap(body, reg, 10, R - M)) { need(14); text(l, M, 10); y -= 13; }
  };
  if (inv) block('Catatan pembayaran', d.notes); else { block('Ruang lingkup pekerjaan', d.scope); block('Syarat & ketentuan', d.terms); }

  // Kaki halaman (di setiap halaman)
  const foot = ['RUtusdev', inp.site.email, inp.site.whatsapp ? 'WhatsApp ' + inp.site.whatsapp : ''].filter(Boolean).join(' · ');
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    page = p; y = M - 8;
    text(foot, M, 8, reg, DIM); text(`${d.number} · Halaman ${i + 1}/${pages.length}`, R, 8, reg, DIM, 'r');
  });
  pdf.setTitle(`${inv ? 'Faktur' : 'Penawaran'} ${d.number}`.slice(0, 200)); pdf.setProducer('RUtusdev'); pdf.setCreator('RUtusdev');
  return pdf.save();
}
