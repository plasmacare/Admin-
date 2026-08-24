-- FIX: why uploaded prescription photos don't show in the admin panel.
--
-- The original prescription_and_no_slots.sql created the `prescriptions`
-- storage bucket with:
--   insert into storage.buckets (id, name, public) values (...) on conflict (id) do nothing;
-- If a bucket with id `prescriptions` already existed in your project
-- (e.g. created by hand, or by an earlier partial run) BEFORE that
-- migration ran, "on conflict do nothing" silently skipped setting
-- public = true. The upload itself still succeeds and `prescription_url`
-- still gets saved on the booking — but the public URL Supabase builds
-- for a non-public bucket returns an error instead of the image, so it
-- never renders for the customer OR for admin.
--
-- Run this once in the Supabase SQL editor. Safe to re-run any time.

update storage.buckets set public = true where id = 'prescriptions';

-- Belt-and-suspenders: make sure the read/upload policies still exist
-- (harmless if they're already there).
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
