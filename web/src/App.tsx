import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Dots from './Dots';
import Defer from './Defer';
import Deck from './Deck';
import Reveal from './Reveal';
import Catalog from './Catalog';
import { onScrollFrame, clamp, reducedMotion } from './scroll';
import { useContentState } from './useContent';
import { imgProps } from './media';
import { PACKAGES, RECURRING, STACK, STEPS } from '../../shared/siteFacts';
import type { Article, Client, Project, Service, Stats, Testimonial } from './types';

const COVER = /^uploads\/[0-9a-f-]{36}\.(png|jpg|webp|gif)$/;
const SLUG = /^[a-z0-9-]+$/;
const httpUrl = (u?: string) => (u && /^https?:\/\//.test(u) ? u : '');
const tanggal = (s?: string) => (s ? new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase() : '');
const inisial = (s: string) => (s.trim()[0] || 'R').toUpperCase();

// Logo RUtusdev: tiga kotak di bawah mengikuti warna teks, kotak atas selalu biru (#4755F6, lihat .m-top di styles.css).
function Mark() {
  return (
    <svg className="mark" viewBox="0 0 24 24" aria-hidden="true">
      <rect className="m-top" x="9" y="5" width="6" height="6" rx="1.5" />
      <rect x="2" y="13" width="6" height="6" rx="1.5" /><rect x="9" y="13" width="6" height="6" rx="1.5" /><rect x="16" y="13" width="6" height="6" rx="1.5" />
    </svg>
  );
}

function Nav() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  const links: [string, string][] = [['#services', 'Layanan'], ['#work', 'Karya'], ['#process', 'Proses'], ['#technology', 'Teknologi'], ['#packages', 'Paket'], ['#articles', 'Artikel'], ['#contact', 'Kontak']];
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-nav]'));
    return onScrollFrame(() => {
      let t = 'dark';
      for (const e of els) { const r = e.getBoundingClientRect(); if (r.top <= 36 && r.bottom > 36) t = e.dataset.nav || 'dark'; }
      setTheme(t);
    });
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

