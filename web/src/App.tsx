import { useEffect, useRef, useState } from 'react';
import Dots from './Dots';
import Contact from './Contact';
import { useContent } from './useContent';
import type { Article, Project, Testimonial } from './types';

const DEFAULT_TESTI: Testimonial[] = [
  { client_name: 'Nama Klien', organization: 'Organisasi', quote: 'Testimoni klien ditampilkan di sini, hanya dengan izin publikasi.' },
  { client_name: 'Nama Klien', organization: 'Organisasi', quote: 'Proses jelas dari konsultasi sampai peluncuran.' },
];
const STEPS = [
  ['Konsultasi', 'Positioning, layanan, struktur halaman, dan konten.'], ['Desain', 'Design token, komponen, dan prototipe responsif.'],
  ['Pengembangan', 'Frontend, CMS, API, dan pustaka media.'], ['Peluncuran', 'SEO, keamanan, uji kualitas, cadangan data, dan rilis.'],
];
const STACK = ['React', 'Vite', 'TypeScript', 'Cloudflare Workers', 'Supabase', 'R2'];
const PACKAGES = [
  { n: 'Mulai', pr: 'Landing page', d: 'Satu halaman, formulir konsultasi, dan SEO dasar. Cocok untuk memvalidasi ide dengan cepat.' },
  { n: 'Studio', pr: 'Website + CMS', d: 'Layanan, portofolio, artikel, prospek, dan pustaka media yang bisa Anda kelola sendiri.' },
  { n: 'Custom', pr: 'Aplikasi web', d: 'CRM, alur penjualan, penawaran, dan faktur yang mengikuti proses kerja Anda.' },
];
const COVER = /^uploads\/[0-9a-f-]{36}\.(png|jpg|webp|gif)$/;
const SLUG = /^[a-z0-9-]+$/;
const httpUrl = (u?: string) => (u && /^https?:\/\//.test(u) ? u : '');
const tanggal = (s?: string) => (s ? new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase() : '');
const inisial = (s: string) => (s.trim()[0] || 'R').toUpperCase();

function Mark() {
  return (
    <svg className="mark" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="13" width="6" height="6" rx="1.5" /><rect x="9" y="13" width="6" height="6" rx="1.5" />
      <rect x="16" y="13" width="6" height="6" rx="1.5" /><rect x="9" y="5" width="6" height="6" rx="1.5" />
    </svg>
  );
}

function Nav() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  const links: [string, string][] = [['#services', 'Layanan'], ['#work', 'Karya'], ['#process', 'Proses'], ['#packages', 'Paket'], ['#articles', 'Artikel'], ['#contact', 'Kontak']];
  useEffect(() => {
    const f = () => {
      let t = 'dark';
      document.querySelectorAll<HTMLElement>('[data-nav]').forEach(e => { const r = e.getBoundingClientRect(); if (r.top <= 36 && r.bottom > 36) t = e.dataset.nav || 'dark'; });
      setTheme(t);
    };
    f(); addEventListener('scroll', f, { passive: true }); addEventListener('resize', f);
    return () => { removeEventListener('scroll', f); removeEventListener('resize', f); };
  }, []);
  return (
    <header className={`nav nav-${theme}${open ? ' is-open' : ''}`}>
      <a className="logo" href="#top"><Mark />RUtusdev</a>
      <nav className={'nav-links' + (open ? ' open' : '')} onClick={() => setOpen(false)}>
        {links.map(([h, t]) => <a key={h} href={h}>{t}</a>)}
      </nav>
      <div className="nav-actions">
        <a className="btn btn-ghost" href="/admin/">Masuk</a>
        <a className="btn btn-blue" href="#contact">Hubungi kami</a>
        <button className="burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(o => !o)}><i /><i /><i /></button>
      </div>
    </header>
  );
}

function Hero({ h }: { h: { eyebrow?: string; headline?: string; headline_dim?: string; subheadline?: string; cta_primary?: string; cta_secondary?: string } }) {
  return (
    <section className="hero" data-nav="dark">
      <Dots />
      {['Website', 'CMS', 'API', 'CRM'].map((t, i) => <span key={t} className={'tag t' + (i + 1)} aria-hidden="true">{t}</span>)}
      <div className="wrap hero-in">
        <p className="badge"><i className="dot" />{h.eyebrow || 'Studio pengembangan digital'}</p>
        <h1><b>{h.headline || 'Kami membangun pengalaman digital'}</b><br /><span>{h.headline_dim || 'yang menggerakkan bisnis Anda.'}</span></h1>
        <p className="lead">{h.subheadline || 'Website, aplikasi web, dan solusi digital custom — dirancang, dibangun, dan diluncurkan sampai siap dipakai.'}</p>
        <div className="row"><a className="btn btn-blue" href="#work">{h.cta_primary || 'Lihat karya'}</a><a className="btn btn-ghost" href="#contact">{h.cta_secondary || 'Jadwalkan konsultasi'}</a></div>
      </div>
      <div className="logos wrap">{['Cloudflare', 'Supabase', 'React', 'TypeScript', 'PostgreSQL'].map(x => <span key={x}>{x}</span>)}</div>
    </section>
  );
}

