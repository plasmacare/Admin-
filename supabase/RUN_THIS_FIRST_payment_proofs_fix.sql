-- ============================================================
-- RUN THIS if payment screenshot upload fails with:
-- "new row violates row-level security policy"
-- ============================================================
--
-- Same class of issue as the prescriptions bucket fix: this means
-- Postgres found no policy on storage.objects allowing an anonymous
-- customer to insert a file into the `payment-proofs` bucket — the
-- bucket/policy part of supabase/payment_v2_and_announcement_poster.sql
-- didn't fully apply on this project. Self-contained and safe to run
-- any number of times.

insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can upload payment proofs" on storage.objects;
create policy "Public can upload payment proofs"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'payment-proofs');

-- Covers the retry case: the app uploads with upsert:true, which needs
-- UPDATE rights too if a file at the same path already exists.
drop policy if exists "Public can update payment proofs" on storage.objects;
create policy "Public can update payment proofs"
  on storage.objects for update
  to anon
  using (bucket_id = 'payment-proofs')
  with check (bucket_id = 'payment-proofs');

drop policy if exists "Public can read payment proofs" on storage.objects;
create policy "Public can read payment proofs"
  on storage.objects for select
  to public
  using (bucket_id = 'payment-proofs');

-- Extra coverage for client setups that end up on "authenticated"
-- instead of "anon" — harmless, doesn't loosen anything further.
drop policy if exists "Authenticated can upload payment proofs" on storage.objects;
create policy "Authenticated can upload payment proofs"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'payment-proofs');

-- ---- Verify it worked — run this separately after the above ----
-- 1. Bucket should show `public = true`:
--      select id, public from storage.buckets where id = 'payment-proofs';
-- 2. Should list the policies just created:
--      select policyname, roles, cmd from pg_policies
--      where tablename = 'objects' and policyname ilike '%payment proofs%';
