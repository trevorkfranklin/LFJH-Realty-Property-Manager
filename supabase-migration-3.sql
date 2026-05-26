-- App-wide key/value settings (SimpleFIN URL, etc.)
create table if not exists public.settings (
  key   text primary key,
  value text
);
alter table public.settings enable row level security;

-- Any authenticated user can read settings
create policy "Authenticated users can read settings" on public.settings
  for select to authenticated using (true);

-- Only admins can write settings
create policy "Admins can write settings" on public.settings
  for all to authenticated using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Allow the service role (scheduled agent) to read settings
-- (service role bypasses RLS by default, so no extra policy needed)
