import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CHAT_QUICK_IDS, buildChatFaqs, matchFaq } from '../../shared/chatFaq';
import { useSectionTheme } from './useSectionTheme';

// Chatbot "Asisten RUtusdev" (pola mengikuti Asisten MUHIBA).
// - Tombol pertanyaan cepat dijawab langsung dari FAQ bawaan: tanpa server, tanpa AI, tanpa kuota.
// - Pertanyaan bebas dikirim ke POST /api/chat (Cloudflare Workers AI). Kuota habis / server sibuk / jaringan putus:
//   jawaban otomatis memakai FAQ bawaan.
// - Warna tombol dan jendela mengikuti bagian halaman di belakangnya (light / dark / blue), seperti header.

type Msg = { id: number; role: 'user' | 'bot'; text: string };
type Props = { wa: string; email: string; services: string[] };

const GREETING = 'Halo! Saya Asisten RUtusdev. Tanyakan seputar layanan, paket, proses kerja, atau cara memulai proyek. Untuk penawaran, kirim kebutuhan Anda lewat formulir Kontak.';
const MAX_INPUT = 300, TIMEOUT_MS = 25_000;
const REASON: Record<string, string> = {
  disabled: 'Mode FAQ (AI belum aktif)', quota: 'Mode FAQ (kuota AI harian habis)', error: 'Mode FAQ (AI sedang gangguan)',
  limit: 'Mode FAQ (terlalu banyak pesan)', offline: 'Mode FAQ (tidak dapat terhubung)',
};
const URL_RE = /(https?:\/\/[^\s)]+)/g;

