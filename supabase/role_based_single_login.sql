-- Run this once in the Supabase SQL editor (same project the admin panel
-- already uses). Adds role-based access on top of the existing single
-- login: after signing in, the app reads this table to decide whether
-- the user is 'admin' (sees everything), 'staff' (sees only their
-- assigned tabs), or any custom role label you create.

-- 1. Table: one row per staff/admin login.
create table if not exists staff_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  -- 'admin' is special-cased in the app (always sees every tab).
  -- Anything else — 'staff', or any custom label you type in the
  -- Access tab — is treated as a restricted role limited to allowed_tabs.
  role text not null default 'staff',
  allowed_tabs text[] not null default array['bookings'],
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table staff_profiles enable row level security;

-- 2. Helper: current user's role, without recursive RLS lookups.
create or replace function current_staff_role()
returns text
language sql stable
security definer
set search_path = public
as $$
  select role from staff_profiles where id = auth.uid();
$$;

-- 3. Policies
drop policy if exists "read own or admin reads all" on staff_profiles;
create policy "read own or admin reads all"
  on staff_profiles for select
  to authenticated
  using (id = auth.uid() or current_staff_role() = 'admin');

drop policy if exists "admin manages profiles" on staff_profiles;
create policy "admin manages profiles"
  on staff_profiles for all
  to authenticated
  using (current_staff_role() = 'admin')
  with check (current_staff_role() = 'admin');

-- 4. Auto-create a staff_profiles row whenever a new login is added in
-- Supabase Dashboard → Authentication → Users. Defaults to role='staff'
-- with only the Bookings tab visible — promote to 'admin' manually (step 5).
create or replace function handle_new_staff_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into staff_profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_staff_user();

-- 5. ONE-TIME BOOTSTRAP: the very first admin has to be promoted by hand,
-- since the table starts empty and nobody is 'admin' yet to do it via
-- the app. Find your existing admin login's email in Authentication →
-- Users, then run (replace the email):
--
--   insert into staff_profiles (id, email, role, allowed_tabs)
--   select id, email, 'admin', array['bookings','catalog','ai-packages','pages','announcements','payments','views']
--   from auth.users where email = 'you@plasmacare.in'
--   on conflict (id) do update set role = 'admin';
