-- Run this once in the Supabase SQL editor.

-- 1. Prescription photo upload — customer can upload instead of/alongside
-- picking individual tests; admin notes down what it says.
alter table bookings
  add column if not exists prescription_url text,
  add column if not exists prescription_notes text;

insert into storage.buckets (id, name, public)
values ('prescriptions', 'prescriptions', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can upload prescriptions" on storage.objects;
create policy "Public can upload prescriptions"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'prescriptions');

drop policy if exists "Public can read prescriptions" on storage.objects;
create policy "Public can read prescriptions"
  on storage.objects for select
  to public
  using (bucket_id = 'prescriptions');

-- 2. Time slots are being removed from booking (date-only now) — make
-- sure slot_id doesn't block inserts that no longer provide one.
alter table bookings alter column slot_id drop not null;
