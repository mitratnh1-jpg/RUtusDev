// Halaman SEO per wilayah & penawaran: /jasa (hub) dan /jasa/:slug. Data ada di shared/seoData.ts.
// Dirender di server (HTML penuh, tanpa JavaScript) supaya mudah dibaca crawler; tidak membutuhkan database.
import { REGIONS, OFFERS, NAV_REGIONS, NAV_OFFERS, SEO_LASTMOD, type Item, type Faq } from '../shared/seoData';
import { STEPS } from '../shared/siteFacts';

export type SeoPage = { title: string; desc: string; path: string; body: string; ld: unknown[]; kw?: string[] };
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export const SEO_PATHS: string[] = ['/jasa', ...REGIONS.map(r => `/jasa/${r.slug}`), ...OFFERS.map(o => `/jasa/${o.slug}`)];
export { SEO_LASTMOD };

const items = (a: Item[]) => `<ul class="svc-grid">${a.map(s => `<li><h3>${esc(s.t)}</h3><p>${esc(s.d)}</p></li>`).join('')}</ul>`;
const faqs = (a: Faq[]) => `<h2>Pertanyaan umum</h2><div class="faq">${a.map(f => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')}</div>`;
const links = (a: [string, string][], skip = '') => a.filter(([s]) => s !== skip).map(([s, t]) => `<a href="/jasa/${s}">${esc(t)}</a>`).join('');
const crumbs = (name?: string) => `<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Beranda</a><i>›</i>${name ? `<a href="/jasa">Jasa</a><i>›</i><span>${esc(name)}</span>` : '<span>Jasa</span>'}</nav>`;
const cta = `<p class="cta"><a class="btn btn-blue" href="/#contact">Minta penawaran</a> <a class="btn btn-line" href="/jasa">Semua layanan &amp; wilayah</a></p>`;
const steps = `<h2>Cara kerja</h2><ol class="steps-l">${STEPS.map(([b, p]) => `<li><b>${esc(b)}</b> ${esc(p)}</li>`).join('')}</ol>`;
const rel = (title: string, a: string) => `<h2>${title}</h2><p class="rel">${a}</p>`;

const crumbLd = (origin: string, path: string, name?: string) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Beranda', item: origin + '/' }, { '@type': 'ListItem', position: 2, name: 'Jasa', item: origin + '/jasa' },
    ...(name ? [{ '@type': 'ListItem', position: 3, name, item: origin + path }] : []) ] });
const faqLd = (a: Faq[]) => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: a.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });
const orgRef = (origin: string) => ({ '@id': origin + '/#organization' });

export function seoPage(path: string, origin: string): SeoPage | null {
  if (path === '/jasa') {
    const title = 'Jasa Website, Aplikasi & Sistem Informasi Jateng | RUtusdev';
    const desc = 'Jasa RUtusdev di Jawa Tengah: website company profile, aplikasi android, sistem informasi, dan toko online. Pilih wilayah: Batang, Pekalongan, Kendal, dan lainnya.';
    return { title, desc, path, kw: ['jasa pembuatan website jawa tengah', 'software house jawa tengah', 'web developer jawa tengah', 'vendor IT jawa tengah'],
      ld: [crumbLd(origin, path), { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Jasa RUtusdev', url: origin + path, isPartOf: { '@id': origin + '/#website' }, about: orgRef(origin) }],
      body: `${crumbs()}<h1>Jasa Pembuatan Website &amp; Aplikasi di Jawa Tengah</h1><p class="lead">Pilih wilayah atau jenis layanan yang Anda butuhkan. Semua dikerjakan RUtusdev dengan konsultasi online.</p>${cta}` +
        `<h2>Berdasarkan wilayah</h2><p class="rel">${links(NAV_REGIONS)}</p><h2>Berdasarkan kebutuhan</h2><p class="rel">${links(NAV_OFFERS)}</p>` };
  }
  const m = path.match(/^\/jasa\/([a-z0-9-]+)$/);
  if (!m) return null;
  const r = REGIONS.find(x => x.slug === m[1]);
  if (r) {
    const prov = r.slug === 'pembuatan-website-jawa-tengah';
    return { title: r.title, desc: r.desc, path, kw: r.kw,
      ld: [
        { '@context': 'https://schema.org', '@type': 'ProfessionalService', '@id': `${origin}${path}#service`, name: `RUtusdev — ${r.h1}`, url: origin + path, image: origin + '/og-image.png', description: r.desc,
          parentOrganization: orgRef(origin), areaServed: prov ? { '@type': 'AdministrativeArea', name: 'Jawa Tengah', containedInPlace: { '@type': 'Country', name: 'Indonesia' } } : [{ '@type': 'AdministrativeArea', name: r.name }, { '@type': 'AdministrativeArea', name: 'Jawa Tengah' }],
          hasOfferCatalog: { '@type': 'OfferCatalog', name: `Layanan di ${r.name}`, itemListElement: r.svcs.map(s => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: s.t, description: s.d } })) } },
        crumbLd(origin, path, r.name), faqLd(r.faq) ],
      body: `${crumbs(r.name)}<h1>${esc(r.h1)}</h1><p class="lead">${esc(r.lead)}</p>${cta}<h2>Layanan untuk bisnis di ${esc(r.name)}</h2>${items(r.svcs)}${steps}${faqs(r.faq)}` +
        rel('Layanan di wilayah lain', links(NAV_REGIONS, r.slug)) + rel('Kebutuhan lain', links(NAV_OFFERS.slice(0, 6))) };
  }
  const o = OFFERS.find(x => x.slug === m[1]);
  if (o) return { title: o.title, desc: o.desc, path, kw: o.kw,
    ld: [
      { '@context': 'https://schema.org', '@type': 'Service', '@id': `${origin}${path}#service`, name: o.h1, description: o.desc, url: origin + path, provider: orgRef(origin),
        areaServed: { '@type': 'AdministrativeArea', name: 'Jawa Tengah' }, serviceType: o.h1 },
      crumbLd(origin, path, o.h1), faqLd(o.faq) ],
    body: `${crumbs(o.h1)}<h1>${esc(o.h1)}</h1><p class="lead">${esc(o.lead)}</p>${cta}<h2>${esc(o.ptitle)}</h2>${items(o.points)}${faqs(o.faq)}` +
      rel('Layanan di wilayah Anda', links(NAV_REGIONS)) + rel('Layanan lainnya', links(NAV_OFFERS.filter(([x]) => x !== o.slug).slice(0, 5))) };
  return null;
}
