import { useEffect, useRef, useState, type FormEvent } from 'react';

type St = { t: 'idle' | 'busy' | 'ok' | 'err'; m: string };

export default function Contact({ wa, email }: { wa: string; email: string }) {
  const [st, setSt] = useState<St>({ t: 'idle', m: '' });
  const box = useRef<HTMLDivElement>(null), wid = useRef<string>();
  const key = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

  useEffect(() => {
    if (!key) return;
    const id = setInterval(() => {
      if (window.turnstile && box.current && !wid.current) { wid.current = window.turnstile.render(box.current, { sitekey: key, theme: 'dark' }); clearInterval(id); }
    }, 200);
    return () => clearInterval(id);
  }, [key]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = e.currentTarget, d = Object.fromEntries(new FormData(f)) as Record<string, string>;
    if (!d.name?.trim() || !/^\S+@\S+\.\S+$/.test(d.email || '')) return setSt({ t: 'err', m: 'Isi nama dan email yang valid.' });
    d['cf-turnstile-response'] = window.turnstile?.getResponse(wid.current) || '';
    setSt({ t: 'busy', m: 'Mengirim…' });
    try {
      const r = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
      if (r.status === 429) return setSt({ t: 'err', m: 'Terlalu banyak percobaan. Tunggu sebentar.' });
      if (!r.ok) throw new Error();
      f.reset(); setSt({ t: 'ok', m: 'Terkirim. Kami akan menghubungi Anda segera.' });
    } catch { setSt({ t: 'err', m: 'Gagal mengirim. Coba lagi, atau gunakan WhatsApp/email.' }); }
    window.turnstile?.reset(wid.current);
  }

  return (
    <section className="dark" id="contact">
      <div className="wrap contact">
        <div>
          <p className="pill pill-dark">Kontak</p>
          <h2>Ceritakan apa yang ingin Anda bangun.</h2>
          <p className="lead">Kami balas dalam 1×24 jam kerja.</p>
          <p className="links">
            <a href={`https://wa.me/${wa}?text=${encodeURIComponent('Halo RUtusdev, saya ingin konsultasi proyek.')}`}>WhatsApp &gt;</a>
            <a href={`mailto:${email}`}>{email} &gt;</a>
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
          <button className="btn btn-blue" type="submit" disabled={st.t === 'busy'}>Kirim permintaan</button>
          <p className="status" role="status">{st.m}</p>
        </form>
      </div>
    </section>
  );
}
