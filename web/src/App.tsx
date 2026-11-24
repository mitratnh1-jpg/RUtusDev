import { useState } from 'react';
import Dots from './Dots';
import Contact from './Contact';
import { useContent } from './useContent';
import type { Project, Testimonial } from './types';

const DEFAULT_TESTI: Testimonial[] = [
  { client_name: 'Nama Klien', organization: 'Organisasi', quote: 'Testimoni klien ditampilkan di sini, hanya dengan izin publikasi.' },
  { client_name: 'Nama Klien', organization: 'Organisasi', quote: 'Proses jelas dari konsultasi sampai deployment.' },
];
const STEPS = [
  ['Konsultasi', 'Positioning, layanan, struktur halaman, dan konten.'], ['Desain', 'Design tokens, komponen, dan prototype responsif.'],
  ['Pengembangan', 'Frontend, CMS, API, dan media library.'], ['Peluncuran', 'SEO, keamanan, QA, backup, dan deployment.'],
];
const STACK = ['React', 'Vite', 'TypeScript', 'Tailwind', 'Cloudflare Workers', 'Supabase', 'R2'];
const COVER = /^uploads\/[0-9a-f-]{36}\.(png|jpg|webp|gif)$/;
const SLUG = /^[a-z0-9-]+$/;
const httpUrl = (u?: string) => (u && /^https?:\/\//.test(u) ? u : '');

function Nav() {
  const [open, setOpen] = useState(false);
  const links: [string, string][] = [['#services', 'Layanan'], ['#work', 'Karya'], ['#process', 'Proses'], ['#packages', 'Paket'], ['/articles', 'Artikel'], ['#contact', 'Kontak']];
  return (
    <header className="nav">
      <a className="logo" href="#top">RUtusdev<span>.</span></a>
      <nav className={'nav-links' + (open ? ' open' : '')} onClick={() => setOpen(false)}>
        {links.map(([h, t]) => <a key={h} href={h}>{t}</a>)}
      </nav>
      <div className="nav-actions">
        <a className="btn btn-light" href="#contact">Mulai proyek</a>
        <button className="burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(o => !o)}><i /><i /></button>
      </div>
    </header>
  );
}

function Services({ items }: { items: { title: string; summary?: string }[] }) {
  return (
    <section className="light" id="services">
      <div className="wrap">
        <p className="pill">Layanan</p>
        <h2>Semua yang bisnis butuhkan untuk tampil online. <span>Dibangun agar mudah dirawat.</span></h2>
        <p className="lead dim">Satu studio untuk strategi, desain, pengembangan, dan perawatan produk digital Anda.</p>
        <div className="grid2">
          {items.length ? items.map(s => (
            <article className="card sand" key={s.title}><h3>{s.title}</h3><p>{s.summary}</p>
              <p className="links"><a href="#contact">Minta penawaran &gt;</a></p></article>
          )) : (<>
            <article className="card sand">
              <div className="mock">
                <div className="win"><b /><b /><b /><em>Website</em></div>
                <div className="win off"><b /><b /><b /><em>Landing page</em></div>
                <div className="win off2"><b /><b /><b /><em>Aplikasi</em></div>
              </div>
              <h3>Website &amp; landing page</h3>
              <p>Company profile dan landing page cepat, responsif, dan SEO-ready dengan CMS yang bisa Anda kelola sendiri.</p>
              <p className="links"><a href="#contact">Selengkapnya &gt;</a><a href="#contact">Minta penawaran &gt;</a></p>
            </article>
            <article className="card sand">
              <div className="mock mock2">
                <div className="chip"><span className="sq" />Dashboard<small>admin</small></div>
                <div className="chip c2"><span className="sq" />CRM<small>prospek</small></div>
                <div className="chip c3"><span className="sq" />Invoice<small>tagihan</small></div>
              </div>
              <h3>Aplikasi web &amp; sistem informasi</h3>
              <p>Sistem informasi, dashboard, dan aplikasi custom yang mengikuti alur kerja bisnis Anda, bukan sebaliknya.</p>
              <p className="links"><a href="#contact">Selengkapnya &gt;</a><a href="#contact">Diskusikan ide Anda &gt;</a></p>
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
    <article className="card night">
      {p.cover_key && COVER.test(p.cover_key) && <img className="cover" loading="lazy" src={`/media/${p.cover_key}`} alt={p.title} />}
      <h3>{p.slug && SLUG.test(p.slug) ? <a href={`/work/${p.slug}`}>{p.title}</a> : p.title}</h3>
      <p>{p.summary}</p><p className="meta">{meta}</p>
      {demo && <p className="links"><a href={demo} target="_blank" rel="noopener noreferrer">Lihat demo &gt;</a></p>}
    </article>
  );
}

function Work({ items }: { items: Project[] }) {
  return (
    <section className="dark" id="work">
      <div className="wrap">
        <p className="pill pill-dark">Karya pilihan</p>
        <h2>Bukti, bukan janji.</h2>
        <p className="lead">Contoh studi kasus. Ganti dengan proyek nyata dari CMS Anda.</p>
        <div className="grid2 dgrid">
          {items.length ? items.map(p => <ProjectCard key={p.slug || p.title} p={p} />) : (<>
            <article className="card night"><h3>Dibangun terpisah dan aman</h3>
              <div className="tree"><span>Situs klien</span><span>CMS admin</span><span>API Worker</span></div><p className="meta">Website + CMS</p></article>
            <article className="card night"><h3>Cepat di segala skala</h3>
              <svg viewBox="0 0 300 110" className="spark" aria-label="Grafik performa"><polyline points="0,95 50,88 100,70 150,72 200,40 250,28 300,10" fill="none" stroke="#4355FF" strokeWidth="3" /></svg>
              <p className="meta">Pengerjaan berorientasi performa</p></article>
          </>)}
        </div>
      </div>
    </section>
  );
}

function Trust({ t }: { t: Testimonial[] }) {
  const q = (x: Testimonial, i: number) => (
    <figure className="qcard" key={i}><blockquote>“{x.quote}”</blockquote>
      <figcaption>{[x.client_name, x.organization].filter(Boolean).join(', ')}</figcaption></figure>
  );
  return (
    <section className="blue" id="trust">
      <div className="wrap">
        <p className="pill pill-blue">Dipercaya klien</p>
        <h2>Fondasi tepercaya untuk proyek klien dari berbagai skala.</h2>
        <div className="grid2 bgrid">
          {q(t[0], 0)}
          <div className="stat"><b>12+</b><span>Proyek selesai</span></div>
          <div className="stat"><b>4–6</b><span>Minggu hingga situs live</span></div>
          {q(t[1], 1)}
        </div>
      </div>
    </section>
  );
}

function Process() {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard?.writeText('npm create rutusdev@latest'); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <section className="dark" id="process">
      <div className="wrap">
        <p className="pill pill-dark">Proses</p>
        <h2>Dari konsultasi pertama sampai peluncuran.<br /><span>Dan perawatan setelahnya.</span></h2>
        <ol className="steps">{STEPS.map(([b, p]) => <li key={b}><b>{b}</b><p>{p}</p></li>)}</ol>
        <div className="term"><code>$ npm create rutusdev@latest</code><button onClick={copy} aria-label="Salin perintah">{copied ? 'Tersalin' : 'Salin'}</button></div>
        <h3 className="stack-h">Stack yang kami pakai</h3>
        <p className="chips">{STACK.map(s => <span key={s}>{s}</span>)}</p>
      </div>
    </section>
  );
}

function Packages() {
  const P = [['Mulai', 'Landing page', 'Satu halaman, form konsultasi, SEO dasar.'], ['Studio', 'Website + CMS', 'Layanan, portofolio, artikel, leads, dan media library.'],
    ['Custom', 'Aplikasi web', 'CRM, pipeline, proposal, dan invoice sesuai proses Anda.']];
  return (
    <section className="light" id="packages">
      <div className="wrap">
        <p className="pill">Paket</p>
        <h2>Pilih titik mulai. <span>Skala sesuai kebutuhan.</span></h2>
        <div className="grid3">{P.map(([n, pr, d], i) => <article key={n} className={'card sand' + (i === 1 ? ' feat' : '')}><h3>{n}</h3><p className="price">{pr}</p><p>{d}</p></article>)}</div>
        <p className="note">Paket bersifat indikatif. Harga ditentukan setelah diskusi kebutuhan.</p>
      </div>
    </section>
  );
}

export default function App() {
  const c = useContent(), s = c?.settings, h = s?.hero ?? {}, ct = s?.contact ?? {};
  const wa = /^\d{6,16}$/.test(ct.whatsapp || '') ? ct.whatsapp! : '6280000000000';
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ct.email || '') ? ct.email! : 'hello@rutusdev.com';
  const testi = [0, 1].map(i => c?.testimonials?.[i] ?? DEFAULT_TESTI[i]);
  const mq = [...Array(4)].map((_, i) => <span key={i}>CREATE. BUILD. DEPLOY.</span>);
  return (
    <>
      <Nav />
      <main id="top">
        <section className="hero dark">
          <Dots />
          <div className="wrap hero-in">
            <p className="pill pill-dark">{h.eyebrow || 'Studio pengembangan digital'}</p>
            <h1><b>{h.headline || 'Kami membangun pengalaman digital'}</b><br /><span>{h.headline_dim || 'yang menggerakkan bisnis Anda.'}</span></h1>
            <p className="lead">{h.subheadline || 'Website, aplikasi web, dan solusi digital custom — dirancang, dibangun, dan di-deploy sampai siap dipakai.'}</p>
            <div className="row"><a className="btn btn-blue" href="#work">{h.cta_primary || 'Lihat karya'}</a><a className="btn btn-ghost" href="#contact">{h.cta_secondary || 'Jadwalkan konsultasi'}</a></div>
          </div>
          <div className="logos wrap">{['Cloudflare', 'Supabase', 'React', 'TypeScript', 'PostgreSQL'].map(x => <span key={x}>{x}</span>)}</div>
        </section>
        <Services items={c?.services ?? []} />
        <Work items={c?.projects ?? []} />
        <Trust t={testi} />
        <div className="marquee" aria-hidden="true"><div>{mq}</div></div>
        <Process />
        <Packages />
        <Contact wa={wa} email={email} />
      </main>
      <footer className="foot dark"><div className="wrap"><a className="logo" href="#top">RUtusdev<span>.</span></a><p>Create. Build. Deploy. · © {new Date().getFullYear()} RUtusdev</p></div></footer>
    </>
  );
}
