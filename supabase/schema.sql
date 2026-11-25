-- RUtusdev Fase 1 — jalankan di Supabase SQL Editor
create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) <= 150),
  whatsapp text check (whatsapp is null or char_length(whatsapp) <= 20),
  service_interest text not null default 'website',
  brief text check (brief is null or char_length(brief) <= 1500),
  status text not null default 'new' check (status in ('new','contacted','discovery','proposal','won','lost')),
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists leads_created_idx on public.leads (created_at desc);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  entity text,
  entity_id text,
  created_at timestamptz not null default now()
);

-- RLS aktif tanpa policy = deny-by-default untuk anon/authenticated.
-- Worker memakai service-role key (secret backend) sehingga tetap bisa menulis.
alter table public.leads enable row level security;
alter table public.activity_logs enable row level security;

-- ===== CMS (Fase 1) =====
create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text, role text not null default 'admin', created_at timestamptz default now());
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(), title text not null, slug text unique, summary text, description text,
  icon text, sort_order int default 0, is_published boolean default false, created_at timestamptz default now());
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(), title text not null, slug text unique, summary text, body text,
  category text, technologies text[] default '{}', cover_key text, demo_url text,
  featured boolean default false, is_published boolean default false, created_at timestamptz default now());
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(), title text not null, slug text unique, excerpt text, body text,
  seo_title text, seo_description text, cover_key text, status text default 'draft' check (status in ('draft','published')),
  created_at timestamptz default now());
create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(), client_name text not null, organization text, quote text not null,
  avatar_key text, is_published boolean default false, created_at timestamptz default now());
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(), name text not null, logo_key text, website_url text,
  is_published boolean default false, created_at timestamptz default now());
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(), object_key text unique not null, alt_text text, mime text, size int,
  created_at timestamptz default now());
alter table public.admin_profiles enable row level security;
alter table public.services enable row level security;
alter table public.projects enable row level security;
alter table public.articles enable row level security;
alter table public.testimonials enable row level security;
alter table public.clients enable row level security;
alter table public.media enable row level security;
-- Setelah membuat user admin di Supabase Auth, jalankan:
-- insert into public.admin_profiles (user_id, display_name) values ('<UUID-USER>', 'Admin');

-- ===== Settings (Hero & Kontak) =====
create table if not exists public.site_settings (
  key text primary key, value jsonb not null default '{}', updated_at timestamptz default now());
alter table public.site_settings enable row level security;

-- ===== CRM ringan (Fase 2) =====
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(), name text not null, website text, industry text, notes text,
  created_at timestamptz default now());
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(), name text not null, email text, whatsapp text, position text, notes text,
  organization_id uuid references public.organizations(id) on delete set null, created_at timestamptz default now());
create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(), title text not null,
  organization_id uuid references public.organizations(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  value numeric(14,0) default 0,
  stage text not null default 'baru' check (stage in ('baru','dihubungi','discovery','proposal','negosiasi','menang','kalah')),
  source text, expected_close date, notes text, created_at timestamptz default now());
create table if not exists public.interactions (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references public.deals(id) on delete cascade,
  kind text default 'catatan' check (kind in ('catatan','telepon','whatsapp','email','rapat')),
  note text not null, created_at timestamptz default now());
create index if not exists deals_stage_idx on public.deals (stage);
create index if not exists interactions_deal_idx on public.interactions (deal_id, created_at desc);
alter table public.organizations enable row level security;
alter table public.contacts enable row level security;
alter table public.deals enable row level security;
alter table public.interactions enable row level security;

-- ===== Penawaran, Invoice, Tugas (Fase 2) =====
-- Rincian item disimpan sebagai JSONB: [{"desc":"...","qty":1,"price":1500000}]
create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(), number text unique not null, title text not null,
  deal_id uuid references public.deals(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','terkirim','disetujui','ditolak')),
  valid_until date, items jsonb not null default '[]', scope text, terms text, created_at timestamptz default now());
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(), number text unique not null, title text not null,
  deal_id uuid references public.deals(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  status text not null default 'draf' check (status in ('draf','terkirim','dibayar_sebagian','lunas','batal')),
  issue_date date default current_date, due_date date, items jsonb not null default '[]',
  paid_amount numeric(14,0) default 0, notes text, created_at timestamptz default now());
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(), title text not null,
  deal_id uuid references public.deals(id) on delete cascade, milestone text,
  status text not null default 'todo' check (status in ('todo','berjalan','selesai')),
  priority text not null default 'sedang' check (priority in ('rendah','sedang','tinggi')),
  due_date date, notes text, created_at timestamptz default now());
