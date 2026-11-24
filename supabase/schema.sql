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