// Tiap slot berisi satu kategori teknologi; kata di dalamnya bergantian setiap 3 detik.
const HERO_STACK = [
  ['Cloudflare', 'Vercel', 'Netlify', 'AWS'],
  ['Supabase', 'Firebase', 'Appwrite', 'PocketBase'],
  ['React', 'Vue', 'Svelte', 'Next.js'],
  ['TypeScript', 'JavaScript', 'Python', 'Go'],
  ['PostgreSQL', 'MySQL', 'MongoDB', 'SQLite'],
];
const SLOT_MS = 3000;
// Kata lama meluncur ke atas lalu hilang, kata baru naik dari bawah. Tiap slot mulai bergeser sedikit agar tidak serempak.
function StackSlot({ words, offset }: { words: string[]; offset: number }) {
  const [s, setS] = useState({ cur: 0, prev: -1, n: 0 });
  useEffect(() => {
    const tick = () => setS(v => ({ cur: (v.cur + 1) % words.length, prev: v.cur, n: v.n + 1 }));
    let iv: number | undefined;
    const t = window.setTimeout(() => { tick(); iv = window.setInterval(tick, SLOT_MS); }, SLOT_MS + offset);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, [words.length, offset]);
  const anim = s.n > 0 && !reducedMotion();
  return (
    <span className="slot">
      {words.map(w => <em key={w} className="slot-size" aria-hidden="true">{w}</em>)}
      {anim && <em key={'o' + s.n} className="slot-w out" aria-hidden="true">{words[s.prev]}</em>}
      <em key={'i' + s.n} className={'slot-w' + (anim ? ' in' : '')}>{words[s.cur]}</em>
    </span>
  );
}
function Hero({ h, clients = [] }: { h: { eyebrow?: string; headline?: string; headline_dim?: string; subheadline?: string; cta_primary?: string; cta_secondary?: string }; clients?: Client[] }) {
  const logos = clients.filter(c => c.logo_key && COVER.test(c.logo_key)).slice(0, 5);
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = root.current!;
    if (reducedMotion()) return;
    const body = el.querySelector<HTMLElement>('.hero-in')!, dots = el.querySelector<HTMLElement>('#dots')!;
    const tags = el.querySelectorAll<HTMLElement>('.tag'), corners = el.querySelector<HTMLElement>('.corners')!;
    return onScrollFrame(y => {
      const hp = clamp(y / (el.offsetHeight * 0.55));
      // teks naik sambil mengecil & memudar; titik bergerak lebih lambat (paralaks)
      body.style.transform = `translate3d(0,${(-hp * 80).toFixed(1)}px,0) scale(${(1 - hp * 0.06).toFixed(3)})`; body.style.opacity = String(clamp(1 - hp * 1.25));
      dots.style.transform = `translate3d(0,${(hp * 70).toFixed(1)}px,0)`;
      tags.forEach((t, i) => { t.style.opacity = String(clamp(1 - hp * 2)); t.style.translate = `0 ${(-hp * (30 + i * 22)).toFixed(1)}px`; });
      // sudut bawah membulat besar → kotak, lebih lama & lebih jelas
      corners.style.setProperty('--s', String(clamp(1 - y / (el.offsetHeight * 0.4))));
    });
  }, []);
  return (
    <section className="hero" data-nav="dark" ref={root}>
      <Dots />
      {['Website', 'CMS', 'API', 'CRM'].map((t, i) => <span key={t} className={'tag t' + (i + 1)} aria-hidden="true">{t}</span>)}
      <div className="wrap hero-in">
        <p className="badge"><i className="dot" />{h.eyebrow || 'Software house & jasa pembuatan website Jawa Tengah'}</p>
        <h1><b>{h.headline || 'Kami membangun pengalaman digital'}</b><br /><span>{h.headline_dim || 'yang menggerakkan bisnis Anda.'}</span></h1>
        <div className="hero-side">
          <p className="lead">{h.subheadline || 'Website, aplikasi web, dan solusi digital custom — dirancang, dibangun, dan diluncurkan sampai siap dipakai.'}</p>
          <div className="row"><a className="btn btn-blue" href="#work">{h.cta_primary || 'Lihat karya'}</a><a className="btn btn-ghost" href="#contact">{h.cta_secondary || 'Jadwalkan konsultasi'}</a></div>
        </div>
      </div>
      {/* Jejak kepercayaan di dasar hero (tablet & desktop): logo klien bila ada, selain itu teknologi yang dipakai */}
      <div className="wrap hero-logos" aria-label={logos.length ? 'Klien' : 'Teknologi'}>
        {logos.length ? logos.map(c => <img key={c.name} {...imgProps(c.logo_key!, '150px', 320)} alt={c.name} loading="lazy" decoding="async" />) : HERO_STACK.map((w, i) => <StackSlot key={w[0]} words={w} offset={i * 450} />)}
      </div>
      <i className="corners bottom" aria-hidden="true" />
    </section>
  );
}

// Kerangka pemuatan: ukuran mendekati kartu asli agar tidak ada layout shift. Memakai kelas sendiri (bukan .cell/.dcard/.acard) supaya tidak ikut animasi reveal.
const Sk = ({ w = '100%', h = 14, mt = 12 }: { w?: string; h?: number; mt?: number }) => <i className="sk" style={{ width: w, height: h, marginTop: mt }} />;

