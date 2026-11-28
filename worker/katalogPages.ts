// Halaman katalog layanan: /layanan (hub) dan /layanan/:slug (halaman anak per kategori). Data di shared/katalog.ts.
// Dirender di server (HTML penuh, tanpa JavaScript) seperti halaman /jasa, jadi tidak membutuhkan database dan mudah dibaca crawler.
import { KATALOG, KATALOG_NOTE, KATALOG_CLOSING, PRINSIP, KEAMANAN, KEAMANAN_NOTE, GARANSI, KETENTUAN, PEMBAYARAN, ALUR, ICON_SVG, TIER_LABELS, TIER_HINTS, price, type KCat, type KItem } from '../shared/katalog';

export type KatalogPage = { title: string; desc: string; path: string; body: string; ld: unknown[]; kw?: string[]; wide: true };
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export const KATALOG_PATHS: string[] = ['/layanan', ...KATALOG.map(k => `/layanan/${k.slug}`)];

const crumbs = (name?: string) => `<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Beranda</a><i>›</i>${name ? `<a href="/layanan">Layanan</a><i>›</i><span>${esc(name)}</span>` : '<span>Layanan</span>'}</nav>`;
const cta = (extra = '', slug = '') => `<p class="cta"><a class="btn btn-blue" href="/${slug ? '?pilih=' + slug : ''}#contact">Minta penawaran</a>${extra || '<a class="btn btn-line" href="/layanan">Semua layanan</a>'}</p>`;
const note = (t: string) => `<aside class="kt-note"><span aria-hidden="true">i</span><p>${esc(t)}</p></aside>`;

// Ikon besar samar di pojok kanan bawah kartu.
const wm = (icon: string) => `<svg class="kt-wm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_SVG[icon] || ''}</svg>`;
const tiers = (i: KItem) => i.tiers?.length ? `<details class="kt-more"><summary>Lihat kompleksitas &amp; fitur</summary><ol class="kt-tiers">${i.tiers.map((f, n) => `<li><b>${TIER_LABELS[n] || ''}</b><em>${TIER_HINTS[n] || ''}</em><ul>${f.map(x => `<li>${esc(x)}</li>`).join('')}</ul></li>`).join('')}</ol><p class="kt-tn">Harga akhir ditetapkan setelah analisis kebutuhan.</p></details>` : '';
const card = (i: KItem, n: number, icon: string) => `<li class="kt-card" style="--i:${n}">${wm(icon)}<h3>${esc(i.n)}</h3><p class="kt-price">${esc(price(i))}</p>${i.sub ? `<p class="kt-sub">${esc(i.sub)}</p>` : ''}${i.d ? `<p class="kt-d">${esc(i.d)}</p>` : ''}${tiers(i)}</li>`;
const info = (t: string, d: string, i: number, icon: string) => `<li class="kt-card" style="--i:${i}">${wm(icon)}<h3>${esc(t)}</h3><p class="kt-d">${esc(d)}</p></li>`;
const mini = (i: KItem) => `<li><span>${esc(i.n)}</span><b>${esc(price(i))}</b></li>`;

