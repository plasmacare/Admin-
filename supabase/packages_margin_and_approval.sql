-- Run this once in the Supabase SQL editor, after catalog_and_reports.sql.
-- Adds: cost price on individual tests (so margin can be computed), and
-- package_type / margin / approval-status fields on packages so
-- auto-generated packages stay hidden from the customer site until an
-- admin explicitly approves them.

-- 1. Cost price per test, used to compute margin when building packages.
alter table individual_tests
  add column if not exists cost_price numeric;

-- 2. Package classification + approval workflow.
alter table packages
  add column if not exists package_type text not null default 'custom',
  add column if not exists status text not null default 'approved',
  add column if not exists margin_percent numeric,
  add column if not exists auto_generated boolean not null default false,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by text;

-- package_type: weekday | weekend | occasional | custom
-- status: draft | pending_approval | approved
-- Existing manually-created packages default to 'approved' so nothing
-- that's already live disappears from the customer site after this migration.

comment on column packages.status is 'draft | pending_approval | approved — only approved packages are shown on the customer website';
comment on column packages.package_type is 'weekday | weekend | occasional | custom';

-- 3. Helpful index for the customer-facing query (is_active + approved).
create index if not exists packages_customer_visible_idx
  on packages (is_active, status);
