-- ============================================================
-- RUN THIS FIRST if prescription uploads are failing with:
-- "new row violates row-level security policy"
-- ============================================================
--
-- That error means Postgres found NO policy on storage.objects that
-- allows an anonymous (not-logged-in) customer to insert a file into
-- the `prescriptions` bucket. This happens if
-- supabase/prescription_and_no_slots.sql was never actually run on
-- this project (or was only partially run) — the column additions can
-- silently succeed while the storage bucket/policies part gets skipped
-- if there was an error partway through, since Supabase's SQL editor
-- doesn't always roll back the whole script on a later error.
--
-- This file is self-contained and safe to run any number of times —
-- it recreates the bucket + both policies from scratch every time, so
-- you don't need to figure out which of the older files already ran.

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

-- Also cover logged-in-but-not-admin edge cases and the "authenticated"
-- role some Supabase client setups use instead of "anon" — harmless
-- extra coverage, doesn't loosen anything the anon policy didn't
-- already allow.
drop policy if exists "Authenticated can upload prescriptions" on storage.objects;
create policy "Authenticated can upload prescriptions"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'prescriptions');

-- ---- Verify it worked — run this separately after the above ----
-- 1. Bucket should show `public = true`:
--      select id, public from storage.buckets where id = 'prescriptions';
-- 2. Should list the two policies just created:
--      select policyname, roles, cmd from pg_policies
--      where tablename = 'objects' and policyname ilike '%prescriptions%';
