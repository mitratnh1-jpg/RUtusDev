-- Ubah nomor WhatsApp RUtusdev menjadi 083180270019.
-- Nomor kontak situs TIDAK ada di kode: disimpan di tabel site_settings (key = 'contact') dan dibaca landing, chatbot,
-- halaman login admin, dan PDF lewat /api/public/content. Format wajib angka saja dengan kode negara (0 depan -> 62),
-- sebab tautan wa.me tidak menerima awalan 0:  083180270019  ->  6283180270019
--
-- Jalankan di Supabase -> SQL Editor. Email dan isian kontak lain tetap dipertahankan (jsonb digabung, bukan ditimpa).
insert into public.site_settings (key, value, updated_at)
values ('contact', jsonb_build_object('whatsapp', '6283180270019'), now())
on conflict (key) do update
  set value = public.site_settings.value || jsonb_build_object('whatsapp', '6283180270019'),
      updated_at = now();

-- Cek hasilnya:
-- select key, value from public.site_settings where key = 'contact';