function pricePage(k: KCat): string {
  const groups = k.groups.map((g, gi) => {
    const addon = gi > 0; // grup kedua dst. (mis. add-on toko online) tampil sebagai daftar ringkas
    return `${g.title ? `<h2>${esc(g.title)}</h2>` : ''}${g.intro ? `<p class="kt-intro">${esc(g.intro)}</p>` : ''}` +
      (addon ? `<ul class="kt-list">${g.items.map(mini).join('')}</ul>` : `<ul class="kt-grid">${g.items.map((x, n) => card(x, n, k.icon)).join('')}</ul>`);
  }).join('');
  const others = KATALOG.filter(x => x.slug !== k.slug).map(x => `<a href="/layanan/${x.slug}">${esc(x.short)}</a>`).join('');
  return `${crumbs(k.short)}<header class="kt-head"><p class="kt-tag">Bagian ${k.no} katalog</p><h1>${esc(k.title)}</h1><p class="lead">${esc(k.summary)}</p>` +
    `<p class="kt-hl"><span>Estimasi</span><b>${esc(k.headline)}</b></p>${cta('', k.slug)}</header>` +
    (k.audience ? `<p class="kt-aud"><b>Cocok untuk:</b> ${esc(k.audience)}</p>` : '') +
    groups + k.notes.map(note).join('') +
    (k.slug === 'cloud-server' ? `<p class="kt-small"><a href="/jasa/jasa-pembuatan-website-aplikasi-cloud-hosting">Panduan lengkap: batas traffic, pengguna, database, dan storage tiap paket →</a></p>` : '') +
    `<h2>Yang perlu Anda ketahui</h2><ul class="kt-facts"><li>Biaya pengembangan dibayar <b>satu kali</b> sesuai ruang lingkup yang disepakati.</li><li><b>Domain</b> dibeli terpisah, idealnya atas nama dan akun Anda.</li><li><b>Cloud/server berbayar</b> hanya jika kebutuhan Anda memerlukannya.</li><li>Biaya <b>pihak ketiga</b> (payment gateway, WhatsApp API, SMS, email premium) dibayar sesuai tagihan penyedia.</li></ul>` +
    `<p class="kt-small">${esc(KATALOG_NOTE)} <a href="/layanan/ketentuan">Baca ketentuan kerja sama</a>.</p>` +
    `<h2>Layanan lainnya</h2><p class="rel">${others}</p>${cta('', k.slug)}`;
}

function securityPage(k: KCat): string {
  return `${crumbs(k.short)}<header class="kt-head"><p class="kt-tag">Bagian ${k.no} katalog</p><h1>${esc(k.title)}</h1><p class="lead">${esc(k.summary)}</p><p class="kt-hl"><span>Komitmen</span><b>${esc(k.headline)}</b></p>${cta()}</header>` +
    `<h2>Standar keamanan yang diterapkan</h2><ul class="kt-grid kt-grid-s">${KEAMANAN.map(([t, d], i) => info(t, d, i, 'lock')).join('')}</ul>${note(KEAMANAN_NOTE)}` +
    `<h2>Jaminan bug, keamanan &amp; tanggung jawab</h2><div class="kt-acc">${GARANSI.map(([c, t, d], i) => `<details${i < 2 ? ' open' : ''}><summary><i>${c}</i><span>${esc(t)}</span></summary><p>${esc(d)}</p></details>`).join('')}</div>` +
    `<h2>Prinsip layanan</h2><ul class="kt-grid kt-grid-s">${PRINSIP.map(([t, d], i) => info(t, d, i, 'shield')).join('')}</ul>` +
    `<p class="kt-small"><a href="/layanan/ketentuan">Ketentuan kerja sama &amp; alur pengembangan →</a></p>${cta()}`;
}

function termsPage(k: KCat): string {
  return `${crumbs(k.short)}<header class="kt-head"><p class="kt-tag">Bagian ${k.no} katalog</p><h1>${esc(k.title)}</h1><p class="lead">${esc(k.summary)}</p><p class="kt-hl"><span>Pembayaran disarankan</span><b>${esc(k.headline)}</b></p>${cta()}</header>` +
    `<h2>Alur pengembangan</h2><ol class="kt-flow">${ALUR.map(([t, d], i) => `<li style="--i:${i}"><i>${i + 1}</i><h3>${esc(t)}</h3><p>${esc(d)}</p></li>`).join('')}</ol>` +
    `<h2>Skema pembayaran yang disarankan</h2><div class="kt-pay" role="list">${PEMBAYARAN.map(([t, p, d]) => `<div role="listitem" style="flex:${p}"><b>${p}%</b><span>${esc(t)}</span><small>${esc(d)}</small></div>`).join('')}</div>` +
    `<h2>Ketentuan kerja sama</h2><ol class="kt-terms">${KETENTUAN.map(t => `<li>${esc(t)}</li>`).join('')}</ol>${note(KATALOG_CLOSING)}` +
    `<p class="kt-small"><a href="/layanan/keamanan-garansi">Jaminan keamanan &amp; garansi bug →</a></p>${cta()}`;
}

