-- Run this once in the Supabase SQL editor.
--
-- Changes payment collection from "admin manually triggers a request on
-- a specific booking, then shares a QR/link" to: admin sets ONE global
-- rule (full payment, or partial — e.g. 50%) that applies to every
-- booking automatically, and it's collected right there in the customer's
-- own booking flow — no separate share step needed afterward.

alter table payment_settings
  add column if not exists payment_type text not null default 'full',       -- 'full' | 'partial'
  add column if not exists partial_percentage integer not null default 50;  -- used only when payment_type = 'partial'

-- The customer app needs to read these settings (enabled? full or
-- partial? UPI or Razorpay? the UPI ID to build the QR with) to collect
-- payment inline during booking. Nothing sensitive lives in this table —
-- the Razorpay *secret* key is only ever an Edge Function secret, never
-- stored here — so a public read policy is safe.
drop policy if exists "Public can read payment settings" on payment_settings;
create policy "Public can read payment settings"
  on payment_settings for select
  to anon
  using (true);
