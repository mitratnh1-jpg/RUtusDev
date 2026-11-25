import { useEffect, useRef, useState, type FormEvent } from 'react';
import { setToken, errMsg } from './api';

const siteKey = window.CFG?.TURNSTILE_SITE_KEY && !/^GANTI/i.test(window.CFG.TURNSTILE_SITE_KEY) ? window.CFG.TURNSTILE_SITE_KEY : '';

// Dua langkah: (1) email + kata sandi (+ Turnstile), (2) kode 6 digit dari aplikasi autentikator bila akun memakai MFA.
export default function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState(''), [pw, setPw] = useState(''), [code, setCode] = useState('');
  const [mfa, setMfa] = useState<{ token: string; factor: string } | null>(null);
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null), cap = useRef<string>();

  useEffect(() => {
    if (!siteKey || mfa) return;
    const t = setInterval(() => {
      if (window.turnstile && box.current && !cap.current) { cap.current = window.turnstile.render(box.current, { sitekey: siteKey, theme: 'light' }); clearInterval(t); }
    }, 200);
    return () => { clearInterval(t); cap.current = undefined; };
  }, [mfa]);

  async function post(url: string, body: unknown) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { r, d: (await r.json().catch(() => ({}))) as Record<string, any> };
  }

  async function submitCred(e: FormEvent) {
    e.preventDefault(); setErr('');
    const captcha = siteKey ? window.turnstile?.getResponse(cap.current) || '' : '';
    if (siteKey && !captcha) { setErr('Selesaikan verifikasi keamanan dulu.'); return; }
    setBusy(true);
    try {
      // Login lewat Worker agar percobaan berhasil/gagal tercatat (IP & perangkat).
      const { r, d } = await post('/api/auth/login', { email, password: pw, captcha });
      if (siteKey) window.turnstile?.reset(cap.current);
      if (!r.ok) { setErr(r.status === 429 ? 'Terlalu banyak percobaan. Tunggu beberapa menit.' : r.status === 502 ? 'Layanan autentikasi sedang bermasalah. Coba lagi.' : 'Email atau password salah.'); return; }
      setPw('');
      if (d.mfa_required) { setMfa({ token: d.mfa_token, factor: d.factor_id }); setCode(''); return; }
      setToken(d.access_token); onDone();
    } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  }

  async function submitCode(e: FormEvent) {
    e.preventDefault(); if (!mfa) return; setErr(''); setBusy(true);
    try {
      const { r, d } = await post('/api/auth/mfa', { token: mfa.token, factor_id: mfa.factor, code });
      if (!r.ok) { setErr(r.status === 429 ? 'Terlalu banyak percobaan. Tunggu beberapa menit.' : 'Kode salah atau kedaluwarsa.'); setCode(''); return; }
      setToken(d.access_token); onDone();
    } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  }

  if (mfa) return (
    <div className="lw"><form id="login" onSubmit={submitCode}>
      <span className="logo big">R</span><h1>Verifikasi 2 langkah</h1>
      <p className="dim">Masukkan 6 digit kode dari aplikasi autentikator Anda.</p>
      <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="123456" autoFocus required />
      <button disabled={busy || code.length !== 6}>Verifikasi</button>
      <button type="button" className="g" onClick={() => { setMfa(null); setErr(''); }}>Kembali</button>
      <p className="err">{err}</p>
    </form></div>
  );
  return (
    <div className="lw"><form id="login" onSubmit={submitCred}>
      <span className="logo big">R</span><h1>Admin RUtusdev</h1><p className="dim">Masuk untuk mengelola prospek, proyek, dan konten website.</p>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required autoComplete="username" />
      <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Kata sandi" required autoComplete="current-password" />
      <div ref={box} />
      <button disabled={busy}>Masuk</button>
      <p className="err">{err}</p>
    </form></div>
  );
}
