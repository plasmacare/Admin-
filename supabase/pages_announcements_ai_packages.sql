-- Run this once in the Supabase SQL editor.
-- Adds: legal pages (Terms/Privacy/etc, admin-edited, hidden until they
-- have content), announcement popup banners, and an AI package-suggestion
-- queue that only becomes a real (customer-visible) package once an
-- admin approves it.

-- 1. Legal / policy pages -----------------------------------------------
create table if not exists legal_pages (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,        -- 'terms' | 'privacy' | 'refund' | ...
  title text not null,
  content text not null default '', -- empty = not shown on the site yet
  updated_at timestamptz default now()
);

alter table legal_pages enable row level security;

drop policy if exists "Public can read legal pages" on legal_pages;
create policy "Public can read legal pages"
  on legal_pages for select to anon using (true);

drop policy if exists "Admins manage legal pages" on legal_pages;
create policy "Admins manage legal pages"
  on legal_pages for all to authenticated using (true) with check (true);

insert into legal_pages (slug, title, content) values
  ('terms', 'Terms & Conditions', ''),
  ('privacy', 'Privacy Policy', ''),
  ('refund', 'Refund & Cancellation Policy', '')
on conflict (slug) do nothing;

-- 2. Announcement / offer popup ------------------------------------------
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  cta_text text,
  cta_link text,
  is_active boolean not null default false,
  created_at timestamptz default now()
);

alter table announcements enable row level security;

drop policy if exists "Public can read active announcements" on announcements;
create policy "Public can read active announcements"
  on announcements for select to anon using (is_active = true);

drop policy if exists "Admins manage announcements" on announcements;
create policy "Admins manage announcements"
  on announcements for all to authenticated using (true) with check (true);

-- 3. AI-generated package suggestions (admin approval required) --------
create table if not exists package_suggestions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric not null,
  included_tests uuid[] not null default '{}',
  theme text,               -- e.g. 'weekend', 'weekday', 'occasional'
  ai_rationale text,
  status text not null default 'pending', -- pending | approved | rejected
  created_at timestamptz default now()
);

alter table package_suggestions enable row level security;

drop policy if exists "Admins manage package suggestions" on package_suggestions;
create policy "Admins manage package suggestions"
  on package_suggestions for all to authenticated using (true) with check (true);
-- (No anon policy — customers only ever see the real `packages` table,
-- never the suggestion queue.)
