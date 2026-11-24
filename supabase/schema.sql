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
