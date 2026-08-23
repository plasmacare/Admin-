-- Run this once in the Supabase SQL editor.
-- Payment collection is entirely admin-initiated (used to prioritize
-- customers when things get busy) — never part of the normal customer
-- booking flow, so this table is admin-only, no public/anon access at all.

create table if not exists payment_settings (
  id int primary key default 1,
  enabled boolean not null default false,
  mode text not null default 'upi',       -- 'upi' | 'razorpay'
  upi_id text,
  upi_payee_name text,
  razorpay_key_id text,                    -- the *secret* key lives only as an
                                            -- Edge Function secret, never here
  updated_at timestamptz default now(),
  constraint single_row check (id = 1)
);
insert into payment_settings (id) values (1) on conflict (id) do nothing;

alter table payment_settings enable row level security;
drop policy if exists "Admins manage payment settings" on payment_settings;
create policy "Admins manage payment settings"
  on payment_settings for all to authenticated using (true) with check (true);

-- Per-booking payment request tracking.
alter table bookings
  add column if not exists payment_requested_amount numeric,
  add column if not exists payment_method text,     -- 'upi' | 'razorpay'
  add column if not exists payment_link text,
  add column if not exists payment_status text default 'none'; -- none | requested | paid
