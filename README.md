# RUtusdev — Landing Page (Fase 1, tahap Frontend)

Gaya visual terinspirasi situs teknologi modern (hero gelap dengan partikel, section gelap/terang/biru,
marquee besar, kartu mock UI, label mono). Palet dan font mengikuti dokumen arsitektur.

## Jalankan lokal
    npx serve .        # atau buka index.html langsung

## Deploy ke Cloudflare (Workers Assets)
    npx wrangler deploy      # memakai wrangler.jsonc

## Yang perlu dilakukan berikutnya
- Ganti nomor WhatsApp (index.html: wa.me/6280000000000) dan email.
- Ganti konten contoh (Selected work, testimoni, statistik) dengan data nyata.
- Buat Worker `POST /api/leads` (validasi + Turnstile + rate limit + simpan ke Supabase).
- Pindahkan ke React + Vite + TS saat CMS/Admin mulai dibangun.