alter table public.proposals enable row level security;
alter table public.invoices enable row level security;
alter table public.tasks enable row level security;

-- ===== Portofolio ternormalisasi (kategori, teknologi, galeri) =====
-- Aman dijalankan ulang. Kolom lama projects.category (teks) & projects.technologies (text[]) dipertahankan
-- sebagai data warisan: dipakai hanya untuk backfill di bawah dan tidak dibaca lagi oleh Worker.
create table if not exists public.project_categories (
  id uuid primary key default gen_random_uuid(), name text not null unique, slug text not null unique,
  sort_order int default 0, created_at timestamptz default now());
create table if not exists public.technologies (
  id uuid primary key default gen_random_uuid(), name text not null unique, slug text not null unique,
  created_at timestamptz default now());
alter table public.projects add column if not exists category_id uuid references public.project_categories(id) on delete set null;
create table if not exists public.project_technologies (
  project_id uuid not null references public.projects(id) on delete cascade,
  technology_id uuid not null references public.technologies(id) on delete cascade,
  sort_order int default 0, primary key (project_id, technology_id));
create table if not exists public.project_media (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  object_key text not null, alt_text text, sort_order int default 0, created_at timestamptz default now());
create index if not exists projects_category_idx on public.projects (category_id);
create index if not exists project_tech_tech_idx on public.project_technologies (technology_id);
create index if not exists project_media_project_idx on public.project_media (project_id, sort_order);
alter table public.project_categories enable row level security;
alter table public.technologies enable row level security;
alter table public.project_technologies enable row level security;
alter table public.project_media enable row level security;

-- Backfill dari data lama (idempotent)
insert into public.project_categories (name, slug)
  select distinct on (lower(trim(category))) trim(category),
    coalesce(nullif(trim(both '-' from regexp_replace(lower(trim(category)), '[^a-z0-9]+', '-', 'g')), ''), 'kategori-' || substr(md5(trim(category)), 1, 6))
  from public.projects where nullif(trim(category), '') is not null
  on conflict do nothing;
update public.projects p set category_id = c.id
  from public.project_categories c
  where p.category_id is null and nullif(trim(p.category), '') is not null and lower(c.name) = lower(trim(p.category));
insert into public.technologies (name, slug)
  select distinct on (lower(trim(t))) trim(t),
    coalesce(nullif(trim(both '-' from regexp_replace(lower(trim(t)), '[^a-z0-9]+', '-', 'g')), ''), 'tek-' || substr(md5(trim(t)), 1, 6))
  from public.projects, unnest(technologies) as t where nullif(trim(t), '') is not null
  on conflict do nothing;
insert into public.project_technologies (project_id, technology_id, sort_order)
  select p.id, tc.id, (x.ord - 1)::int
  from public.projects p, unnest(p.technologies) with ordinality as x(t, ord)
  join public.technologies tc on lower(tc.name) = lower(trim(x.t))
  on conflict do nothing;
-- Setelah memastikan hasil backfill benar, kolom lama boleh dihapus:
-- alter table public.projects drop column category, drop column technologies;

-- ===== Status & tanggal terbit proyek (Fase 3) =====
-- Aman dijalankan ulang. is_published dipertahankan sebagai kolom turunan (disinkronkan trigger)
-- agar query lama tetap valid; sumber kebenaran sekarang projects.status.
alter table public.projects add column if not exists status text not null default 'draft' check (status in ('draft','published','archived'));
alter table public.projects add column if not exists published_at timestamptz;
update public.projects set status = 'published' where is_published and status = 'draft';
-- Proyek yang sudah terbit sebelum migrasi: created_at dipakai sebagai perkiraan tanggal terbit.
update public.projects set published_at = created_at where status = 'published' and published_at is null;
create or replace function public.projects_sync_publish() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.is_published and new.status = 'draft' then new.status := 'published'; end if;
  elsif new.is_published is distinct from old.is_published and new.status is not distinct from old.status then
    new.status := case when new.is_published then 'published' else 'draft' end;
  end if;
  new.is_published := (new.status = 'published');
  -- published_at = terbit pertama; tidak diubah saat ditarik lalu diterbitkan lagi.
  if new.status = 'published' and new.published_at is null then new.published_at := now(); end if;
  return new;
