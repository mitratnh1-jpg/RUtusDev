import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CHAT_QUICK_IDS, buildChatFaqs, matchFaq } from '../../shared/chatFaq';
import { useSectionTheme } from './useSectionTheme';
import { onScrollFrame } from './scroll';

// Chatbot "Asisten RUtusdev" (pola mengikuti Asisten MUHIBA).
// - Tombol pertanyaan cepat dijawab langsung dari FAQ bawaan: tanpa server, tanpa AI, tanpa kuota.
// - Pertanyaan bebas dikirim ke POST /api/chat (Cloudflare Workers AI). Kuota habis / server sibuk / jaringan putus:
//   jawaban otomatis memakai FAQ bawaan.
// - Warna tombol dan jendela mengikuti bagian halaman di belakangnya (light / dark / blue), seperti header.
// - Tombol dan jendela BARU tampil setelah pengunjung menggulir keluar dari Hero (Hero bersih dari chatbot); kembali ke Hero = disembunyikan lagi.
// - Suara: mikrofon (pengenalan suara peramban, id-ID) mengisi kolom ketik; jawaban bisa dibacakan (speechSynthesis).
//   Keduanya hanya muncul bila peramban mendukung. Butuh Permissions-Policy microphone=(self) (web/public/_headers dan worker/security.ts).

type Msg = { id: number; role: 'user' | 'bot'; text: string };
type Props = { wa: string; email: string; services: string[] };

const GREETING = 'Halo! Saya Asisten RUtusdev. Tanyakan seputar layanan, paket, proses kerja, atau cara memulai proyek. Untuk penawaran, kirim kebutuhan Anda lewat formulir Kontak.';
const MAX_INPUT = 300, TIMEOUT_MS = 25_000;
const REASON: Record<string, string> = {
  disabled: 'Mode FAQ (AI belum aktif)', quota: 'Mode FAQ (kuota AI harian habis)', error: 'Mode FAQ (AI sedang gangguan)',
  limit: 'Mode FAQ (terlalu banyak pesan)', offline: 'Mode FAQ (tidak dapat terhubung)',
};
const URL_RE = /(https?:\/\/[^\s)]+)/g;

