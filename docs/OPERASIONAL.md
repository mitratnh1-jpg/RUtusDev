# Operasional RUtusdev — Backup, Pemulihan, Checklist Rilis

## Backup (minimal mingguan; simpan di lokasi terpisah)
**Database** (connection string ada di Supabase → Project Settings → Database):
    pg_dump "$SUPABASE_DB_URL" --no-owner --format=custom -f rutusdev-$(date +%F).dump
Simpan juga folder `supabase/` (SQL skema) di repository privat.

**Media R2**: sinkronkan bucket `rutusdev-media` ke penyimpanan lain, misalnya dengan rclone (S3-compatible endpoint R2).

## Pemulihan
1. Buat proyek Supabase baru → jalankan `supabase/schema.sql`.
2. Restore data: `pg_restore --no-owner -d "$SUPABASE_DB_URL" --data-only rutusdev-YYYY-MM-DD.dump`.
3. Buat ulang user admin (Supabase Auth) + baris `admin_profiles`.
4. Salin media ke bucket R2, perbarui `SUPABASE_URL`/secret di Worker, lalu `npm run deploy`.
**Uji pemulihan ke proyek terpisah minimal sekali per kuartal.**

## Log
Aksi admin tercatat di tabel `activity_logs` (aktor, aksi, entitas, waktu). Log Worker: `npx wrangler tail`.

## Checklist sebelum rilis
- [ ] Domain final di `ALLOWED_ORIGIN`; WhatsApp/email di Settings admin
- [ ] Turnstile site key & secret terpasang; kirim form tes → lead muncul di admin
- [ ] MFA aktif di akun admin; hanya satu admin di `admin_profiles`
- [ ] RLS aktif di semua tabel (cek di Supabase → Table editor)
- [ ] Tidak ada service-role key di `public/` atau repository
- [ ] Sitemap dikirim ke Google Search Console; cek `/robots.txt`
- [ ] Uji di HP, cek kuota free tier Workers/Supabase/R2, jadwalkan backup pertama