export function katalogPage(path: string, origin: string): KatalogPage | null {
  const bc = (name?: string, p?: string) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Beranda', item: origin + '/' }, { '@type': 'ListItem', position: 2, name: 'Layanan', item: origin + '/layanan' },
    ...(name ? [{ '@type': 'ListItem', position: 3, name, item: origin + p }] : []) ] });
  const org = { '@id': origin + '/#organization' };

  if (path === '/layanan') {
    const priced = KATALOG.filter(k => k.kind === 'price');
    const body = `${crumbs()}<header class="kt-head"><p class="kt-tag">Katalog layanan</p><h1>Layanan Website &amp; Aplikasi</h1><p class="lead">Paket pengembangan, cloud hosting, pemeliharaan, serta jaminan keamanan dan tanggung jawab teknis. Solusi digital yang terukur, transparan, dan dapat dipelihara.</p>${cta('<a class="btn btn-line" href="/layanan/ketentuan">Ketentuan kerja sama</a>')}</header>` +
      `<ul class="kt-hub">${KATALOG.map((k, i) => `<li style="--i:${i}"><a href="/layanan/${k.slug}">${wm(k.icon)}<span class="kt-no">${k.no}</span><h2>${esc(k.short)}</h2><p class="kt-hp">${esc(k.headline)}</p><p>${esc(k.summary)}</p><span class="kt-go">Lihat detail <i>→</i></span></a></li>`).join('')}</ul>` +
      `<h2>Prinsip layanan</h2><ul class="kt-grid kt-grid-s">${PRINSIP.map(([t, d], i) => info(t, d, i, 'shield')).join('')}</ul>` +
      `<h2>Penawaran yang transparan</h2><p class="kt-intro">Setiap proyek memiliki rincian biaya pengembangan, domain, cloud/server, layanan pihak ketiga, dan pemeliharaan secara terpisah. Dengan begitu Anda mengetahui apa yang dibayar, apa yang dijamin, serta kapan perlu meningkatkan paket.</p>${note(KATALOG_NOTE)}${cta()}`;
    return { title: 'Katalog Layanan Website & Aplikasi — Harga & Jaminan | RUtusdev', path, wide: true, body,
      desc: 'Katalog harga website, toko online, aplikasi web, cloud hosting, dan maintenance dari RUtusdev, lengkap dengan garansi bug 30 hari dan ketentuan kerja sama yang jelas.',
      kw: ['harga pembuatan website', 'biaya pembuatan aplikasi web', 'jasa website murah', 'katalog layanan website', 'harga toko online', 'maintenance website'],
      ld: [bc(), { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Katalog Layanan RUtusdev', url: origin + path, isPartOf: { '@id': origin + '/#website' }, about: org },
        { '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: priced.map((k, i) => ({ '@type': 'ListItem', position: i + 1, name: k.title, url: `${origin}/layanan/${k.slug}` })) }] };
  }

  const m = path.match(/^\/layanan\/([a-z0-9-]+)$/), k = m && KATALOG.find(x => x.slug === m[1]);
  if (!k) return null;
  const body = k.kind === 'security' ? securityPage(k) : k.kind === 'terms' ? termsPage(k) : pricePage(k);
  const offers = k.groups.flatMap(g => g.items).filter(i => i.lo != null).map(i => ({ '@type': 'Offer', priceCurrency: 'IDR', itemOffered: { '@type': 'Service', name: i.n, ...(i.d ? { description: i.d } : {}) },
    priceSpecification: { '@type': 'PriceSpecification', priceCurrency: 'IDR', minPrice: i.lo, ...(i.hi != null ? { maxPrice: i.hi } : {}) } }));
  return { title: k.seo.title, desc: k.seo.desc, path, wide: true, body, kw: [k.short.toLowerCase(), `harga ${k.short.toLowerCase()}`, 'RUtusdev'],
    ld: [bc(k.short, path), { '@context': 'https://schema.org', '@type': 'Service', '@id': `${origin}${path}#service`, name: k.title, description: k.seo.desc, url: origin + path, provider: org,
      areaServed: { '@type': 'AdministrativeArea', name: 'Jawa Tengah' }, serviceType: k.short, ...(offers.length ? { hasOfferCatalog: { '@type': 'OfferCatalog', name: k.title, itemListElement: offers } } : {}) }] };
}
