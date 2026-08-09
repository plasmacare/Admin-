-- Run this once in the Supabase SQL editor. Adds atomic increment/decrement
-- functions for time_slots.booked_count so concurrent bookings can't race
-- each other into overbooking a slot.

create or replace function increment_slot_booking(p_slot_id uuid)
returns void
language sql
as $$
  update time_slots set booked_count = booked_count + 1 where id = p_slot_id;
$$;

create or replace function decrement_slot_booking(p_slot_id uuid)
returns void
language sql
as $$
  update time_slots
  set booked_count = greatest(booked_count - 1, 0)
  where id = p_slot_id;
$$;

-- The customer app inserts bookings with the anon key, so anon needs to be
-- able to call increment. The admin app (cancelling bookings) is signed in
-- as authenticated, so it needs decrement/increment too.
grant execute on function increment_slot_booking(uuid) to anon, authenticated;
grant execute on function decrement_slot_booking(uuid) to anon, authenticated;
