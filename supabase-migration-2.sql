-- Run this in Supabase SQL Editor (after running supabase-schema.sql)

-- Missing columns on properties table
alter table public.properties add column if not exists mortgage_account_id text;
alter table public.properties add column if not exists hoa text;
alter table public.properties add column if not exists hoa_url text;
alter table public.properties add column if not exists mud_district text;
alter table public.properties add column if not exists mud_url text;

-- Year column on hoa_dues (app tracks by year, not just due_date)
alter table public.hoa_dues add column if not exists year int;

-- Function callable without auth to detect first-run setup
create or replace function public.has_users()
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from profiles limit 1);
$$;
grant execute on function public.has_users() to anon;