end $$;
drop trigger if exists projects_sync_publish on public.projects;
create trigger projects_sync_publish before insert or update on public.projects
  for each row execute function public.projects_sync_publish();
create index if not exists projects_published_idx on public.projects (status, published_at desc);

-- ===== Peran admin (Fase 3) =====
-- admin  = akses penuh (perilaku lama, jadi tidak ada admin yang kehilangan akses)
-- editor = konten situs (layanan, portofolio, artikel, testimoni, klien, media, pengaturan): baca + tulis, tanpa hapus
-- viewer = hanya baca (konten, CRM, penawaran, faktur)
-- Nilai role lain yang pernah diisi manual dipetakan ke 'admin' agar tidak terkunci; setelah itu turunkan manual bila perlu:
--   update public.admin_profiles set role = 'editor' where user_id = '<UUID>';
update public.admin_profiles set role = 'admin' where role not in ('admin','editor','viewer');
alter table public.admin_profiles drop constraint if exists admin_profiles_role_check;
alter table public.admin_profiles add constraint admin_profiles_role_check check (role in ('admin','editor','viewer'));

-- ===== Log keamanan (Fase 3) =====
-- result: success = berhasil, failure = gagal (token tidak valid, login salah, error database), denied = ditolak (peran/akun tidak berhak).
alter table public.activity_logs add column if not exists result text not null default 'success' check (result in ('success','failure','denied'));
alter table public.activity_logs add column if not exists ip text;
alter table public.activity_logs add column if not exists user_agent text;
alter table public.activity_logs add column if not exists detail text;
create index if not exists activity_logs_actor_idx on public.activity_logs (actor_id, created_at desc);
create index if not exists activity_logs_result_idx on public.activity_logs (result, created_at desc);
-- IP & user agent adalah data pribadi. Pangkas berkala bila perlu (contoh: simpan 180 hari):
-- delete from public.activity_logs where created_at < now() - interval '180 days';

-- ===== Rincian penawaran & faktur ternormalisasi (Fase 3) =====
-- Aman dijalankan ulang. Kolom lama proposals.items / invoices.items (JSONB) dipertahankan sebagai data warisan:
-- dipakai hanya untuk backfill di bawah dan tidak ditulis/dibaca lagi oleh Worker.
create table if not exists public.proposal_items (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  position int not null default 0, description text not null check (char_length(description) between 1 and 200),
  qty numeric(12,2) not null default 1 check (qty >= 0), unit_price numeric(14,0) not null default 0 check (unit_price >= 0),
  created_at timestamptz default now());
create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  position int not null default 0, description text not null check (char_length(description) between 1 and 200),
  qty numeric(12,2) not null default 1 check (qty >= 0), unit_price numeric(14,0) not null default 0 check (unit_price >= 0),
  created_at timestamptz default now());
create index if not exists proposal_items_doc_idx on public.proposal_items (proposal_id, position);
create index if not exists invoice_items_doc_idx on public.invoice_items (invoice_id, position);
alter table public.proposal_items enable row level security;
alter table public.invoice_items enable row level security;

-- Backfill dari JSONB (hanya dokumen yang belum punya baris rincian)
insert into public.proposal_items (proposal_id, position, description, qty, unit_price)
  select p.id, (o - 1)::int, left(x->>'desc', 200), coalesce(nullif(x->>'qty', '')::numeric, 0), coalesce(nullif(x->>'price', '')::numeric, 0)
  from public.proposals p, jsonb_array_elements(p.items) with ordinality as t(x, o)
  where jsonb_typeof(p.items) = 'array' and coalesce(x->>'desc', '') <> ''
    and not exists (select 1 from public.proposal_items i where i.proposal_id = p.id);
insert into public.invoice_items (invoice_id, position, description, qty, unit_price)
  select v.id, (o - 1)::int, left(x->>'desc', 200), coalesce(nullif(x->>'qty', '')::numeric, 0), coalesce(nullif(x->>'price', '')::numeric, 0)
  from public.invoices v, jsonb_array_elements(v.items) with ordinality as t(x, o)
  where jsonb_typeof(v.items) = 'array' and coalesce(x->>'desc', '') <> ''
    and not exists (select 1 from public.invoice_items i where i.invoice_id = v.id);

