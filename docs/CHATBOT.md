# Chatbot "Asisten RUtusdev" + perbaikan CAPTCHA formulir kontak

## CAPTCHA formulir kontak
Temuan: bundle memuat placeholder `GANTI_DENGAN_TURNSTILE_SITE_KEY` (dari `web/.env`), jadi widget tidak dirender dan setiap kiriman
valid ditolak server (400 `captcha`) dengan pesan umum. Server sendiri sudah memverifikasi token dan membatasi laju sejak awal.
Perubahan:
- Site key kini dibaca saat runtime dari `/api/public/config` (variabel `TURNSTILE_SITE_KEY` di Worker) bila `VITE_TURNSTILE_SITE_KEY` kosong/placeholder.
- Tanpa key sama sekali / skrip diblokir: pesan jelas dan tombol kirim nonaktif. Token di-reset setelah setiap kiriman.
- Worker (`verifyTurnstile`): batas waktu 5 dtk, gagal tertutup (503 bila secret kosong/siteverify tak terjangkau), memeriksa `hostname` dan `action` = `lead`
  (token widget login admin atau situs lain tidak bisa dipakai), `remoteip` hanya dikirim bila ada.
**Yang harus Anda pastikan:** `TURNSTILE_SECRET` (secret) dan `TURNSTILE_SITE_KEY` (variabel) terisi di Cloudflare, lalu deploy ulang.

## Chatbot
- Tombol pertanyaan cepat dijawab dari FAQ bawaan (`shared/chatFaq.ts`), tanpa server/AI.
- Pertanyaan bebas -> `POST /api/chat` -> Workers AI dengan potongan informasi paling relevan (layanan, karya, artikel, paket, proses, kontak dari CMS; pencarian BM25).
  Kuota habis / AI error / binding tidak ada -> otomatis FAQ (label "Mode FAQ").
- Tidak ada IP maupun isi pesan yang disimpan atau dicatat di log. Maks 10 pesan/menit/IP (`RATE_LIMITER_CHAT`).
- Warna tombol dan jendela mengikuti bagian halaman di belakangnya (light / dark / blue, palet sama dengan header).
- Variabel opsional: `CHAT_MODEL` (model pertama yang dicoba), `CHAT_ENABLED="false"` (matikan AI, FAQ saja).
- Fakta situs (proses, paket, stack) ada di `shared/siteFacts.ts` dan dipakai halaman dan chatbot sekaligus.
- Tampil hanya setelah pengunjung menggulir keluar dari Hero (Hero bersih dari chatbot); kembali ke Hero = tombol/jendela disembunyikan lagi, percakapan tetap tersimpan.
- Suara (hanya bila peramban mendukung): tombol mikrofon mengisi kolom ketik dengan hasil ucapan (bahasa `id-ID`, API Web Speech milik peramban; di Chrome audio diproses server peramban),
  tombol speaker di header menyalakan baca otomatis jawaban, dan tiap jawaban punya tombol "Dengarkan". Pertanyaan yang diucapkan otomatis dibacakan jawabannya.
  `AUTO_SEND_VOICE` di `web/src/Chat.tsx` (default `false`) mengatur apakah hasil ucapan langsung dikirim. Butuh `microphone=(self)` di Permissions-Policy
  (`web/public/_headers` dan `worker/security.ts`; API dan `/admin` tetap menutup mikrofon).
- Tidak termasuk (dibanding Muhiba): statistik pertanyaan di admin.