function Services({ items }: { items: { title: string; summary?: string }[] }) {
  return (
    <section className="light" id="services" data-nav="light">
      <div className="wrap">
        <p className="pill">Mengapa RUtusdev</p>
        <h2><b>Semua yang bisnis butuhkan untuk tampil online.</b> <span>Dibangun agar mudah dirawat.</span></h2>
        <p className="lead dim">Satu studio untuk strategi, desain, pengembangan, dan perawatan produk digital Anda, dengan lingkungan yang aman dan terpisah.</p>
        <div className="panel">
          {items.length ? items.map(s => (
            <article className="cell" key={s.title}><h3>{s.title}</h3><p>{s.summary}</p>
              <p className="links"><a href="#contact">Minta penawaran <i>→</i></a></p></article>
          )) : (<>
            <article className="cell">
              <div className="mock stack" aria-hidden="true">
                <div className="win w3"><b /><b /><b /><em>Landing page</em></div>
                <div className="win w2"><b /><b /><b /><em>Aplikasi</em></div>
                <div className="win w1"><b /><b /><b /><em>Website</em><div className="code" /></div>
              </div>
              <h3>Website &amp; landing page</h3>
              <p>Company profile dan landing page cepat, responsif, dan siap SEO dengan CMS yang bisa Anda kelola sendiri.</p>
              <p className="links"><a href="#packages">Lihat paket <i>→</i></a><a href="#contact">Minta penawaran <i>→</i></a></p>
            </article>
            <article className="cell">
              <div className="mock mods" aria-hidden="true">
                <div className="mod m3"><small>Modul</small><div><span className="sq" /><span className="ln" /></div></div>
                <div className="mod m2"><small>Modul</small><div><span className="sq" /><span className="ln" /></div></div>
                <div className="mod m1"><small>Modul</small><div><span className="sq b" /><div><strong>CRM</strong><span className="ln" /></div></div></div>
              </div>
              <h3>Aplikasi web &amp; sistem informasi</h3>
              <p>Dashboard, sistem informasi, dan aplikasi custom yang mengikuti alur kerja bisnis Anda, bukan sebaliknya.</p>
              <p className="links"><a href="#contact">Diskusikan ide Anda <i>→</i></a></p>
            </article>
          </>)}
        </div>
      </div>
    </section>
  );
}

function ProjectCard({ p }: { p: Project }) {
  const demo = httpUrl(p.demo_url), meta = [p.category, ...(p.technologies || [])].filter(Boolean).join(' · ');
  return (
    <article className="dcard">
      <div className="dhead"><h3>{p.slug && SLUG.test(p.slug) ? <a href={`/work/${p.slug}`}>{p.title}</a> : p.title}</h3>
        {p.slug && SLUG.test(p.slug) && <a className="pillbtn" href={`/work/${p.slug}`}>Selengkapnya <i>↳</i></a>}</div>
      {p.cover_key && COVER.test(p.cover_key) && <img className="cover" loading="lazy" src={`/media/${p.cover_key}`} alt={p.title} />}
      <p>{p.summary}</p><p className="meta">{meta}</p>
      {demo && <p className="links"><a href={demo} target="_blank" rel="noopener noreferrer">Lihat demo <i>→</i></a></p>}
    </article>
  );
}

function Work({ items }: { items: Project[] }) {
  return (
    <section className="sandbg" id="work" data-nav="light">
      <div className="wrap">
        <p className="pill">Karya pilihan</p>
        <h2><b>Bukti, bukan janji.</b> <span>Studi kasus yang bisa Anda lihat sendiri.</span></h2>
      </div>
      <div className="dscroll wrap">
        {items.length ? items.map(p => <ProjectCard key={p.slug || p.title} p={p} />) : (<>
          <article className="dcard">
            <div className="dhead"><h3>Dibangun terpisah dan aman</h3><a className="pillbtn" href="#contact">Pelajari <i>↳</i></a></div>
            <div className="nest" aria-hidden="true">
              <div className="box b1"><span>Situs klien</span><div><em>Halaman</em><em>SEO</em><em>Formulir</em></div></div>
              <div className="box b2"><span>CMS admin</span><div><em>Konten</em><em>Media</em></div></div>
              <div className="box b3"><span>API Worker</span></div>
            </div>
          </article>
          <article className="dcard">
            <div className="dhead"><h3>Cepat di segala skala</h3></div>
            <svg viewBox="0 0 300 150" className="spark" role="img" aria-label="Grafik performa">
              <line x1="0" y1="26" x2="300" y2="26" stroke="#555" strokeDasharray="3 4" />
              <polyline points="0,138 40,110 80,104 120,106 160,70 200,64 240,48 300,18" fill="none" stroke="#6475ff" strokeWidth="2.5" />
              <g fill="#777" fontFamily="JetBrains Mono, monospace" fontSize="9"><text x="2" y="130">MINGGU 1</text><text x="100" y="146">2</text><text x="190" y="146">3</text><text x="270" y="146">4</text></g>
            </svg>
          </article>
        </>)}
      </div>
    </section>
  );
}

