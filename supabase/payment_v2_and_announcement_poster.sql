-- Run this once in the Supabase SQL editor (customer app and admin panel
-- share the same project, so this only needs to run once for both).
--
-- Adds:
-- 1. A customer-facing payment page: the QR/payment link now lives on
--    the customer's own site (at /pay/:bookingId) instead of only in the
--    admin panel. For UPI ("Dynamic QR"), the customer uploads a payment
--    screenshot as proof once they've paid. For Razorpay ("Gateway"),
--    no screenshot is needed — the razorpay-webhook edge function marks
--    it paid automatically once Razorpay confirms the payment.
-- 2. A poster image on announcements.
-- 3. A place to record *why* a prescription upload failed, so admin can
--    see it instead of the booking just silently missing a photo.

-- 1. Payment screenshot + gateway auto-tracking ---------------------------
alter table bookings
  add column if not exists payment_screenshot_url text,
  add column if not exists razorpay_payment_link_id text;

insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can upload payment proofs" on storage.objects;
create policy "Public can upload payment proofs"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'payment-proofs');

drop policy if exists "Public can read payment proofs" on storage.objects;
create policy "Public can read payment proofs"
  on storage.objects for select
  to public
  using (bucket_id = 'payment-proofs');

-- Customer needs to update their own booking's payment fields (to attach
-- the screenshot / mark "screenshot_uploaded") — already covered by the
-- existing broad "Public can verify bookings" update policy from
-- fix_public_access.sql (for update to anon using (true) with check (true)).
-- Nothing new needed there.

-- 2. Announcement poster image --------------------------------------------
alter table announcements
  add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('announcement-posters', 'announcement-posters', true)
on conflict (id) do update set public = true;

drop policy if exists "Admins can upload announcement posters" on storage.objects;
create policy "Admins can upload announcement posters"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'announcement-posters');

drop policy if exists "Admins can replace announcement posters" on storage.objects;
create policy "Admins can replace announcement posters"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'announcement-posters');

drop policy if exists "Public can read announcement posters" on storage.objects;
create policy "Public can read announcement posters"
  on storage.objects for select
  to public
  using (bucket_id = 'announcement-posters');

-- 3. Prescription upload failure visibility --------------------------------
alter table bookings
  add column if not exists prescription_upload_error text;
