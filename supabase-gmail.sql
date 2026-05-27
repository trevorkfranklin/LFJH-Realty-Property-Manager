-- Gmail OAuth token storage
create table if not exists gmail_tokens (
  id           uuid        primary key default gen_random_uuid(),
  email        text        unique not null,
  access_token text        not null,
  refresh_token text,
  expires_at   timestamptz not null,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Only accessible via service role key (used by API functions) — no client access
alter table gmail_tokens enable row level security;

-- No RLS policies: table is fully locked to client requests.
-- API functions use the service role key which bypasses RLS.
