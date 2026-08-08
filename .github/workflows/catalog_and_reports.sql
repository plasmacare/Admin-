-- Run this once in the Supabase SQL editor, after admin_setup.sql.
-- Adds: catalog (packages/tests/slots) management for admins, booking
-- fields for call tracking + spam flag + report upload/skip, and a
-- storage bucket for report files.

-- 1. Let signed-in admins manage the catalog (packages, tests, slots).
alter table packages enable row level security;
alter table individual_tests enable row level security;
alter table time_slots enable row level security;

drop policy if exists "Admins manage packages" on packages;
create policy "Admins manage packages" on packages
  for all to authenticated using (true) with check (true);

drop policy if exists "Admins manage tests" on individual_tests;
create policy "Admins manage tests" on individual_tests
  for all to authenticated using (true) with check (true);

drop policy if exists "Admins manage slots" on time_slots;
create policy "Admins manage slots" on time_slots
  for all to authenticated using (true) with check (true);

-- 2. Extra booking fields: call tracking, spam flag, report upload/skip.
alter table bookings
  add column if not exists call_status text not null default 'not_called',
  add column if not exists is_spam boolean not null default false,
  add column if not exists admin_notes text,
  add column if not exists report_url text,
  add column if not exists report_status text not null default 'pending';

-- call_status: not_called | called | no_answer | callback_later
-- report_status: pending | uploaded | skipped

-- 3. Storage bucket for report files (publicly readable via link, only
-- signed-in admins can upload/replace/delete).
insert into storage.buckets (id, name, public)
values ('reports', 'reports', true)
on conflict (id) do nothing;

drop policy if exists "Public can read reports" on storage.objects;
create policy "Public can read reports"
  on storage.objects for select
  to public
  using (bucket_id = 'reports');

drop policy if exists "Admins can upload reports" on storage.objects;
create policy "Admins can upload reports"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'reports');

drop policy if exists "Admins can replace reports" on storage.objects;
create policy "Admins can replace reports"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'reports');

drop policy if exists "Admins can delete reports" on storage.objects;
create policy "Admins can delete reports"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'reports');
