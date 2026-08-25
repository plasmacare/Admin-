-- ============================================================
-- ONE-SHOT FIX for all storage buckets used by this project.
-- Run this instead of the three separate RUN_THIS_FIRST_*.sql files
-- if you'd rather fix everything in one go (covers prescriptions,
-- payment-proofs, and announcement-posters).
-- Safe to run any number of times.
-- ============================================================

-- prescriptions ------------------------------------------------
insert into storage.buckets (id, name, public)
values ('prescriptions', 'prescriptions', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can upload prescriptions" on storage.objects;
create policy "Public can upload prescriptions"
  on storage.objects for insert to anon
  with check (bucket_id = 'prescriptions');

drop policy if exists "Authenticated can upload prescriptions" on storage.objects;
create policy "Authenticated can upload prescriptions"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'prescriptions');

drop policy if exists "Public can read prescriptions" on storage.objects;
create policy "Public can read prescriptions"
  on storage.objects for select to public
  using (bucket_id = 'prescriptions');

-- payment-proofs -------------------------------------------------
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can upload payment proofs" on storage.objects;
create policy "Public can upload payment proofs"
  on storage.objects for insert to anon
  with check (bucket_id = 'payment-proofs');

drop policy if exists "Public can update payment proofs" on storage.objects;
create policy "Public can update payment proofs"
  on storage.objects for update to anon
  using (bucket_id = 'payment-proofs') with check (bucket_id = 'payment-proofs');

drop policy if exists "Authenticated can upload payment proofs" on storage.objects;
create policy "Authenticated can upload payment proofs"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-proofs');

drop policy if exists "Public can read payment proofs" on storage.objects;
create policy "Public can read payment proofs"
  on storage.objects for select to public
  using (bucket_id = 'payment-proofs');

-- announcement-posters (admin-only upload, public read) -----------
insert into storage.buckets (id, name, public)
values ('announcement-posters', 'announcement-posters', true)
on conflict (id) do update set public = true;

drop policy if exists "Admins can upload announcement posters" on storage.objects;
create policy "Admins can upload announcement posters"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'announcement-posters');

drop policy if exists "Admins can replace announcement posters" on storage.objects;
create policy "Admins can replace announcement posters"
  on storage.objects for update to authenticated
  using (bucket_id = 'announcement-posters');

drop policy if exists "Public can read announcement posters" on storage.objects;
create policy "Public can read announcement posters"
  on storage.objects for select to public
  using (bucket_id = 'announcement-posters');

-- reports (existing bucket from catalog_and_reports.sql — included
-- here too since it follows the same pattern and is worth double
-- checking while you're at it) --------------------------------------
insert into storage.buckets (id, name, public)
values ('reports', 'reports', true)
on conflict (id) do update set public = true;

drop policy if exists "Admins can upload reports" on storage.objects;
create policy "Admins can upload reports"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'reports');

drop policy if exists "Public can read reports" on storage.objects;
create policy "Public can read reports"
  on storage.objects for select to public
  using (bucket_id = 'reports');

-- ---- Verify everything worked ----
-- select id, public from storage.buckets
--   where id in ('prescriptions','payment-proofs','announcement-posters','reports');
-- select policyname, roles, cmd from pg_policies where tablename = 'objects';
