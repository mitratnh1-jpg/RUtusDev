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
