import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTurnstileKey } from './turnstile';

type St = { t: 'idle' | 'busy' | 'ok' | 'err'; m: string };

export default function Contact({ wa, email }: { wa?: string; email: string }) {
  const [st, setSt] = useState<St>({ t: 'idle', m: '' });
  const [token, setToken] = useState('');
  const [blocked, setBlocked] = useState(false);  // skrip Turnstile tidak termuat (ekstensi pemblokir / koneksi)
  const box = useRef<HTMLDivElement>(null), wid = useRef<string>();
  const { key, state } = useTurnstileKey();

  useEffect(() => {
    if (state !== 'ready') return;
    let tries = 0;
    const id = setInterval(() => {
      if (window.turnstile && box.current && !wid.current) {
        wid.current = window.turnstile.render(box.current, {
          sitekey: key, theme: 'dark', action: 'lead',  // server menolak token tanpa aksi "lead" (mis. token widget login admin)
          callback: (t: string) => setToken(t), 'expired-callback': () => setToken(''), 'error-callback': () => setToken(''),
        });
        clearInterval(id);
      } else if (++tries > 75) { clearInterval(id); setBlocked(true); }  // ±15 detik
    }, 200);
    return () => clearInterval(id);
  }, [key, state]);

  const missing = state === 'missing', unavailable = missing || blocked;
  const note = missing ? 'Verifikasi keamanan belum aktif di situs ini. Silakan hubungi kami lewat email.'
    : blocked ? 'Verifikasi keamanan tidak dapat dimuat. Nonaktifkan pemblokir iklan untuk situs ini atau hubungi kami lewat email.' : '';

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = e.currentTarget, d = Object.fromEntries(new FormData(f)) as Record<string, string>;
    if (!d.name?.trim() || !/^\S+@\S+\.\S+$/.test(d.email || '')) return setSt({ t: 'err', m: 'Isi nama dan email yang valid.' });
    const tok = window.turnstile?.getResponse(wid.current) || token;
    if (!tok) return setSt({ t: 'err', m: 'Selesaikan verifikasi keamanan terlebih dulu.' });
    d['cf-turnstile-response'] = tok;
    setSt({ t: 'busy', m: 'Mengirim…' });
    try {
      const r = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
      if (r.status === 429) return setSt({ t: 'err', m: 'Terlalu banyak percobaan. Tunggu sebentar.' });
      if (r.status === 503) return setSt({ t: 'err', m: 'Verifikasi keamanan sedang tidak tersedia. Coba lagi nanti atau hubungi lewat email.' });
      if (r.status === 400 && (await r.json().catch(() => null))?.error === 'captcha') return setSt({ t: 'err', m: 'Verifikasi keamanan gagal atau kedaluwarsa. Centang ulang lalu kirim kembali.' });
      if (!r.ok) throw new Error();
      f.reset(); setSt({ t: 'ok', m: 'Terkirim. Kami akan menghubungi Anda segera.' });
    } catch { setSt({ t: 'err', m: 'Gagal mengirim. Coba lagi, atau hubungi lewat email.' }); }
    finally { window.turnstile?.reset(wid.current); setToken(''); }  // token Turnstile sekali pakai: selalu minta yang baru, apa pun hasilnya
  }

  return (
    <section className="dark contact-s" id="contact" data-nav="dark">
      <div className="wrap contact">
        <div>
          <p className="pill pill-dark">Kontak</p>
          <h2><b>Ceritakan apa yang ingin Anda bangun.</b></h2>
          <p className="lead">Kami balas dalam 1×24 jam kerja.</p>
          <p className="links">
            {wa && <a href={`https://wa.me/${wa}?text=${encodeURIComponent('Halo RUtusdev, saya ingin konsultasi proyek.')}`}>WhatsApp <i>→</i></a>}
            <a href={`mailto:${email}`}>{email} <i>→</i></a>
          </p>
        </div>
        <form onSubmit={submit} noValidate>
          <label>Nama<input name="name" required maxLength={100} autoComplete="name" /></label>
          <label>WhatsApp (opsional)<input name="whatsapp" maxLength={20} inputMode="tel" autoComplete="tel" /></label>
          <label>Email<input name="email" type="email" required maxLength={150} autoComplete="email" /></label>
          <label>Layanan
            <select name="service">
              <option value="website">Website / landing page</option><option value="webapp">Aplikasi web</option>
              <option value="system">Sistem informasi</option><option value="custom">Aplikasi custom</option>
            </select>
          </label>
          <label>Ringkasan kebutuhan<textarea name="brief" rows={4} maxLength={1500} /></label>
          <input className="hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          <div ref={box} />
          <button className="btn btn-blue" type="submit" disabled={st.t === 'busy' || unavailable}>Kirim permintaan</button>
          <p className="status" role="status">{note || st.m}</p>
        </form>
      </div>
    </section>
  );
}
