-- ============================================================
-- LFJH Realty — Supabase Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Profiles (extends Supabase auth.users with role)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'viewer' check (role in ('admin', 'viewer')),
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users can read all profiles" on public.profiles for select to authenticated using (true);
create policy "Admins can update profiles" on public.profiles for update to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Admins can insert profiles" on public.profiles for insert to authenticated with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'role', 'viewer'));
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Properties
create table if not exists public.properties (
  id text primary key,
  name text not null,
  address text,
  type text,
  purchase_price numeric default 0,
  monthly_rent numeric default 0,
  bedrooms numeric default 0,
  bathrooms numeric default 0,
  sqft numeric default 0,
  status text default 'Occupied',
  notes text,
  created_at timestamptz default now()
);
alter table public.properties enable row level security;
create policy "Authenticated users can read properties" on public.properties for select to authenticated using (true);
create policy "Admins can modify properties" on public.properties for all to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Tenants
create table if not exists public.tenants (
  id text primary key,
  first_name text,
  last_name text,
  email text,
  phone text,
  co_tenants jsonb default '[]',
  property_id text references public.properties(id) on delete set null,
  lease_start text,
  lease_end text,
  monthly_rent numeric default 0,
  deposit_paid numeric default 0,
  pet_deposit numeric default 0,
  status text default 'Active',
  notes text,
  created_at timestamptz default now()
);
alter table public.tenants enable row level security;
create policy "Authenticated users can read tenants" on public.tenants for select to authenticated using (true);
create policy "Admins can modify tenants" on public.tenants for all to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Transactions
create table if not exists public.transactions (
  id text primary key,
  sf_tx_id text,
  date text,
  description text,
  amount numeric,
  type text,
  category text,
  property_id text,
  owner_id text,
  notes text,
  splits jsonb default '[]',
  rent_periods jsonb default '[]',
  tax_year int,
  tax_type text,
  excluded boolean default false,
  categorized boolean default false,
  created_at timestamptz default now()
);
alter table public.transactions enable row level security;
create policy "Authenticated users can read transactions" on public.transactions for select to authenticated using (true);
create policy "Admins can modify transactions" on public.transactions for all to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Owners
create table if not exists public.owners (
  id text primary key,
  first_name text,
  last_name text,
  email text,
  phone text,
  ownership_pct numeric default 0,
  notes text,
  created_at timestamptz default now()
);
alter table public.owners enable row level security;
create policy "Authenticated users can read owners" on public.owners for select to authenticated using (true);
create policy "Admins can modify owners" on public.owners for all to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Property Taxes
create table if not exists public.property_taxes (
  id text primary key,
  property_id text references public.properties(id) on delete cascade,
  tax_year int,
  tax_type text,
  amount numeric,
  due_date text,
  paid_date text,
  status text default 'Unpaid',
  notes text,
  created_at timestamptz default now()
);
alter table public.property_taxes enable row level security;
create policy "Authenticated users can read property_taxes" on public.property_taxes for select to authenticated using (true);
create policy "Admins can modify property_taxes" on public.property_taxes for all to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- HOA Dues
create table if not exists public.hoa_dues (
  id text primary key,
  property_id text references public.properties(id) on delete cascade,
  amount numeric,
  frequency text,
  due_date text,
  paid_date text,
  status text default 'Unpaid',
  notes text,
  created_at timestamptz default now()
);
alter table public.hoa_dues enable row level security;
create policy "Authenticated users can read hoa_dues" on public.hoa_dues for select to authenticated using (true);
create policy "Admins can modify hoa_dues" on public.hoa_dues for all to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Seed the 4 properties
insert into public.properties (id, name, address, type, status) values
  ('p1', '22722 Provincial Blvd',    '22722 Provincial Blvd, Katy, TX 77450',    'Single Family', 'Occupied'),
  ('p2', '21223 Park Valley Dr',     '21223 Park Valley Dr, Katy, TX 77450',     'Single Family', 'Occupied'),
  ('p3', '21226 Highland Knolls Dr', '21226 Highland Knolls Dr, Katy, TX 77450', 'Single Family', 'Occupied'),
  ('p4', '21310 Highland Knolls Dr', '21310 Highland Knolls Dr, Katy, TX 77450', 'Single Family', 'Occupied')
on conflict (id) do nothing;