function Services({ items, loading }: { items: Service[]; loading?: boolean }) {
  return (
    <section className="light svc" id="services" data-nav="light">
      <div className="wrap">
        <Reveal>
        <p className="pill">Mengapa RUtusdev</p>
        <h2><b>Semua yang bisnis butuhkan untuk tampil online.</b> <span>Dibangun agar mudah dirawat.</span></h2>
        <p className="lead dim">Satu studio untuk strategi, desain, pengembangan, dan perawatan produk digital Anda, dengan lingkungan yang aman dan terpisah.</p>
        </Reveal>
        <div className="panel" aria-busy={loading || undefined}>
          {loading ? [0, 1].map(i => (
            <div className="skcell" key={i} aria-hidden="true"><Sk h={170} mt={0} /><Sk w="60%" h={26} mt={30} /><Sk /><Sk w="85%" /><Sk w="40%" h={16} mt={24} /></div>
          )) : items.length ? items.map((s, i) => (
            // Dua layanan pertama tetap memakai tumpukan kartu geser (Deck) + kode berputar; sisanya kartu biasa.
            // Garis pemisah disesuaikan agar rapi di grid 2 kolom walau layanan lebih dari dua.
            <article className="cell" key={s.title} style={i >= 2 ? { borderTop: '1px solid var(--line)', ...(i % 2 === 0 ? { borderLeft: 0 } : {}) } : undefined}>
              {i < 2 && <Deck variant={i === 0 ? 'web' : 'app'} />}
              <h3>{s.title}</h3><p>{s.summary}</p>
              <p className="links">{s.slug && SLUG.test(s.slug) && <a href={`/services/${s.slug}`}>Lihat detail <i>→</i></a>}<a href="#contact">Minta penawaran <i>→</i></a></p></article>
          )) : (<>
            <article className="cell">
              <Deck variant="web" />
              <h3>Website &amp; landing page</h3>
              <p>Company profile dan landing page cepat, responsif, dan siap SEO dengan CMS yang bisa Anda kelola sendiri.</p>
              <p className="links"><a href="#packages">Lihat paket <i>→</i></a><a href="#contact">Minta penawaran <i>→</i></a></p>
            </article>
            <article className="cell">
              <Deck variant="app" />
              <h3>Aplikasi web &amp; sistem informasi</h3>
              <p>Dashboard, sistem informasi, dan aplikasi custom yang mengikuti alur kerja bisnis Anda, bukan sebaliknya.</p>
              <p className="links"><a href="#contact">Diskusikan ide Anda <i>→</i></a></p>
            </article>
          </>)}
        </div>
      </div>
      <Catalog />
    </section>
  );
}

function ProjectCard({ p }: { p: Project }) {
  const demo = httpUrl(p.demo_url), meta = [p.category, ...(p.technologies || [])].filter(Boolean).join(' · ');
  return (
    <article className="dcard">
      <div className="dhead"><h3>{p.slug && SLUG.test(p.slug) ? <a href={`/work/${p.slug}`}>{p.title}</a> : p.title}</h3>
        {p.slug && SLUG.test(p.slug) && <a className="pillbtn" href={`/work/${p.slug}`}>Selengkapnya <i>↳</i></a>}</div>
      {p.cover_key && COVER.test(p.cover_key) && <img className="cover" loading="lazy" decoding="async" {...imgProps(p.cover_key, '(max-width: 760px) 100vw, 640px', 960)} alt={p.title} />}
      <p>{p.summary}</p><p className="meta">{meta}</p>
      {demo && <p className="links"><a href={demo} target="_blank" rel="noopener noreferrer">Lihat demo <i>→</i></a></p>}
    </article>
  );
}

