-- Run this once in the Supabase SQL editor.
-- Lets the admin panel subscribe to live INSERT events on `bookings` so it
-- can show a browser notification the moment a new booking comes in
-- (while the admin tab is open).

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'bookings'
  ) then
    alter publication supabase_realtime add table bookings;
  end if;
end $$;