function Badge({ children, dotted, hex }: { children: string; dotted?: boolean; hex?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className="seal" aria-hidden="true">
      {hex ? <polygon points="50,6 88,28 88,72 50,94 12,72 12,28" fill="none" stroke="#fff" strokeWidth="2" />
        : <circle cx="50" cy="50" r="40" fill="none" stroke="#fff" strokeWidth={dotted ? 3 : 2} strokeDasharray={dotted ? '0.1 6' : undefined} strokeLinecap="round" />}
      <text x="50" y="56" textAnchor="middle" fill="#fff" fontSize="17" fontWeight="500" fontFamily="Hanken Grotesk, sans-serif">{children}</text>
    </svg>
  );
}

function Quote({ x }: { x: Testimonial }) {
  const nama = x.client_name || 'Klien';
  return (
    <figure className="qcard"><blockquote>“{x.quote}”</blockquote>
      <figcaption><span className="av">{inisial(nama)}</span><span><b>{nama}</b>{x.organization ? `, ${x.organization}` : ''}</span></figcaption></figure>
  );
}

function Trust({ t }: { t: Testimonial[] }) {
  return (
    <section className="blue" id="trust" data-nav="blue">
      <div className="wrap">
        <p className="pill pill-blue">Bersama klien</p>
        <h2><b>Fondasi tepercaya untuk proyek klien dari berbagai skala.</b></h2>
        <div className="bgrid">
          <Quote x={t[0]} />
          <div className="stat"><b>12+</b><span>Proyek selesai</span></div>
          <Quote x={t[1]} />
          <div className="stat"><b>4–6</b><span>Minggu hingga situs live</span></div>
          <div className="art" aria-hidden="true" />
          <div className="stat"><b>1×24</b><span>Jam kerja untuk balasan pertama</span></div>
        </div>
        <div className="seals-h"><svg viewBox="0 0 76 24" className="checks" aria-hidden="true">{[12, 38, 64].map(cx => <g key={cx}><circle cx={cx} cy="12" r="10" fill="none" stroke="#fff" strokeWidth="1.5" /><path d={`M${cx - 4} 12.5l3 3 5-6`} fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" /></g>)}</svg>
          <h3>Keamanan yang dapat Anda percaya</h3></div>
        <div className="seals">
          <div className="sealcard"><Badge>RLS</Badge><span>Akses data ditolak secara bawaan</span></div>
          <div className="sealcard"><Badge hex>Bot</Badge><span>Turnstile dan honeypot di formulir</span></div>
          <div className="sealcard"><Badge dotted>8 KB</Badge><span>Batas ukuran dan laju permintaan</span></div>
          <div className="sealcard"><Badge>Kunci</Badge><span>Rahasia hanya tersimpan di Worker</span></div>
        </div>
      </div>
    </section>
  );
}

function Ticker() {
  const slogan = [...Array(3)].map((_, i) => <span key={i}>RANCANG. BANGUN. LUNCURKAN.</span>);
  const info = ['Proyek selesai: 12+', 'Waktu hingga situs live: 4–6 minggu', 'Balasan pertama: 1×24 jam kerja'];
  const items = [...Array(2)].flatMap((_, k) => info.map((x, i) => <span key={`${k}-${i}`}><Mark />{x.toUpperCase()}</span>));
  return (
    <div className="runon" aria-hidden="true" data-nav="blue">
      <div className="big"><div>{slogan}</div></div>
      <div className="tick"><div>{items}</div></div>
    </div>
  );
}

function Process() {
  const [copied, setCopied] = useState(false);
  const [pk, setPk] = useState(1);
  const copy = () => { navigator.clipboard?.writeText('npm create rutusdev@latest'); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const P = PACKAGES[pk];
  return (
    <section className="dark" id="process" data-nav="dark">
      <div className="wrap">
        <p className="pill pill-dark">Proses</p>
        <h2><b>Dari konsultasi pertama sampai peluncuran.</b><br /><span>Dan perawatan setelahnya.</span></h2>
        <p className="lead">Satu alur kerja lengkap: dari lembar kosong menjadi aplikasi yang berjalan, dengan standar terbuka yang mudah dirawat.</p>
        <div className="seg" role="tablist" id="packages">
          {PACKAGES.map((x, i) => <button key={x.n} role="tab" aria-selected={i === pk} className={i === pk ? 'on' : ''} onClick={() => setPk(i)}>{x.n}</button>)}
        </div>
        <div className="pkg"><p className="price">{P.pr}</p><p>{P.d}</p></div>
        <div className="row"><a className="btn btn-blue" href="#contact">Pilih paket {P.n}</a><a className="btn btn-ghost" href="#contact">Minta penawaran</a></div>
        <p className="small">Paket bersifat indikatif. Harga ditentukan setelah diskusi kebutuhan.</p>
        <div className="row term-row">
          <div className="term"><code><u>$</u> npm create rutusdev@latest</code><button onClick={copy} aria-label="Salin perintah">{copied ? 'Tersalin' : 'Salin'}</button></div>
          <a className="mlink" href="#work">LIHAT KARYA <i>→</i></a>
        </div>
        <ol className="steps">{STEPS.map(([b, p]) => <li key={b}><b>{b}</b><p>{p}</p></li>)}</ol>
        <h3 className="stack-h">Stack yang kami pakai</h3>
        <p className="chips">{STACK.map(s => <span key={s}>{s}</span>)}</p>
      </div>
    </section>
  );
}

function ArticleCard({ a, i }: { a: Article; i: number }) {
  const ok = a.slug && SLUG.test(a.slug), href = ok ? `/articles/${a.slug}` : '/articles';
  return (
    <article className="acard">
      <a className={'acover g' + (i % 3)} href={href}>
        {a.cover_key && COVER.test(a.cover_key) && <img loading="lazy" src={`/media/${a.cover_key}`} alt={a.title} />}
        {a.created_at && <span className="date">{tanggal(a.created_at)}</span>}
      </a>
      <div className="atitle"><h3><a href={href}>{a.title}</a></h3><a className="pillbtn light" href={href}>Baca</a></div>
      <p className="by"><span className="av">R</span><span><b>Tim RUtusdev</b></span></p>
    </article>
  );
}

function Articles({ items }: { items: Article[] }) {
  const tr = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(0);
  const list = items.length ? items : [{ title: 'Artikel pertama segera hadir. Lihat catatan terbaru kami.' }];
  const go = (d: number) => tr.current?.scrollBy({ left: d * (tr.current.clientWidth * 0.8), behavior: 'smooth' });
  const onScroll = () => { const e = tr.current; if (e) setPos(e.scrollLeft / Math.max(1, e.scrollWidth - e.clientWidth)); };
  return (
    <section className="light" id="articles" data-nav="light">
      <div className="wrap">
        <p className="pill">Dari artikel</p>
        <h2><b>Lihat apa yang sedang terjadi</b></h2>
        <p className="lead dim">Catatan tentang website, aplikasi web, dan solusi digital.</p>
        <p className="links"><a href="/articles">LIHAT SEMUA ARTIKEL <i>→</i></a></p>
        <div className="ctrl">
          <div className="prog" aria-hidden="true"><i style={{ width: `${Math.max(18, pos * 100)}%` }} /></div>
          <button aria-label="Sebelumnya" onClick={() => go(-1)}>←</button><button aria-label="Berikutnya" onClick={() => go(1)}>→</button>
        </div>
      </div>
      <div className="atrack wrap" ref={tr} onScroll={onScroll}>{list.map((a, i) => <ArticleCard key={a.slug || i} a={a} i={i} />)}</div>
    </section>
  );
}

export default function App() {
  const c = useContent(), s = c?.settings, h = s?.hero ?? {}, ct = s?.contact ?? {};
  const wa = /^\d{6,16}$/.test(ct.whatsapp || '') ? ct.whatsapp! : '6280000000000';
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ct.email || '') ? ct.email! : 'hello@rutusdev.com';
  const testi = [0, 1].map(i => c?.testimonials?.[i] ?? DEFAULT_TESTI[i]);
  return (
    <>
      <Nav />
      <main id="top">
        <Hero h={h} />
        <Services items={c?.services ?? []} />
        <Work items={c?.projects ?? []} />
        <Trust t={testi} />
        <Ticker />
        <Process />
        <Articles items={c?.articles ?? []} />
        <Contact wa={wa} email={email} />
      </main>
      <footer className="foot dark" data-nav="dark">
        <div className="wrap">
          <a className="logo" href="#top"><Mark />RUtusdev</a>
          <p>Rancang. Bangun. Luncurkan. · © {new Date().getFullYear()} RUtusdev</p>
        </div>
      </footer>
    </>
  );
}