// Teks biasa + tautan http(s) yang aman diklik. Tidak ada HTML mentah yang dirender.
function renderText(text: string): ReactNode[] {
  return text.split(URL_RE).map((part, i) => {
    if (!/^https?:\/\//.test(part)) return <Fragment key={i}>{part}</Fragment>;
    const url = part.replace(/[.,;:!?]+$/, '');
    return <Fragment key={i}><a href={url} target="_blank" rel="noopener noreferrer">{url}</a>{part.slice(url.length)}</Fragment>;
  });
}

const Icon = ({ d }: { d: string }) => <svg viewBox="0 0 24 24" aria-hidden="true" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
const CHAT_D = 'M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.5-4.6A8 8 0 1 1 21 12Z';
const SEND_D = 'M4 12 20 4l-4 16-4.5-6.5L4 12Zm7.5 1.5L20 4';
const CLOSE_D = 'M6 6l12 12M18 6 6 18';

export default function Chat({ wa, email, services }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [down, setDown] = useState<string | null>(null);  // alasan mode FAQ; null = AI normal
  const [msgs, setMsgs] = useState<Msg[]>([{ id: 0, role: 'bot', text: GREETING }]);
  const root = useRef<HTMLDivElement>(null), list = useRef<HTMLDivElement>(null), inp = useRef<HTMLInputElement>(null), fab = useRef<HTMLButtonElement>(null);
  const idRef = useRef(1), abortRef = useRef<AbortController | null>(null), userClosed = useRef(false);
  const theme = useSectionTheme(root);

  const svcKey = services.join('|');
  const faqs = useMemo(() => buildChatFaqs({ wa, email, services }), [wa, email, svcKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const quick = useMemo(() => CHAT_QUICK_IDS.map(id => faqs.find(f => f.id === id)).filter((f): f is NonNullable<typeof f> => !!f), [faqs]);

  useEffect(() => { if (open) inp.current?.focus(); else if (userClosed.current) { userClosed.current = false; fab.current?.focus(); } }, [open]);
  useEffect(() => { const el = list.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs, loading, open]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const push = (role: Msg['role'], text: string) => setMsgs(m => [...m, { id: idRef.current++, role, text }]);
  const close = () => { userClosed.current = true; setOpen(false); };

  const askQuick = (id: string) => {
    if (loading) return;
    const f = faqs.find(x => x.id === id);
    if (f) { push('user', f.q); push('bot', f.a); }
  };

  async function send() {
    const text = input.replace(/\s+/g, ' ').trim().slice(0, MAX_INPUT);
    if (!text || loading) return;
    setInput('');
    const history = msgs.filter(m => m.id !== 0).slice(-5).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text.slice(0, 400) }));  // server juga memotong 400; ini menghemat ukuran permintaan
    push('user', text);
    const local = (note?: string) => {
      const f = matchFaq(text, faqs);
      push('bot', f ? f.a : `${note ?? 'Maaf, asisten belum bisa menjawab pertanyaan bebas.'} Silakan pilih pertanyaan cepat di bawah atau kirim kebutuhan Anda lewat formulir Kontak.`);
    };
    setLoading(true);
    abortRef.current?.abort();
    const ac = new AbortController(); abortRef.current = ac;
    const timer = window.setTimeout(() => ac.abort(), TIMEOUT_MS);
    try {
      const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [...history, { role: 'user', content: text }] }), signal: ac.signal });
      if (r.status === 429) { setDown('limit'); return local('Terlalu banyak pesan dalam waktu singkat.'); }
      const d = await r.json().catch(() => null);
      if (!r.ok || typeof d?.reply !== 'string' || !d.reply) { setDown('error'); return local(); }
      setDown(d.mode === 'faq' ? (typeof d.reason === 'string' ? d.reason : 'error') : null);
      push('bot', d.reply);
    } catch {
      if (ac.signal.aborted && abortRef.current !== ac) return;  // digantikan permintaan baru
      setDown('offline'); local();
    } finally { window.clearTimeout(timer); setLoading(false); }
  }

  const waUrl = wa ? `https://wa.me/${wa}?text=${encodeURIComponent('Halo RUtusdev, saya ingin bertanya tentang layanan.')}` : '';

  return (
    <div className={`chat${open ? ' is-open' : ''}`} data-theme={theme} ref={root}>
      {!open ? (
        <button ref={fab} type="button" className="chat-fab" onClick={() => setOpen(true)} aria-label="Buka chat: tanya asisten RUtusdev" aria-expanded="false" aria-controls="chat-panel">
          <span className="chat-ic"><Icon d={CHAT_D} /></span>
          <span className="chat-fab-tx"><b>Tanya RUtusdev</b><small>Asisten &amp; konsultasi</small></span>
        </button>
      ) : (
        <div id="chat-panel" className="chat-panel" role="dialog" aria-label="Chat Asisten RUtusdev" onKeyDown={e => { if (e.key === 'Escape') close(); }}>
          <div className="chat-head">
            <span className="chat-ic"><Icon d={CHAT_D} /></span>
            <div className="chat-ttl"><b>Asisten RUtusdev</b><small>{down ? REASON[down] ?? REASON.error : 'Rancang. Bangun. Luncurkan.'}</small></div>
            <button type="button" className="chat-x" onClick={close} aria-label="Tutup chat"><Icon d={CLOSE_D} /></button>
          </div>
          <div className="chat-list" ref={list} aria-live="polite">
            {msgs.map(m => <div key={m.id} className={`chat-msg ${m.role}`}>{m.role === 'bot' ? renderText(m.text) : m.text}</div>)}
            {loading && <div className="chat-msg bot chat-typing" role="status" aria-label="Asisten sedang mengetik"><i /><i /><i /></div>}
          </div>
          <div className="chat-foot">
            <div className="chat-chips" aria-label="Pertanyaan cepat">
              <a className="chat-chip cta" href="#contact" onClick={close}>Buka formulir</a>
              {waUrl && <a className="chat-chip cta" href={waUrl} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
              {quick.map(f => <button key={f.id} type="button" className="chat-chip" disabled={loading} onClick={() => askQuick(f.id)}>{f.q}</button>)}
            </div>
            <div className="chat-row">
              <input ref={inp} className="chat-in" value={input} maxLength={MAX_INPUT} placeholder="Ketik pertanyaan…" aria-label="Ketik pertanyaan"
                onChange={e => setInput(e.target.value.slice(0, MAX_INPUT))}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }} />
              <button type="button" className="chat-send" onClick={() => void send()} disabled={loading || !input.trim()} aria-label="Kirim pertanyaan"><Icon d={SEND_D} /></button>
            </div>
            <p className="chat-note">Jawaban AI bisa keliru. Harga ditentukan setelah konsultasi. Jangan menulis data pribadi.</p>
          </div>
        </div>
      )}
    </div>
  );
}
