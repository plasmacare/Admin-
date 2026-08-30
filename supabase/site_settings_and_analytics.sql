-- Run this once in the Supabase SQL editor.
--
-- Adds two things:
-- 1. `site_settings` — a single-row table of site-wide customer-site
--    toggles, starting with the blood-drop "test tube wall" hero
--    animation quality (off / low / high). Admin edits it, the
--    customer site subscribes to it over Realtime so changes show up
--    live with no redeploy needed.
-- 2. `page_views` — one row per page load on the customer site, used
--    for the admin Views tab (total/today/month/year, live viewers via
--    Realtime Presence, conversion %, and a map of which city/zone
--    most traffic comes from).

-- 1. site_settings -----------------------------------------------------
create table if not exists site_settings (
  id integer primary key default 1,
  blood_drop_animation_quality text not null default 'low', -- 'off' | 'low' | 'high'
  updated_at timestamptz not null default now(),
  constraint site_settings_singleton check (id = 1)
);

insert into site_settings (id, blood_drop_animation_quality)
values (1, 'low')
on conflict (id) do nothing;

alter table site_settings enable row level security;

drop policy if exists "Public can read site settings" on site_settings;
create policy "Public can read site settings"
  on site_settings for select
  to anon
  using (true);

drop policy if exists "Admins can read site settings" on site_settings;
create policy "Admins can read site settings"
  on site_settings for select
  to authenticated
  using (true);

drop policy if exists "Admins can update site settings" on site_settings;
create policy "Admins can update site settings"
  on site_settings for update
  to authenticated
  using (true)
  with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'site_settings'
  ) then
    alter publication supabase_realtime add table site_settings;
  end if;
end $$;

-- 2. page_views ----------------------------------------------------------
create table if not exists page_views (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  path text,
  city text,
  region text,
  country text,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);

create index if not exists page_views_created_at_idx on page_views (created_at);
create index if not exists page_views_session_idx on page_views (session_id);
create index if not exists page_views_city_idx on page_views (city);

alter table page_views enable row level security;

drop policy if exists "Public can log page views" on page_views;
create policy "Public can log page views"
  on page_views for insert
  to anon
  with check (true);

drop policy if exists "Admins can read page views" on page_views;
create policy "Admins can read page views"
  on page_views for select
  to authenticated
  using (true);

-- Fast counts for the Views tab, instead of pulling every row to the
-- browser just to count/group it.
create or replace function page_view_stats()
returns table (
  total_views bigint,
  today_views bigint,
  month_views bigint,
  year_views bigint,
  total_sessions bigint
)
language sql
security definer
set search_path = public
as $$
  select
    count(*) as total_views,
    count(*) filter (where created_at >= date_trunc('day', now())) as today_views,
    count(*) filter (where created_at >= date_trunc('month', now())) as month_views,
    count(*) filter (where created_at >= date_trunc('year', now())) as year_views,
    count(distinct session_id) as total_sessions
  from page_views;
$$;

create or replace function page_views_by_city()
returns table (city text, region text, lat double precision, lng double precision, views bigint)
language sql
security definer
set search_path = public
as $$
  select city, region, avg(lat) as lat, avg(lng) as lng, count(*) as views
  from page_views
  where city is not null
  group by city, region
  order by views desc
  limit 50;
$$;

grant execute on function page_view_stats() to authenticated;
grant execute on function page_views_by_city() to authenticated;