// ---- Suara ----
const AUTO_SEND_VOICE = false;  // true = hasil ucapan langsung dikirim; false = tampil di kolom ketik agar bisa dicek dulu
const w = typeof window !== 'undefined' ? (window as any) : undefined;
const SRClass: (new () => any) | undefined = w && (w.SpeechRecognition || w.webkitSpeechRecognition);
const TTS = !!w && 'speechSynthesis' in w && typeof w.SpeechSynthesisUtterance !== 'undefined';
const SR_ERR: Record<string, string> = {
  'not-allowed': 'Izin mikrofon ditolak. Aktifkan mikrofon untuk situs ini di pengaturan peramban.',
  'service-not-allowed': 'Izin mikrofon ditolak. Aktifkan mikrofon untuk situs ini di pengaturan peramban.',
  'no-speech': 'Tidak ada suara terdeteksi. Coba lagi.',
  'audio-capture': 'Mikrofon tidak ditemukan.',
  network: 'Pengenalan suara membutuhkan koneksi internet.',
  'language-not-supported': 'Bahasa Indonesia belum didukung pengenalan suara peramban ini.',
};
// Teks untuk dibacakan: tautan diganti kata "tautan", simbol markdown dibuang. Dipecah per kalimat (±180 huruf) karena
// Chrome memotong ucapan yang terlalu panjang.
const spoken = (t: string) => t.replace(URL_RE, ' tautan ').replace(/[*_#`>]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 900);
function chunks(t: string): string[] {
  const out: string[] = []; let cur = '';
  for (const sent of t.match(/[^.!?]+[.!?]*\s*/g) ?? [t]) {
    for (const part of sent.length > 180 ? sent.match(/.{1,180}(\s|$)/g) ?? [sent] : [sent]) {
      if ((cur + part).length > 180 && cur) { out.push(cur.trim()); cur = ''; }
      cur += part;
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
const pickVoice = () => { const vs: SpeechSynthesisVoice[] = w.speechSynthesis.getVoices(); return vs.find(v => /^id[-_]ID/i.test(v.lang)) || vs.find(v => /^id/i.test(v.lang)) || null; };

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
const MIC_D = 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3ZM19 11a7 7 0 0 1-14 0M12 18v3M9 21h6';
const STOP_D = 'M7 7h10v10H7Z';
const SPK_D = 'M11 5 6 9H3v6h3l5 4V5ZM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13';
const MUTE_D = 'M11 5 6 9H3v6h3l5 4V5ZM16 9l5 6M21 9l-5 6';

export default function Chat({ wa, email, services }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [down, setDown] = useState<string | null>(null);  // alasan mode FAQ; null = AI normal
  const [msgs, setMsgs] = useState<Msg[]>([{ id: 0, role: 'bot', text: GREETING }]);
  const [past, setPast] = useState(false);  // true = pengunjung sudah menggulir keluar dari Hero
  const [listening, setListening] = useState(false);
  const [voiceMsg, setVoiceMsg] = useState('');
  const [speakOn, setSpeakOn] = useState(false);  // baca otomatis jawaban (default mati)
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const root = useRef<HTMLDivElement>(null), list = useRef<HTMLDivElement>(null), inp = useRef<HTMLInputElement>(null), fab = useRef<HTMLButtonElement>(null);
  const idRef = useRef(1), abortRef = useRef<AbortController | null>(null), userClosed = useRef(false);
  const recRef = useRef<any>(null), voiceUsed = useRef(false), speakOnRef = useRef(false), heroRef = useRef<Element | null>(null), sendRef = useRef<() => void>(() => {});
  speakOnRef.current = speakOn;
  const theme = useSectionTheme(root);

  const svcKey = services.join('|');
  const faqs = useMemo(() => buildChatFaqs({ wa, email, services }), [wa, email, svcKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const quick = useMemo(() => CHAT_QUICK_IDS.map(id => faqs.find(f => f.id === id)).filter((f): f is NonNullable<typeof f> => !!f), [faqs]);

  useEffect(() => { if (open) inp.current?.focus(); else if (userClosed.current) { userClosed.current = false; fab.current?.focus(); } }, [open]);
  useEffect(() => { const el = list.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs, loading, open]);
  useEffect(() => () => { abortRef.current?.abort(); recRef.current?.abort?.(); if (TTS) w.speechSynthesis.cancel(); }, []);

  // Hero bersih dari chatbot: tampil setelah tepi bawah Hero naik melewati ±50% tinggi layar; sembunyi lagi bila kembali ke Hero
  // (batas sembunyi sedikit lebih longgar agar tidak berkedip). Tanpa elemen Hero = langsung tampil.
  useEffect(() => onScrollFrame((_y, vh) => {
    if (!heroRef.current || !heroRef.current.isConnected) heroRef.current = document.querySelector('section.hero');
    const b = heroRef.current?.getBoundingClientRect().bottom;
    setPast(p => b === undefined ? true : p ? b < vh * 0.62 : b < vh * 0.5);
  }), []);
  useEffect(() => { if (!past || !open) { stopSpeak(); stopListen(); } }, [past, open]);  // eslint-disable-line react-hooks/exhaustive-deps

  const push = (role: Msg['role'], text: string) => { const id = idRef.current++; setMsgs(m => [...m, { id, role, text }]); return id; };

  // ---- Suara: baca jawaban ----
  const stopSpeak = () => { if (TTS) w.speechSynthesis.cancel(); setSpeakingId(null); };
  const speak = (text: string, id: number) => {
    if (!TTS) return;
    const parts = chunks(spoken(text)); if (!parts.length) return;
    w.speechSynthesis.cancel();
    const v = pickVoice();
    setSpeakingId(id);
    parts.forEach((p, i) => {
      const u = new w.SpeechSynthesisUtterance(p) as SpeechSynthesisUtterance;
      u.lang = v?.lang || 'id-ID'; if (v) u.voice = v;
      if (i === parts.length - 1) u.onend = u.onerror = () => setSpeakingId(cur => (cur === id ? null : cur));
      w.speechSynthesis.speak(u);
    });
  };
  const toggleSpeak = () => {
    const next = !speakOn; setSpeakOn(next);
    if (next) speak('Suara jawaban aktif.', -1); else stopSpeak();  // ucapan singkat ini juga "membuka" audio di peramban
  };

  // ---- Suara: bicara -> teks ----
  const stopListen = () => { try { recRef.current?.abort?.(); } catch { /* sudah berhenti */ } recRef.current = null; setListening(false); };
  const toggleListen = () => {
    if (!SRClass || loading) return;
    if (listening) { try { recRef.current?.stop(); } catch { /* sudah berhenti */ } return; }
    stopSpeak();  // jangan sampai mikrofon menangkap suara asisten sendiri
    const rec = new SRClass(), base = input.trim();
    rec.lang = 'id-ID'; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
    let got = '';
    rec.onresult = (e: any) => {
      got = Array.from(e.results as ArrayLike<any>).map(r => r[0]?.transcript ?? '').join('').trim();
      if (got) { voiceUsed.current = true; setInput(((base ? base + ' ' : '') + got).slice(0, MAX_INPUT)); }
    };
    rec.onerror = (e: any) => { if (e.error !== 'aborted') setVoiceMsg(SR_ERR[e.error] ?? 'Pengenalan suara gagal. Coba lagi atau ketik pertanyaan Anda.'); };
    rec.onend = () => {
      if (recRef.current === rec) recRef.current = null;
      setListening(false);
      if (got) { if (AUTO_SEND_VOICE) setTimeout(() => sendRef.current(), 0); else inp.current?.focus(); }
    };
    try { rec.start(); recRef.current = rec; setVoiceMsg(''); setListening(true); } catch { setVoiceMsg('Mikrofon tidak dapat dibuka. Coba lagi.'); }
  };
  const close = () => { userClosed.current = true; stopSpeak(); stopListen(); setOpen(false); };

  const askQuick = (id: string) => {
    if (loading) return;
    const f = faqs.find(x => x.id === id);
    if (f) { push('user', f.q); const mid = push('bot', f.a); if (speakOnRef.current) speak(f.a, mid); }
  };

  async function send() {
    const text = input.replace(/\s+/g, ' ').trim().slice(0, MAX_INPUT);
    if (!text || loading) return;
    const viaVoice = voiceUsed.current; voiceUsed.current = false;  // pertanyaan diucapkan -> jawabannya dibacakan walau baca otomatis mati
    stopSpeak(); stopListen(); setVoiceMsg('');
    setInput('');
    const history = msgs.filter(m => m.id !== 0).slice(-5).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text.slice(0, 400) }));  // server juga memotong 400; ini menghemat ukuran permintaan
    push('user', text);
    const local = (note?: string) => {
      const f = matchFaq(text, faqs);
      const reply = f ? f.a : `${note ?? 'Maaf, asisten belum bisa menjawab pertanyaan bebas.'} Silakan pilih pertanyaan cepat di bawah atau kirim kebutuhan Anda lewat formulir Kontak.`;
      const id = push('bot', reply); if (speakOnRef.current || viaVoice) speak(reply, id);
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
      { const id = push('bot', d.reply); if (speakOnRef.current || viaVoice) speak(d.reply, id); }
    } catch {
      if (ac.signal.aborted && abortRef.current !== ac) return;  // digantikan permintaan baru
      setDown('offline'); local();
    } finally { window.clearTimeout(timer); setLoading(false); }
  }

  sendRef.current = () => { void send(); };

  const waUrl = wa ? `https://wa.me/${wa}?text=${encodeURIComponent('Halo RUtusdev, saya ingin bertanya tentang layanan.')}` : '';

  return (
    <div className={`chat${open ? ' is-open' : ''}${past ? '' : ' is-away'}`} data-theme={theme} ref={root} aria-hidden={past ? undefined : true}>
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
            {TTS && <button type="button" className="chat-snd" onClick={toggleSpeak} aria-pressed={speakOn} aria-label={speakOn ? 'Matikan suara jawaban' : 'Nyalakan suara jawaban'} title={speakOn ? 'Suara jawaban: hidup' : 'Suara jawaban: mati'}><Icon d={speakOn ? SPK_D : MUTE_D} /></button>}
            <button type="button" className="chat-x" onClick={close} aria-label="Tutup chat"><Icon d={CLOSE_D} /></button>
          </div>
          <div className="chat-list" ref={list} aria-live="polite">
            {msgs.map(m => (
              <div key={m.id} className={`chat-msg ${m.role}`}>
                {m.role === 'bot' ? renderText(m.text) : m.text}
                {m.role === 'bot' && TTS && (
                  <button type="button" className={'chat-say' + (speakingId === m.id ? ' on' : '')} onClick={() => (speakingId === m.id ? stopSpeak() : speak(m.text, m.id))}
                    aria-label={speakingId === m.id ? 'Hentikan pembacaan' : 'Bacakan jawaban ini'}><Icon d={speakingId === m.id ? STOP_D : SPK_D} />{speakingId === m.id ? 'Hentikan' : 'Dengarkan'}</button>
                )}
              </div>
            ))}
            {loading && <div className="chat-msg bot chat-typing" role="status" aria-label="Asisten sedang mengetik"><i /><i /><i /></div>}
          </div>
          <div className="chat-foot">
            <div className="chat-chips" aria-label="Pertanyaan cepat">
              <a className="chat-chip cta" href="#contact" onClick={close}>Buka formulir</a>
              {waUrl && <a className="chat-chip cta" href={waUrl} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
              {quick.map(f => <button key={f.id} type="button" className="chat-chip" disabled={loading} onClick={() => askQuick(f.id)}>{f.q}</button>)}
            </div>
            {(listening || voiceMsg) && <p className={'chat-voice' + (listening ? ' live' : '')} role="status">{listening ? 'Mendengarkan… silakan bicara' : voiceMsg}</p>}
            <div className="chat-row">
              {SRClass && <button type="button" className={'chat-mic' + (listening ? ' on' : '')} onClick={toggleListen} disabled={loading} aria-pressed={listening}
                aria-label={listening ? 'Berhenti mendengarkan' : 'Bicara untuk bertanya'} title={listening ? 'Berhenti mendengarkan' : 'Bicara untuk bertanya'}><Icon d={listening ? STOP_D : MIC_D} /></button>}
              <input ref={inp} className="chat-in" value={input} maxLength={MAX_INPUT} placeholder={listening ? 'Mendengarkan…' : 'Ketik pertanyaan…'} aria-label="Ketik pertanyaan"
                onChange={e => setInput(e.target.value.slice(0, MAX_INPUT))}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }} />
              <button type="button" className="chat-send" onClick={() => void send()} disabled={loading || !input.trim()} aria-label="Kirim pertanyaan"><Icon d={SEND_D} /></button>
            </div>
            <p className="chat-note">Jawaban AI bisa keliru. Harga ditentukan setelah konsultasi. Jangan menulis data pribadi.{SRClass ? ' Fitur bicara memakai layanan pengenalan suara dari peramban Anda.' : ''}</p>
          </div>
        </div>
      )}
    </div>
  );
}
