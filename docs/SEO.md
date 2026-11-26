# SEO RUtusdev

## Struktur
- **Landing (`/`)**: ringkas. Meta, Open Graph, Twitter, ikon, dan JSON-LD (Organization, WebSite, WebPage, ProfessionalService) ada di `web/index.html`.
- **Halaman kata kunci (`/jasa`, `/jasa/:slug`)**: dirender Worker sebagai HTML penuh (tanpa JavaScript). Isi ada di `shared/seoData.ts`:
  6 wilayah (Jawa Tengah, Batang, Pekalongan, Kendal, Pemalang, Wonosobo, Banjarnegara) + 10 halaman kebutuhan (harga, aplikasi, kasir/stok, ERP/HRIS, toko online, vendor, redesign, maintenance, dst).
  Tiap halaman memuat title, description, canonical, breadcrumb, FAQ + JSON-LD (Service/ProfessionalService, BreadcrumbList, FAQPage).
- **Sitemap (`/sitemap.xml`)**: beranda, `/jasa/*`, artikel, karya, layanan CMS, plus sitemap gambar (logo, OG, sampul artikel/karya). `lastmod` halaman `/jasa/*` = `SEO_LASTMOD` di `shared/seoData.ts`.
- **robots.txt**: Allow semua, Disallow `/api/`, menunjuk sitemap. Panel admin dilindungi header `noindex`.

## Ikon (dari logo, di `web/public`)
favicon.ico (16/32/48), favicon.svg, favicon-16/32/48.png, apple-touch-icon.png, android-chrome-192/512.png, maskable-512.png,
mstile-150x150.png, safari-pinned-tab.svg, site.webmanifest, browserconfig.xml, logo.png, logo-square.png (1200x1200, untuk schema logo), og-image.png (1200x630).

## Setelah deploy
1. Pastikan `ALLOWED_ORIGIN` (wrangler.jsonc) dan `VITE_SITE_URL` (web/.env) berisi domain final.
2. Google Search Console: tambahkan properti domain, kirim `https://DOMAIN/sitemap.xml`, lalu "Inspeksi URL" + "Minta pengindeksan" untuk `/` dan `/jasa`.
3. Bing Webmaster Tools: impor dari Search Console.
4. Uji: Rich Results Test (FAQ, Breadcrumb), PageSpeed Insights, dan cek `https://DOMAIN/favicon.ico`.
5. Admin → Pengaturan → Hero: isi *Label atas* dan *Judul utama* dengan kata kunci utama (mis. "Software house & jasa pembuatan website Jawa Tengah"); nilai dari CMS menimpa teks bawaan.
6. Buat Google Business Profile bila ada alamat/lokasi fisik, lalu tambahkan alamat & telepon ke JSON-LD (`web/index.html`).
7. Tulis artikel lokal di Admin → Artikel (mis. "Biaya website company profile di Jawa Tengah"), lengkapi SEO title/description.
