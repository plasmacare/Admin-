-- FIX: the previous migrations (admin_setup.sql, catalog_and_reports.sql)
-- enabled Row Level Security on bookings, addresses, packages,
-- individual_tests, and time_slots so the *admin* app (signed in) could
-- read/write them — but that also silently cut off the *customer* app,
-- which always uses the public anon key and was never signed in. With
-- RLS on and no anon policy, Postgres defaults to deny, so the customer
-- site could no longer see packages/tests/slots, create bookings, or
-- mark them verified after OTP. This restores that public access.
--
-- Run this once in the Supabase SQL editor.

-- Catalog: anyone can view (booking flow needs this before signing in).
drop policy if exists "Public can view packages" on packages;
create policy "Public can view packages" on packages
  for select to anon using (true);

drop policy if exists "Public can view tests" on individual_tests;
create policy "Public can view tests" on individual_tests
  for select to anon using (true);

drop policy if exists "Public can view slots" on time_slots;
create policy "Public can view slots" on time_slots
  for select to anon using (true);

-- Bookings: the customer app creates a booking, reads it back right
-- after (supabase-js .insert().select() requires a SELECT policy too),
-- and updates it once to mark phone_verified after OTP.
drop policy if exists "Public can create bookings" on bookings;
create policy "Public can create bookings" on bookings
  for insert to anon with check (true);

drop policy if exists "Public can read bookings" on bookings;
create policy "Public can read bookings" on bookings
  for select to anon using (true);

drop policy if exists "Public can verify bookings" on bookings;
create policy "Public can verify bookings" on bookings
  for update to anon using (true) with check (true);

-- Addresses: created alongside a home-collection booking.
drop policy if exists "Public can create addresses" on addresses;
create policy "Public can create addresses" on addresses
  for insert to anon with check (true);

drop policy if exists "Public can read addresses" on addresses;
create policy "Public can read addresses" on addresses
  for select to anon using (true);
