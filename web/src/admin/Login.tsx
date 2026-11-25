import { useEffect, useRef, useState, type FormEvent } from 'react';
import { setToken, errMsg } from './api';
import { Icon } from './icons';

const siteKey = window.CFG?.TURNSTILE_SITE_KEY && !/^GANTI/i.test(window.CFG.TURNSTILE_SITE_KEY) ? window.CFG.TURNSTILE_SITE_KEY : '';

// Satu kartu, dua tab (gaya Muhiba): "Masuk" = email + kata sandi (+ Turnstile, lalu kode MFA bila akun memakainya);
// "Daftar" = hanya informasi: akun dibuat terpusat oleh administrator, hubungi lewat email / WhatsApp.
export default function Login({ onDone }: { onDone: () => void }) {
  const [tab, setTab] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState(''), [pw, setPw] = useState(''), [show, setShow] = useState(false), [code, setCode] = useState('');
  const [mfa, setMfa] = useState<{ token: string; factor: string } | null>(null);
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const [help, setHelp] = useState<{ email?: string; whatsapp?: string }>({});
  const box = useRef<HTMLDivElement>(null), cap = useRef<string>();

  // Kontak bantuan diambil dari Pengaturan → Kontak (data publik yang sama dengan landing page).
  useEffect(() => {
    fetch('/api/public/content').then(r => r.json()).then(d => { const c = d?.settings?.contact; if (c) setHelp({ email: String(c.email || '').trim(), whatsapp: String(c.whatsapp || '').replace(/\D/g, '') }); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!siteKey || mfa || tab !== 'in') return;
    const t = setInterval(() => {
      if (window.turnstile && box.current && !cap.current) { cap.current = window.turnstile.render(box.current, { sitekey: siteKey, theme: 'light' }); clearInterval(t); }
    }, 200);
    return () => { clearInterval(t); cap.current = undefined; };
  }, [mfa, tab]);

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

  const head = mfa ? ['Verifikasi 2 Langkah', 'Masukkan 6 digit kode dari aplikasi autentikator Anda.']
    : tab === 'in' ? ['Masuk ke Panel Admin', 'Gunakan email dan kata sandi akun admin yang terdaftar.']
    : ['Pendaftaran Akun', 'Akun admin dibuat dan dikelola terpusat oleh administrator.'];
  const wa = help.whatsapp ? `https://wa.me/${help.whatsapp}` : '';

  return (
    <div className="lw">
      <div className="ac">
        <div className="ah">
          <span className="pill">Sistem Manajemen RUtusdev</span>
          <h2>{head[0]}</h2><p>{head[1]}</p>
        </div>
        {!mfa && (
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'in'} className={tab === 'in' ? 'on' : ''} onClick={() => { setTab('in'); setErr(''); }}>Masuk</button>
            <button role="tab" aria-selected={tab === 'up'} className={tab === 'up' ? 'on' : ''} onClick={() => { setTab('up'); setErr(''); }}>Daftar</button>
          </div>
        )}
        {mfa ? (
          <form className="ab" onSubmit={submitCode}>
            {err && <div className="al"><Icon n="alert" />{err}</div>}
            <label>Kode verifikasi<input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="123456" autoFocus required /></label>
            <button className="gr" disabled={busy || code.length !== 6}>{busy ? 'Memproses…' : 'Verifikasi'}<Icon n="arrow" /></button>
            <button type="button" className="g" onClick={() => { setMfa(null); setErr(''); }}>Kembali</button>
          </form>
        ) : tab === 'in' ? (
          <form className="ab" onSubmit={submitCred}>
            {err && <div className="al"><Icon n="alert" />{err}</div>}
            <label>Email Akun
              <span className="fi"><Icon n="mail" /><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email anda" required autoComplete="username" disabled={busy} /></span></label>
            <label>Kata Sandi
              <span className="fi"><Icon n="lock" /><input type={show ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)} placeholder="Masukkan kata sandi" required autoComplete="current-password" disabled={busy} />
                <button type="button" className="eye" onClick={() => setShow(!show)} aria-label={show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}><Icon n={show ? 'eyeoff' : 'eye'} /></button></span></label>
            {siteKey && <div className="tb"><div className="tt"><Icon n="shield" />Verifikasi Keamanan</div><div ref={box} /></div>}
            <button className="gr" disabled={busy}>{busy ? 'Memproses…' : 'Masuk ke Dashboard'}<Icon n="arrow" /></button>
            <p className="ft">Belum punya akun? Buka tab <b>Daftar</b>.</p>
          </form>
        ) : (
          <div className="ab">
            <p className="dim">Pendaftaran tidak dibuka untuk umum. Jika Anda membutuhkan akses atau bantuan (lupa kata sandi, ganti peran, MFA), hubungi administrator lewat:</p>
            <div className="ct">
              <div className="cr"><span className="chip blue"><Icon n="mail" /></span><div><small>Email</small>{help.email ? <a href={`mailto:${help.email}`}>{help.email}</a> : <i>Belum diatur</i>}</div></div>
              <div className="cr"><span className="chip green"><Icon n="phone" /></span><div><small>WhatsApp</small>{wa ? <a href={wa} target="_blank" rel="noopener noreferrer">+{help.whatsapp}</a> : <i>Belum diatur</i>}</div></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
