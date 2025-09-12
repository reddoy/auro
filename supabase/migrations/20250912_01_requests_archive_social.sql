-- Add social consent and archiving support to requests table
-- Safe to run multiple times

alter table if exists public.requests
  add column if not exists consent_social boolean not null default false;

alter table if exists public.requests
  add column if not exists archived_at timestamptz null;

-- Optional: lightweight index to filter archived rows
create index if not exists idx_requests_archived_at on public.requests (archived_at);