-- Ganti seluruh rincian satu dokumen dalam SATU transaksi (hapus + isi ulang), dipanggil Worker lewat RPC.
create or replace function public.replace_document_items(p_kind text, p_id uuid, p_items jsonb) returns void
language plpgsql set search_path = public as $$
begin
  if p_kind = 'proposal' then
    delete from proposal_items where proposal_id = p_id;
    insert into proposal_items (proposal_id, position, description, qty, unit_price)
      select p_id, (o - 1)::int, left(x->>'desc', 200), coalesce((x->>'qty')::numeric, 0), coalesce((x->>'price')::numeric, 0)
      from jsonb_array_elements(p_items) with ordinality as t(x, o);
  elsif p_kind = 'invoice' then
    delete from invoice_items where invoice_id = p_id;
    insert into invoice_items (invoice_id, position, description, qty, unit_price)
      select p_id, (o - 1)::int, left(x->>'desc', 200), coalesce((x->>'qty')::numeric, 0), coalesce((x->>'price')::numeric, 0)
      from jsonb_array_elements(p_items) with ordinality as t(x, o);
  else
    raise exception 'kind tidak dikenal';
  end if;
end $$;
revoke all on function public.replace_document_items(text, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.replace_document_items(text, uuid, jsonb) to service_role;

-- ===== Tonggak pengerjaan proyek: projects_delivery (Fase 3) =====
-- Satu baris = satu tonggak (milestone) pengerjaan untuk satu peluang/proyek klien. Tugas menunjuk tonggak lewat tasks.milestone_id.
-- Kolom lama tasks.milestone (teks) dipertahankan sebagai data warisan; dipakai hanya untuk backfill dan tampilan cadangan.
create table if not exists public.projects_delivery (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references public.deals(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  sort_order int not null default 0,
  status text not null default 'rencana' check (status in ('rencana','berjalan','selesai','tertunda')),
  due_date date, completed_at timestamptz, notes text, created_at timestamptz default now());
create index if not exists projects_delivery_deal_idx on public.projects_delivery (deal_id, sort_order);
alter table public.projects_delivery enable row level security;
alter table public.tasks add column if not exists milestone_id uuid references public.projects_delivery(id) on delete set null;
create index if not exists tasks_milestone_idx on public.tasks (milestone_id);
create or replace function public.projects_delivery_done() returns trigger language plpgsql as $$
begin
  if new.status = 'selesai' then new.completed_at := coalesce(new.completed_at, now()); else new.completed_at := null; end if;
  return new;
end $$;
drop trigger if exists projects_delivery_done on public.projects_delivery;
create trigger projects_delivery_done before insert or update on public.projects_delivery
  for each row execute function public.projects_delivery_done();

-- Backfill: satu tonggak per pasangan (peluang, nama tonggak) dari teks lama; tugas yang semua tugasnya selesai ditandai selesai.
insert into public.projects_delivery (deal_id, title, status, sort_order)
  select t.deal_id, trim(t.milestone),
    case when bool_and(t.status = 'selesai') then 'selesai' when bool_or(t.status = 'berjalan') then 'berjalan' else 'rencana' end,
    row_number() over (partition by t.deal_id order by min(t.created_at))::int
  from public.tasks t
  where nullif(trim(t.milestone), '') is not null and t.milestone_id is null
    and not exists (select 1 from public.projects_delivery d where d.deal_id is not distinct from t.deal_id and lower(d.title) = lower(trim(t.milestone)))
  group by t.deal_id, trim(t.milestone);
update public.tasks t set milestone_id = d.id
  from public.projects_delivery d
  where t.milestone_id is null and nullif(trim(t.milestone), '') is not null
    and d.deal_id is not distinct from t.deal_id and lower(d.title) = lower(trim(t.milestone));
-- Setelah memastikan hasil backfill benar, kolom lama boleh dihapus:
-- alter table public.tasks drop column milestone;
-- alter table public.proposals drop column items;  alter table public.invoices drop column items;

-- ===== Perbaikan data lama: isi slug yang kosong (aman dijalankan berulang) =====
-- Artikel/proyek/layanan tanpa slug tidak bisa dibuka (/articles/null) dan tidak tampil sinkron di landing.
update public.articles set slug = coalesce(nullif(trim(both '-' from regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g')), ''), 'artikel') || '-' || substr(id::text, 1, 4) where slug is null or slug = '';
update public.projects set slug = coalesce(nullif(trim(both '-' from regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g')), ''), 'proyek') || '-' || substr(id::text, 1, 4) where slug is null or slug = '';
update public.services set slug = coalesce(nullif(trim(both '-' from regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g')), ''), 'layanan') || '-' || substr(id::text, 1, 4) where slug is null or slug = '';