function Work({ items, loading }: { items: Project[]; loading?: boolean }) {
  return (
    <section className="sandbg" id="work" data-nav="light">
      <Reveal className="wrap">
        <p className="pill">Karya pilihan</p>
        <h2><b>Bukti, bukan janji.</b> <span>Studi kasus yang bisa Anda lihat sendiri.</span></h2>
      </Reveal>
      <div className="dscroll wrap" aria-busy={loading || undefined}>
        {loading ? [0, 1].map(i => (
          <div className="skdcard" key={i} aria-hidden="true"><Sk w="70%" h={28} mt={0} /><Sk h={150} mt={22} /><Sk /><Sk w="55%" /></div>
        )) : items.length ? items.map(p => <ProjectCard key={p.slug || p.title} p={p} />) : (<>
          <article className="dcard">
            <div className="dhead"><h3>Dibangun terpisah dan aman</h3><a className="pillbtn" href="#contact">Pelajari <i>↳</i></a></div>
            <div className="nest" aria-hidden="true">
              <div className="box b1"><span>Situs klien</span><div><em>Halaman</em><em>SEO</em><em>Formulir</em></div></div>
              <div className="box b2"><span>CMS admin</span><div><em>Konten</em><em>Media</em></div></div>
              <div className="box b3"><span>API Worker</span></div>
            </div>
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
      <text x="50" y="56" textAnchor="middle" fill="#fff" fontSize="17" fontWeight="500" fontFamily="Space Grotesk, sans-serif">{children}</text>
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

// Hanya data asli: testimoni & statistik berasal dari CMS (Admin → Testimoni / Pengaturan). Kosong = tidak tampil.
function statList(st?: Stats): [string, string][] {
  const o: [string, string][] = [];
  if (st?.projects?.trim()) o.push([st.projects.trim(), 'Proyek selesai']);
  if (st?.timeline?.trim()) o.push([st.timeline.trim(), 'Minggu hingga situs live']);
  o.push(['1×24', 'Jam kerja untuk balasan pertama']);
  return o;
}

function Trust({ t, stats }: { t: Testimonial[]; stats?: Stats }) {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = root.current!, cr = el.querySelector<HTMLElement>('.corners')!;
    if (reducedMotion()) { cr.style.setProperty('--s', '1'); return; }
    return onScrollFrame((_, vh) => { cr.style.setProperty('--s', String(clamp(el.getBoundingClientRect().top / (vh * 0.45)))); });
  }, []);
  const qs = t.slice(0, 2), st = statList(stats), cells: ReactNode[] = [];
  for (let i = 0; i < Math.max(qs.length, st.length); i++) {
    if (qs[i]) cells.push(<Quote key={'q' + i} x={qs[i]} />);
    if (st[i]) cells.push(<div className="stat" key={'s' + i}><b>{st[i][0]}</b><span>{st[i][1]}</span></div>);
  }
  cells.push(<div className="art" key="art" aria-hidden="true" />);
  return (
    <section className="blue" id="trust" data-nav="blue" ref={root}>
      <i className="corners top" aria-hidden="true" />
      <div className="wrap">
        <p className="pill pill-blue">Bersama klien</p>
        <h2><b>Fondasi tepercaya untuk proyek klien dari berbagai skala.</b></h2>
        <div className="bgrid">{cells}</div>
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

function Ticker({ stats }: { stats?: Stats }) {
  const slogan = [...Array(3)].map((_, i) => <span key={i}>RANCANG. BANGUN. LUNCURKAN.</span>);
  const info = [stats?.projects?.trim() && `Proyek selesai: ${stats.projects.trim()}`, stats?.timeline?.trim() && `Waktu hingga situs live: ${stats.timeline.trim()} minggu`, 'Balasan pertama: 1×24 jam kerja'].filter(Boolean) as string[];
  const items = [...Array(2)].flatMap((_, k) => info.map((x, i) => <span key={`${k}-${i}`}><Mark />{x.toUpperCase()}</span>));
  return (
    <div className="runon" aria-hidden="true" data-nav="blue">
      <div className="big"><div>{slogan}</div></div>
      <div className="tick"><div>{items}</div></div>
    </div>
  );
}

function Process() {
  return (
    <section className="dark" id="process" data-nav="dark">
      <div className="wrap">
        <p className="pill pill-dark">Proses</p>
        <h2><b>Dari konsultasi pertama sampai peluncuran.</b><br /><span>Dan perawatan setelahnya.</span></h2>
        <p className="lead">Satu alur kerja lengkap: dari lembar kosong menjadi aplikasi yang berjalan, dengan standar terbuka yang mudah dirawat.</p>
        <ol className="steps">{STEPS.map(([b, p]) => <li key={b}><b>{b}</b><p>{p}</p></li>)}</ol>
        <div className="row"><a className="btn btn-blue" href="#contact">Mulai konsultasi</a><a className="mlink" href="#work">LIHAT KARYA <i>→</i></a></div>
      </div>
    </section>
  );
}

function Technology() {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard?.writeText('npm create rutusdev@latest'); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <section className="dark sub" id="technology" data-nav="dark">
      <div className="wrap">
        <p className="pill pill-dark">Teknologi</p>
        <h2><b>Stack modern, standar terbuka.</b><br /><span>Cepat, aman, dan mudah dirawat.</span></h2>
        <p className="chips">{STACK.map(s => <span key={s}>{s}</span>)}</p>
        <div className="row term-row">
          <div className="term"><code><u>$</u> npm create rutusdev@latest</code><button onClick={copy} aria-label="Salin perintah">{copied ? 'Tersalin' : 'Salin'}</button></div>
        </div>
      </div>
    </section>
  );
}

function Packages() {
  const [pk, setPk] = useState(1);
  const P = PACKAGES[pk];
  return (
    <section className="light sub pk" id="packages" data-nav="light">
      <div className="wrap">
        <p className="pill">Paket</p>
        <h2><b>Pilih paket sesuai kebutuhan.</b><br /><span>Bisa disesuaikan setelah diskusi.</span></h2>
        <div className="seg" role="tablist">
          {PACKAGES.map((x, i) => <button key={x.n} role="tab" aria-selected={i === pk} className={i === pk ? 'on' : ''} onClick={() => setPk(i)}>{x.n}</button>)}
        </div>
        <div className="pkg" key={P.n}><p className="price">{P.pr}</p><p>{P.d}</p></div>
        <div className="row"><a className="btn btn-blue" href="#contact">Pilih paket {P.n}</a><a className="btn btn-ghost" href={P.href}>Lihat rincian harga</a></div>
        <p className="chips pk-rec" aria-label="Biaya berulang opsional">{RECURRING.map(r => <span key={r}>{r}</span>)}</p>
        <p className="small">Estimasi awal dalam Rupiah. Harga final mengikuti analisis kebutuhan, konten, integrasi, dan kompleksitas. <a href="/layanan">Katalog lengkap</a></p>
      </div>
    </section>
  );
}

function Clients({ items }: { items: Client[] }) {
  const list = items.filter(c => c.logo_key && COVER.test(c.logo_key));
  if (!list.length) return null;
  return (
    <section className="light clients" id="clients" data-nav="light">
      <div className="wrap">
        <p className="pill">Klien</p>
        <h2><b>Dipercaya oleh</b> <span>tim dan bisnis yang kami dampingi.</span></h2>
        <ul className="cl-grid">{list.map(c => {
          const url = httpUrl(c.website_url), img = <img loading="lazy" decoding="async" {...imgProps(c.logo_key!, '160px', 320)} alt={c.name} />;
          return <li key={c.name}>{url ? <a href={url} target="_blank" rel="noopener noreferrer" aria-label={c.name}>{img}</a> : img}</li>;
        })}</ul>
      </div>
    </section>
  );
}

function ArticleCard({ a, i }: { a: Article; i: number }) {
  const ok = a.slug && SLUG.test(a.slug), href = ok ? `/articles/${a.slug}` : '/articles';
  return (
    <article className="acard">
      <a className={'acover g' + (i % 3)} href={href}>
        {a.cover_key && COVER.test(a.cover_key) && <img loading="lazy" decoding="async" {...imgProps(a.cover_key, '(max-width: 760px) 100vw, 400px', 640)} alt={a.title} />}
        {a.created_at && <span className="date">{tanggal(a.created_at)}</span>}
      </a>
      <div className="atitle"><h3><a href={href}>{a.title}</a></h3><a className="pillbtn light" href={href}>Baca</a></div>
      <p className="by"><span className="av">R</span><span><b>Tim RUtusdev</b></span></p>
    </article>
  );
}

function Articles({ items, loading }: { items: Article[]; loading?: boolean }) {
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
      <div className="atrack wrap" ref={tr} onScroll={onScroll} aria-busy={loading || undefined}>{loading
        ? [0, 1, 2].map(i => <div className="skacard" key={i} aria-hidden="true"><i className="sk" /><Sk w="80%" h={20} mt={16} /><Sk w="35%" h={14} /></div>)
        : list.map((a, i) => <ArticleCard key={a.slug || i} a={a} i={i} />)}</div>
    </section>
  );
}

const REVEAL = '.cell,.dcard,.qcard,.stat,.art,.sealcard,.steps li,.acard,.seg,.pkg,.term-row,.chips span,.bgrid>*,.stack-h,.seals-h';
// Elemen muncul bergantian (stagger) saat masuk layar; kelas dilepas setelah selesai agar hover tetap normal.
function useReveal(dep: unknown) {
  useEffect(() => {
    if (reducedMotion() || !('IntersectionObserver' in window)) return;
    // PENTING: efek ini jalan ulang saat konten CMS selesai dimuat. Elemen yang sudah diberi kelas `rv` tetapi belum tampil
    // HARUS diamati lagi (observer lama sudah diputus); bila dilewati, elemen itu tertahan transparan selamanya (landing "blank").
    // `data-rvd` menandai elemen yang sudah selesai ditampilkan agar tidak disembunyikan ulang.
    const els = Array.from(document.querySelectorAll<HTMLElement>(REVEAL)).filter(e => e.dataset.rvd !== '1');
    const timers: number[] = [];
    const show = (t: HTMLElement) => {
      t.classList.add('in'); t.dataset.rvd = '1';
      timers.push(window.setTimeout(() => t.classList.remove('rv', 'in'), 1100 + Number(t.style.getPropertyValue('--i') || 0) * 90));
    };
    const io = new IntersectionObserver(es => {
      es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); show(e.target as HTMLElement); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach(e => {
      const sib = Array.from(e.parentElement?.children ?? []).filter(x => x.matches(REVEAL));
      e.style.setProperty('--i', String(Math.min(5, Math.max(0, sib.indexOf(e)))));
      e.classList.add('rv'); io.observe(e);
    });
    // Jaring pengaman: hanya untuk elemen yang SUDAH berada di layar tetapi terlewat observer (mis. layout bergeser).
    // Elemen di bawah layar sengaja dibiarkan menunggu, sehingga animasi muncul tetap terlihat saat pengguna menggulir.
    const safety = window.setInterval(() => {
      const pending = els.filter(e => e.dataset.rvd !== '1');
      if (!pending.length) { clearInterval(safety); return; }
      pending.forEach(e => { const r = e.getBoundingClientRect(); if (r.top < innerHeight * 0.94 && r.bottom > 0) { io.unobserve(e); show(e); } });
    }, 1500);
    return () => { io.disconnect(); clearInterval(safety); timers.forEach(clearTimeout); };
  }, [dep]);
}

function Progress() {
  const r = useRef<HTMLDivElement>(null);
  useEffect(() => onScrollFrame((y, vh) => {
    const max = document.documentElement.scrollHeight - vh;
    r.current?.style.setProperty('--p', String(max > 0 ? clamp(y / max) : 0));
  }), []);
  return <div className="sprog" ref={r} aria-hidden="true" />;
}

// Chatbot dimuat terpisah (code-split) setelah halaman tampil, supaya tidak menambah beban muat awal.
const Chat = lazy(() => import('./Chat'));
function ChatLoader({ wa, email, services }: { wa: string; email: string; services: string[] }) {
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), 2500); return () => clearTimeout(t); }, []);
  return on ? <Suspense fallback={null}><Chat wa={wa} email={email} services={services} /></Suspense> : null;
}

