-- Run this once in the Supabase SQL editor.
-- Lets logged-in admin staff permanently delete a fake/spam/test booking
-- from the Bookings tab. No delete policy existed before this, so
-- deletes were silently rejected by RLS.

drop policy if exists "Admins can delete bookings" on bookings;
create policy "Admins can delete bookings"
  on bookings for delete
  to authenticated
  using (true);

drop policy if exists "Admins can delete addresses" on addresses;
create policy "Admins can delete addresses"
  on addresses for delete
  to authenticated
  using (true);
