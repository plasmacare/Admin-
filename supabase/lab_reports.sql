-- Run this once in the Supabase SQL editor.
-- Adds the data behind the "Generate report" feature in the admin
-- panel: a doctors list (with a pre-saved signature image per doctor)
-- and a lab_reports table holding the structured test-result data that
-- gets rendered into the branded PDF matching the official template.

-- 1. Doctors --------------------------------------------------------------
create table if not exists doctors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  qualification text not null,
  signature_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table doctors enable row level security;

drop policy if exists "Admins can manage doctors" on doctors;
create policy "Admins can manage doctors"
  on doctors for all
  to authenticated
  using (true)
  with check (true);

insert into storage.buckets (id, name, public)
values ('doctor-signatures', 'doctor-signatures', true)
on conflict (id) do update set public = true;

drop policy if exists "Admins can upload doctor signatures" on storage.objects;
create policy "Admins can upload doctor signatures"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'doctor-signatures');

drop policy if exists "Public can read doctor signatures" on storage.objects;
create policy "Public can read doctor signatures"
  on storage.objects for select
  to public
  using (bucket_id = 'doctor-signatures');

-- 2. Lab reports -----------------------------------------------------------
-- Registration numbers are sequential, starting near where the sample
-- template's reg no (1046) was — change the start value below if your
-- real numbering should pick up somewhere else.
create sequence if not exists lab_report_reg_no_seq start with 1047;

create table if not exists lab_reports (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete cascade,
  reg_no integer not null default nextval('lab_report_reg_no_seq'),
  doctor_id uuid references doctors(id),
  registered_on timestamptz not null default now(),
  received_on date not null default current_date,
  -- sections: [{ title: "BIOCHEMISTRY", tests: [{ name, flag, value, unit, reference, description }] }]
  sections jsonb not null default '[]'::jsonb,
  pdf_url text,
  created_at timestamptz not null default now()
);

create index if not exists lab_reports_booking_idx on lab_reports (booking_id);

alter table lab_reports enable row level security;

drop policy if exists "Admins can manage lab reports" on lab_reports;
create policy "Admins can manage lab reports"
  on lab_reports for all
  to authenticated
  using (true)
  with check (true);