export default function App() {
  const { c, loading } = useContentState(), s = c?.settings, h = s?.hero ?? {}, ct = s?.contact ?? {};
  useReveal(loading ? 'loading' : c);  // jalan lagi saat skeleton diganti konten asli
  const wa = /^\d{6,16}$/.test(ct.whatsapp || '') ? ct.whatsapp! : '';  // kosong = tombol WhatsApp disembunyikan (tidak ada nomor palsu)
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ct.email || '') ? ct.email! : 'hello@rutusdev.com';
  const testi = (c?.testimonials ?? []).slice(0, 2);
  const svcKey = (c?.services ?? []).map(x => x.title).join('|'), svc = useMemo(() => (svcKey ? svcKey.split('|') : []), [svcKey]);
  return (
    <>
      <Progress />
      <Nav />
      <main id="top">
        <Hero h={h} clients={c?.clients ?? []} />
        <Services items={c?.services ?? []} loading={loading} />
        <Work items={c?.projects ?? []} loading={loading} />
        <Trust t={testi} stats={s?.stats} />
        <Ticker stats={s?.stats} />
        <Clients items={c?.clients ?? []} />
        <Process />
        <Technology />
        <Packages />
        <Articles items={c?.articles ?? []} loading={loading} />
        <Defer wa={wa} email={email} />
      </main>
      <footer className="foot dark" data-nav="dark">
        <div className="wrap">
          <a className="logo" href="#top"><Mark />RUtusdev</a>
          <p>Rancang. Bangun. Luncurkan. · © {new Date().getFullYear()} RUtusdev</p>
          {/* Satu tautan ke hub /jasa: halaman itu menautkan semua wilayah & layanan (SEO), landing tetap bersih */}
          <nav className="foot-links" aria-label="Layanan"><a href="/layanan">Katalog layanan &amp; harga</a><a href="/jasa">Semua layanan &amp; wilayah</a></nav>
          <div className="credit" aria-label="Developed by @hndx07">
            <span className="credit-pill">
              <span className="credit-dim">Developed by</span>
              <svg className="credit-ico" viewBox="0 0 24 24" aria-hidden="true">
                <polyline points="8 6 2 12 8 18" /><polyline points="16 6 22 12 16 18" /><line x1="14" y1="4" x2="10" y2="20" />
              </svg>
              <span className="credit-handle">@hndx07</span>
            </span>
          </div>
        </div>
      </footer>
      <ChatLoader wa={wa} email={email} services={svc} />
    </>
  );
}
