-- App-wide key/value settings (SimpleFIN URL, etc.)
create table if not exists public.settings (
  key   text primary key,
  value text
);
alter table public.settings enable row level security;

drop policy if exists "Authenticated users can read settings" on public.settings;
drop policy if exists "Admins can write settings" on public.settings;

create policy "Authenticated users can read settings" on public.settings
  for select to authenticated using (true);

create policy "Admins can write settings" on public.settings
  for all to authenticated using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
