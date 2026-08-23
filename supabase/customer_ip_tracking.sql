-- Run this once in the Supabase SQL editor.
-- Adds a column to record the customer's public IP at booking time, so
-- the admin panel can warn when too many bookings come from the same IP
-- (on top of the existing phone/name-based spam heuristics).

alter table bookings
  add column if not exists customer_ip text;
