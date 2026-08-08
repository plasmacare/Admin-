-- Run this once in the Supabase SQL editor (same project the customer app
-- already uses) before using the admin panel.

-- 1. Add a column to track which staff member a booking is assigned to.
alter table bookings
  add column if not exists assigned_staff text;

-- 2. Let signed-in admin users (anyone who can log in — see step 3) read
-- and update bookings + addresses. The customer app's anon-key inserts
-- are untouched; this only adds policies for the "authenticated" role.
alter table bookings enable row level security;
alter table addresses enable row level security;

drop policy if exists "Admins can read bookings" on bookings;
create policy "Admins can read bookings"
  on bookings for select
  to authenticated
  using (true);

drop policy if exists "Admins can update bookings" on bookings;
create policy "Admins can update bookings"
  on bookings for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Admins can read addresses" on addresses;
create policy "Admins can read addresses"
  on addresses for select
  to authenticated
  using (true);

-- 3. Create the actual admin login(s):
--    Supabase Dashboard → Authentication → Users → Add user
--    Set an email + password for each staff member who should have access.
--    That's it — no extra table needed, anyone who can sign in can use
--    this dashboard. Only add trusted staff.
