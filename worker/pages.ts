// Halaman publik yang dirender server (SEO): /articles, /articles/:slug, /work/:slug, /sitemap.xml, /robots.txt
import type { Env } from './index';
import { PROJECT_COLS, PROJECT_EMBED, shapeProject } from './projects';
import { seoPage, SEO_PATHS, SEO_LASTMOD } from './seoPages';

const MEDIA_KEY = /^uploads\/[0-9a-f-]{36}\.(png|jpg|webp|gif)$/;
const SLUG = /^[a-z0-9-]{1,100}$/;
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]!));
const inline = (t: string) => t.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" rel="noopener nofollow">$1</a>');
// Markdown minimal & aman: seluruh teks di-escape dulu, baru diberi tag; tautan hanya http(s).
function paras(src: unknown): string {
  const out: string[] = []; let para: string[] = [], list: string[] = [], code: string[] | null = null;
  const fp = () => { if (para.length) out.push(`<p>${inline(para.join('<br>'))}</p>`); para = []; };
  const fl = () => { if (list.length) out.push(`<ul>${list.map(i => `<li>${inline(i)}</li>`).join('')}</ul>`); list = []; };
  for (const line of esc(src).split('\n')) {
    if (line.startsWith('```')) { if (code) { out.push(`<pre><code>${code.join('\n')}</code></pre>`); code = null; } else { fp(); fl(); code = []; } continue; }
    if (code) { code.push(line); continue; }
    const h = line.match(/^(#{1,3}) (.+)/), li = line.match(/^[-*] (.+)/);
    if (h) { fp(); fl(); out.push(`<h${h[1].length + 1}>${inline(h[2])}</h${h[1].length + 1}>`); }
    else if (li) { fp(); list.push(li[1]); }
    else if (!line.trim()) { fp(); fl(); }
    else { fl(); para.push(line.trim()); }
  }
  if (code) out.push(`<pre><code>${code.join('\n')}</code></pre>`);
  fp(); fl(); return out.join('');
}
const ld = (o: unknown) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
// <img> responsif: lebar 320–1280 piksel, format AVIF/WebP dipilih Worker sesuai peramban (lihat media() di index.ts).
const pic = (key: unknown, alt: string, sizes: string, extra = '') => {
  const k = esc(key);
  return /\.gif$/.test(String(key)) ? `<img ${extra} src="/media/${k}" alt="${esc(alt)}">`
    : `<img ${extra} src="/media/${k}?w=960" srcset="${[320, 640, 960, 1280].map(w => `/media/${k}?w=${w} ${w}w`).join(', ')}" sizes="${sizes}" alt="${esc(alt)}">`;
};
const safeUrl = (u: unknown) => (/^https?:\/\//.test(String(u ?? '')) ? esc(u) : '');

async function get<T = any[]>(env: Env, path: string): Promise<T> {
  // Gagal ambil data (secret Supabase belum diisi, jaringan, dll.) tidak boleh membuat sitemap/halaman 500: kembalikan daftar kosong.
  try {
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, { headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } });
    return (r.ok ? await r.json() : []) as T;
  } catch (e) { console.error('pages.get', e); return [] as T; }
}

let BEACON = ''; // token Cloudflare Web Analytics (diisi dari env tiap request; konstan per deployment)
const beacon = () => (/^[a-f0-9]{32}$/i.test(BEACON) ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${BEACON}"}'></script>` : '');

type Page = { title: string; desc: string; path: string; og?: string; type?: string; body: string; ld?: unknown; status?: number; kw?: string[] };
const MARK = '<svg class="mark" viewBox="0 0 24 24" aria-hidden="true"><rect class="m-top" x="9" y="5" width="6" height="6" rx="1.5"/><rect x="2" y="13" width="6" height="6" rx="1.5"/><rect x="9" y="13" width="6" height="6" rx="1.5"/><rect x="16" y="13" width="6" height="6" rx="1.5"/></svg>';
// Ikon, manifest, dan warna tema: sama dengan index.html (sumber: logo RUtusdev). Berkas ada di web/public.
const ICONS = `<link rel="icon" href="/favicon.ico" sizes="48x48"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png"><link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"><link rel="mask-icon" href="/safari-pinned-tab.svg" color="#4755f6"><link rel="manifest" href="/site.webmanifest"><meta name="theme-color" content="#0a0a0a"><meta name="msapplication-TileColor" content="#0a0a0a"><meta name="msapplication-config" content="/browserconfig.xml">`;
function layout(origin: string, p: Page): Response {
  const url = origin + p.path, img = p.og ? `${origin}/media/${esc(p.og)}` : `${origin}/og-image.png`;
  const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(p.title)}</title><meta name="description" content="${esc(p.desc)}">${p.kw?.length ? `<meta name="keywords" content="${esc(p.kw.join(', '))}">` : ''}<link rel="canonical" href="${esc(url)}">
<meta name="robots" content="${p.status === 404 ? 'noindex' : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'}"><link rel="alternate" hreflang="id" href="${esc(url)}"><link rel="alternate" hreflang="x-default" href="${esc(url)}">
<meta name="geo.region" content="ID-JT"><meta name="geo.placename" content="Jawa Tengah">
<meta property="og:site_name" content="RUtusdev"><meta property="og:locale" content="id_ID"><meta property="og:type" content="${p.type || 'website'}"><meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.desc)}"><meta property="og:url" content="${esc(url)}"><meta property="og:image" content="${img}">${p.og ? '' : '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:type" content="image/png">'}<meta property="og:image:alt" content="${esc(p.title)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(p.title)}"><meta name="twitter:description" content="${esc(p.desc)}"><meta name="twitter:image" content="${img}">
${ICONS}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">${p.ld ? (Array.isArray(p.ld) ? p.ld.map(ld).join('') : ld(p.ld)) : ''}</head><body>
<header class="nav"><a class="logo" href="/">${MARK}RUtusdev</a><nav class="nav-links"><a href="/#services">Layanan</a><a href="/jasa">Jasa</a><a href="/#work">Karya</a><a href="/articles">Artikel</a><a href="/#contact">Kontak</a></nav><div class="nav-actions"><a class="btn btn-ghost" href="/articles">Artikel</a><a class="btn btn-blue" href="/#contact">Hubungi kami</a></div></header>
<main class="doc" data-nav="light"><div class="wrap">${p.body}</div></main>
<footer class="foot dark" data-nav="dark"><div class="wrap"><a class="logo" href="/">${MARK}RUtusdev</a><p>Rancang. Bangun. Luncurkan.</p><nav class="foot-links" aria-label="Layanan"><a href="/jasa">Semua layanan &amp; wilayah</a></nav></div></footer>${p.status === 404 ? '' : '<script type="module" src="/chat-embed.js"></script>'}${beacon()}</body></html>`;
  return new Response(html, { status: p.status || 200, headers: { 'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': p.status === 404 ? 'no-store' : 'public, max-age=0, must-revalidate' } });
}
const notFound = (o: string) => layout(o, { title: 'Halaman tidak ditemukan — RUtusdev', desc: 'Halaman tidak ditemukan.', path: '/404', status: 404,
  body: '<h1>Halaman tidak ditemukan</h1><p class="lead">Kembali ke <a href="/">beranda</a> atau lihat <a href="/jasa">layanan kami</a>.</p>' });

export async function pages(req: Request, env: Env, path: string): Promise<Response | null> {
  const origin = env.ALLOWED_ORIGIN || new URL(req.url).origin;
  BEACON = env.CF_BEACON_TOKEN || '';
  if (req.method !== 'GET') return null;

  if (path === '/robots.txt')
    return new Response(`User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${origin}/sitemap.xml\n`, { headers: { 'Content-Type': 'text/plain' } });

  if (path === '/sitemap.xml') {
    const [a, p, sv] = await Promise.all([get(env, 'articles?status=eq.published&select=slug,title,cover_key,created_at'), get(env, 'projects?status=eq.published&select=slug,title,cover_key,created_at,published_at'), get(env, 'services?is_published=eq.true&select=slug,created_at')]);
    // Sitemap gambar (xmlns:image): logo & OG di beranda, sampul artikel/karya agar gambar ikut terindeks Google Images.
    const im = (k: unknown, t?: unknown) => (MEDIA_KEY.test(String(k ?? '')) ? `<image:image><image:loc>${esc(origin + '/media/' + k)}</image:loc>${t ? `<image:title>${esc(t)}</image:title>` : ''}</image:image>` : '');
    const stat = (f: string, t: string) => `<image:image><image:loc>${esc(origin + f)}</image:loc><image:title>${esc(t)}</image:title></image:image>`;
    const u = (loc: string, d?: string, extra = '') => `<url><loc>${esc(origin + loc)}</loc>${d ? `<lastmod>${d.slice(0, 10)}</lastmod>` : ''}${extra}</url>`;
    const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">` +
      u('/', SEO_LASTMOD, stat('/logo.png', 'Logo RUtusdev') + stat('/og-image.png', 'RUtusdev — Jasa Pembuatan Website & Aplikasi Jawa Tengah')) + u('/articles') +
      SEO_PATHS.map(x => u(x, SEO_LASTMOD)).join('') +
      a.filter((x: any) => SLUG.test(x.slug || '')).map((x: any) => u('/articles/' + x.slug, x.created_at, im(x.cover_key, x.title))).join('') +
      p.filter((x: any) => SLUG.test(x.slug || '')).map((x: any) => u('/work/' + x.slug, x.published_at || x.created_at, im(x.cover_key, x.title))).join('') +
      sv.filter((x: any) => SLUG.test(x.slug || '')).map((x: any) => u('/services/' + x.slug, x.created_at)).join('') + '</urlset>';
    return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
  }

  // Halaman SEO per wilayah/penawaran (data statis, tanpa database).
  if (path === '/jasa' || path.startsWith('/jasa/')) {
    const sp = seoPage(path, origin);
    return sp ? layout(origin, sp) : notFound(origin);
  }

  if (path === '/articles') {
    // Paginasi: 12 artikel per halaman (?page=N). Mengambil satu baris ekstra untuk tahu apakah masih ada halaman berikutnya.
    const per = 12, pg = Math.max(1, Math.min(1000, Math.floor(Number(new URL(req.url).searchParams.get('page'))) || 1));
    const all = await get(env, `articles?status=eq.published&slug=not.is.null&select=title,slug,excerpt,created_at&order=created_at.desc&limit=${per + 1}&offset=${(pg - 1) * per}`);
    const more = all.length > per, a = all.slice(0, per);
    if (pg > 1 && !a.length) return notFound(origin);
    const pager = pg > 1 || more ? `<nav class="pager" aria-label="Halaman artikel">${pg > 1 ? `<a rel="prev" href="${pg === 2 ? '/articles' : '/articles?page=' + (pg - 1)}">← Lebih baru</a>` : '<span></span>'}<small>Halaman ${pg}</small>${more ? `<a rel="next" href="/articles?page=${pg + 1}">Lebih lama →</a>` : '<span></span>'}</nav>` : '';
    return layout(origin, { title: pg > 1 ? `Artikel (halaman ${pg}) — RUtusdev` : 'Artikel — RUtusdev', desc: 'Catatan tentang pengembangan website, web application, dan solusi digital.', path: pg > 1 ? `/articles?page=${pg}` : path,
      body: `<h1>Artikel</h1><div class="list">${a.length ? a.filter((x: any) => SLUG.test(x.slug || '')).map((x: any) =>
        `<a class="item" href="/articles/${x.slug}"><small>${esc((x.created_at || '').slice(0, 10))}</small><h2>${esc(x.title)}</h2><p>${esc(x.excerpt)}</p></a>`).join('') : '<p>Belum ada artikel.</p>'}</div>${pager}` });
  }

  const m = path.match(/^\/(articles|work|services)\/([^/]+)$/);
  if (m) {
    const [, kind, slug] = m;
    if (!SLUG.test(slug)) return notFound(origin);
    if (kind === 'services') {
      const [sv] = await get(env, `services?slug=eq.${slug}&is_published=eq.true&select=title,slug,summary,description,created_at&limit=1`);
      if (!sv) return notFound(origin);
      return layout(origin, { title: `${sv.title} — Layanan | RUtusdev`, desc: sv.summary || sv.title, path,
        ld: { '@context': 'https://schema.org', '@type': 'Service', name: sv.title, description: sv.summary, provider: { '@type': 'Organization', name: 'RUtusdev' } },
        body: `<p><a href="/#services">← Layanan</a></p><h1>${esc(sv.title)}</h1><p class="lead">${esc(sv.summary)}</p><div class="prose">${paras(sv.description)}</div>` +
          `<p class="cta"><a class="btn btn-blue" href="/#contact">Minta penawaran</a></p>` });
    }
    if (kind === 'articles') {
      const [a] = await get(env, `articles?slug=eq.${slug}&status=eq.published&select=*&limit=1`);
      if (!a) return notFound(origin);
      return layout(origin, { title: a.seo_title || `${a.title} — RUtusdev`, desc: a.seo_description || a.excerpt || a.title, path, og: a.cover_key, type: 'article',
        ld: { '@context': 'https://schema.org', '@type': 'Article', headline: a.title, description: a.seo_description || a.excerpt, datePublished: a.created_at,
          mainEntityOfPage: origin + path, publisher: { '@type': 'Organization', name: 'RUtusdev' }, ...(a.cover_key ? { image: `${origin}/media/${a.cover_key}` } : {}) },
        body: `<p><a href="/articles">← Artikel</a></p><h1>${esc(a.title)}</h1><p class="meta">${esc((a.created_at || '').slice(0, 10))}</p>${
          a.cover_key ? pic(a.cover_key, a.title, '(max-width: 760px) 100vw, 800px', 'class="cover"') : ''}<div class="prose">${paras(a.body)}</div>` });
    }
    const [raw] = await get(env, `projects?slug=eq.${slug}&status=eq.published&select=${PROJECT_COLS},${PROJECT_EMBED}&limit=1`);
    if (!raw) return notFound(origin);
    const p = shapeProject(raw), tech = p.technologies, demo = safeUrl(p.demo_url);
    const gal = p.gallery.filter(g => MEDIA_KEY.test(g.object_key));
    return layout(origin, { title: `${p.title} — Studi kasus | RUtusdev`, desc: p.summary || p.title, path, og: p.cover_key,
      ld: { '@context': 'https://schema.org', '@type': 'CreativeWork', name: p.title, description: p.summary, creator: { '@type': 'Organization', name: 'RUtusdev' },
        datePublished: p.published_at || p.created_at, ...(demo ? { url: demo } : {}), ...(p.cover_key ? { image: `${origin}/media/${p.cover_key}` } : {}) },
      body: `<p><a href="/#work">← Karya pilihan</a></p><h1>${esc(p.title)}</h1><p class="lead">${esc(p.summary)}</p>${
        p.cover_key ? pic(p.cover_key, p.title, '(max-width: 760px) 100vw, 800px', 'class="cover"') : ''}<p class="chips">${
        [p.category, ...tech].filter(Boolean).map(t => `<span>${esc(t)}</span>`).join('')}</p><div class="prose">${paras(p.body)}</div>${
        gal.length ? `<div class="gallery">${gal.map(g => pic(g.object_key, g.alt_text || p.title, '(max-width: 760px) 100vw, 50vw', 'loading="lazy"')).join('')}</div>` : ''}${
        demo ? `<p><a class="btn btn-blue" href="${demo}" target="_blank" rel="noopener">Lihat demo langsung</a></p>` : ''}` });
  }
  return null;
}
