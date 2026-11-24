// Halaman publik yang dirender server (SEO): /articles, /articles/:slug, /work/:slug, /sitemap.xml, /robots.txt
import type { Env } from './index';

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
const safeUrl = (u: unknown) => (/^https?:\/\//.test(String(u ?? '')) ? esc(u) : '');

async function get<T = any[]>(env: Env, path: string): Promise<T> {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, { headers: {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } });
  return (r.ok ? r.json() : []) as Promise<T>;
}

type Page = { title: string; desc: string; path: string; og?: string; type?: string; body: string; ld?: unknown; status?: number };
function layout(origin: string, p: Page): Response {
  const url = origin + p.path, img = p.og ? `${origin}/media/${esc(p.og)}` : '';
  const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(p.title)}</title><meta name="description" content="${esc(p.desc)}"><link rel="canonical" href="${esc(url)}">
<meta property="og:site_name" content="RUtusdev"><meta property="og:type" content="${p.type || 'website'}"><meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.desc)}"><meta property="og:url" content="${esc(url)}">${img ? `<meta property="og:image" content="${img}">` : ''}
<meta name="twitter:card" content="${img ? 'summary_large_image' : 'summary'}">${p.status === 404 ? '<meta name="robots" content="noindex">' : ''}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@300;400;500;600;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">${p.ld ? ld(p.ld) : ''}</head><body>
<header class="nav"><a class="logo" href="/"><svg class="mark" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="13" width="6" height="6" rx="1.5"/><rect x="9" y="13" width="6" height="6" rx="1.5"/><rect x="16" y="13" width="6" height="6" rx="1.5"/><rect x="9" y="5" width="6" height="6" rx="1.5"/></svg>RUtusdev</a><nav class="nav-links"><a href="/#services">Layanan</a><a href="/#work">Karya</a><a href="/articles">Artikel</a><a href="/#contact">Kontak</a></nav><div class="nav-actions"><a class="btn btn-ghost" href="/articles">Artikel</a><a class="btn btn-blue" href="/#contact">Hubungi kami</a></div></header>
<main class="doc"><div class="wrap">${p.body}</div></main>
<footer class="foot dark"><div class="wrap"><a class="logo" href="/">RUtusdev</a><p>Rancang. Bangun. Luncurkan.</p></div></footer></body></html>`;
  return new Response(html, { status: p.status || 200, headers: { 'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': p.status === 404 ? 'no-store' : 'public, max-age=60, s-maxage=300' } });
}
const notFound = (o: string) => layout(o, { title: 'Halaman tidak ditemukan — RUtusdev', desc: 'Halaman tidak ditemukan.', path: '/404', status: 404,
  body: '<h1>Halaman tidak ditemukan</h1><p class="lead">Kembali ke <a href="/">beranda</a> atau lihat <a href="/articles">artikel</a>.</p>' });

export async function pages(req: Request, env: Env, path: string): Promise<Response | null> {
  const origin = env.ALLOWED_ORIGIN || new URL(req.url).origin;
  if (req.method !== 'GET') return null;

  if (path === '/robots.txt')
    return new Response(`User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\n\nSitemap: ${origin}/sitemap.xml\n`, { headers: { 'Content-Type': 'text/plain' } });

  if (path === '/sitemap.xml') {
    const [a, p] = await Promise.all([get(env, 'articles?status=eq.published&select=slug,created_at'), get(env, 'projects?is_published=eq.true&select=slug,created_at')]);
    const u = (loc: string, d?: string) => `<url><loc>${esc(origin + loc)}</loc>${d ? `<lastmod>${d.slice(0, 10)}</lastmod>` : ''}</url>`;
    const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${u('/')}${u('/articles')}` +
      a.filter((x: any) => SLUG.test(x.slug || '')).map((x: any) => u('/articles/' + x.slug, x.created_at)).join('') +
      p.filter((x: any) => SLUG.test(x.slug || '')).map((x: any) => u('/work/' + x.slug, x.created_at)).join('') + '</urlset>';
    return new Response(xml, { headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=300' } });
  }

  if (path === '/articles') {
    const a = await get(env, 'articles?status=eq.published&select=title,slug,excerpt,created_at&order=created_at.desc&limit=50');
    return layout(origin, { title: 'Artikel — RUtusdev', desc: 'Catatan tentang pengembangan website, web application, dan solusi digital.', path,
      body: `<h1>Artikel</h1><div class="list">${a.length ? a.filter((x: any) => SLUG.test(x.slug || '')).map((x: any) =>
        `<a class="item" href="/articles/${x.slug}"><small>${esc((x.created_at || '').slice(0, 10))}</small><h2>${esc(x.title)}</h2><p>${esc(x.excerpt)}</p></a>`).join('') : '<p>Belum ada artikel.</p>'}</div>` });
  }

  const m = path.match(/^\/(articles|work)\/([^/]+)$/);
  if (m) {
    const [, kind, slug] = m;
    if (!SLUG.test(slug)) return notFound(origin);
    if (kind === 'articles') {
      const [a] = await get(env, `articles?slug=eq.${slug}&status=eq.published&select=*&limit=1`);
      if (!a) return notFound(origin);
      return layout(origin, { title: a.seo_title || `${a.title} — RUtusdev`, desc: a.seo_description || a.excerpt || a.title, path, og: a.cover_key, type: 'article',
        ld: { '@context': 'https://schema.org', '@type': 'Article', headline: a.title, description: a.seo_description || a.excerpt, datePublished: a.created_at,
          mainEntityOfPage: origin + path, publisher: { '@type': 'Organization', name: 'RUtusdev' }, ...(a.cover_key ? { image: `${origin}/media/${a.cover_key}` } : {}) },
        body: `<p><a href="/articles">← Artikel</a></p><h1>${esc(a.title)}</h1><p class="meta">${esc((a.created_at || '').slice(0, 10))}</p>${
          a.cover_key ? `<img class="cover" src="/media/${esc(a.cover_key)}" alt="${esc(a.title)}">` : ''}<div class="prose">${paras(a.body)}</div>` });
    }
    const [p] = await get(env, `projects?slug=eq.${slug}&is_published=eq.true&select=*&limit=1`);
    if (!p) return notFound(origin);
    const tech = (p.technologies || []) as string[], demo = safeUrl(p.demo_url);
    return layout(origin, { title: `${p.title} — Studi kasus | RUtusdev`, desc: p.summary || p.title, path, og: p.cover_key,
      ld: { '@context': 'https://schema.org', '@type': 'CreativeWork', name: p.title, description: p.summary, creator: { '@type': 'Organization', name: 'RUtusdev' },
        datePublished: p.created_at, ...(demo ? { url: demo } : {}), ...(p.cover_key ? { image: `${origin}/media/${p.cover_key}` } : {}) },
      body: `<p><a href="/#work">← Karya pilihan</a></p><h1>${esc(p.title)}</h1><p class="lead">${esc(p.summary)}</p>${
        p.cover_key ? `<img class="cover" src="/media/${esc(p.cover_key)}" alt="${esc(p.title)}">` : ''}<p class="chips">${
        [p.category, ...tech].filter(Boolean).map(t => `<span>${esc(t)}</span>`).join('')}</p><div class="prose">${paras(p.body)}</div>${
        demo ? `<p><a class="btn btn-blue" href="${demo}" target="_blank" rel="noopener">Lihat demo langsung</a></p>` : ''}` });
  }
  return null;
}
