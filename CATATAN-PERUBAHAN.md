# Perubahan: Katalog layanan (dari PDF) di landing + halaman anak

Salin file-file di zip ini ke proyek (struktur folder sama), timpa yang lama. wrangler.jsonc dan env TIDAK disentuh.

BARU
- shared/katalog.ts            data katalog (satu sumber: landing, halaman anak, chatbot)
- worker/katalogPages.ts       halaman /layanan dan /layanan/:slug (dirender server, latar putih)
- web/src/Catalog.tsx          slider kartu layanan di landing

DIUBAH
- web/src/App.tsx              Catalog di bagian Layanan; Paket jadi putih + harga + biaya berulang; link footer
- web/public/styles.css        gaya kartu slide, Paket putih, halaman anak (ditambahkan di akhir file)
- worker/pages.ts              rute /layanan, sitemap, menu & footer halaman server
- shared/siteFacts.ts          PACKAGES berisi harga katalog (+ RECURRING)
- shared/chatFaq.ts            jawaban chatbot (harga, paket, garansi, biaya bulanan) memakai katalog
- worker/chat.ts               pengetahuan chatbot AI memuat katalog, garansi, skema pembayaran

Setelah menyalin: npm run build (atau deploy seperti biasa).

TAMBAHAN: artikel panduan cloud hosting (hanya tampil bila dibuka, tidak ada di landing)
- worker/panduanCloud.ts   (baru) halaman /jasa/jasa-pembuatan-website-aplikasi-cloud-hosting
- worker/pages.ts          rute artikel + sitemap
- shared/seoNav.ts         tautan di hub /jasa dan daftar "layanan lainnya" halaman /jasa
- worker/katalogPages.ts   tautan dari /layanan/cloud-server
- web/public/styles.css    gaya tabel & daftar isi artikel

TAMBAHAN: infografis di artikel panduan cloud hosting (3 gambar)
- web/public/artikel/*.webp  (baru) 3 gambar x 2 ukuran (836 & 1672 px), dari PNG ~1,9 MB menjadi ~190-235 KB. Salin folder ini ke web/public/artikel/
- worker/panduanCloud.ts     helper fig() + 3 gambar: ringkasan (atas, sebelum daftar isi), pilihan infrastruktur (bagian Klasifikasi Kapasitas), perbandingan hosting (akhir bagian Cloudflare & Supabase); gambar ditambahkan ke JSON-LD Article
- web/public/styles.css      gaya .ar-fig (ditambahkan di akhir file)

TAMBAHAN: artikel panduan tampil di daftar artikel + landing; formulir kontak bertema biru
- shared/panduanMeta.ts (baru)  judul, ringkasan, tanggal, sampul: satu sumber untuk 3 tempat
- worker/panduanCloud.ts        memakai panduanMeta
- worker/pages.ts               /articles halaman 1: artikel panduan di paling atas dengan sampul infografis
- web/src/types.ts, App.tsx     kartu pertama di bagian "Dari artikel" di landing (tautan ke /jasa/...-cloud-hosting)
- web/src/Contact.tsx           bagian Kontak: dark -> blue (data-nav="blue"), Turnstile tema terang
- web/public/styles.css         gaya formulir biru (.contact-s) + daftar artikel bersampul (ditambahkan di akhir file)

TAMBAHAN: scroll landing lebih ringan (anti-lag)
- web/src/scroll.ts          handler scroll dua fase: semua pembacaan layout dulu, baru semua penulisan (tidak ada layout thrashing)
- web/src/App.tsx            Nav/Hero/Trust/Progress: tinggi di-cache, render ulang & penulisan style hanya saat nilai berubah; hero berhenti menulis setelah lewat
- web/src/Chat.tsx           setPast hanya dipanggil saat berubah (sebelumnya bisa merender ulang Chat tiap frame saat scroll)
- web/src/useSectionTheme.ts sama: hanya setState saat tema berganti
- web/src/Dots.tsx           ±30 fps, berhenti saat tab tersembunyi
- web/src/CodeRain.tsx       ±15 fps (kartu belakang ±5), resolusi maks 1,5x, fillStyle tidak diganti berulang
- web/public/styles.css      backdrop-filter pada nav & tombol chat dibuang (latar dipekatkan), will-change kartu hanya saat disentuh, content-visibility pada #articles & #clients (ditambahkan di akhir file)
