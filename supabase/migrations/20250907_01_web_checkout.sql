-- Web checkout migration: creators, extended requests, indexes, RPC

-- 1) Creators table
create table if not exists public.creators (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  slug text not null unique,
  public_bio text,
  avatar_url text,
  hero_url text,
  price_cents integer not null default 0,
  stripe_connect_account_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep slug immutable after insert
create or replace function public._creators_slug_immutable()
returns trigger language plpgsql as $$
begin
  if (TG_OP = 'UPDATE' and NEW.slug is distinct from OLD.slug) then
    raise exception 'slug is immutable';
  end if;
  return NEW;
end;$$;

drop trigger if exists trg_creators_slug_immutable on public.creators;
create trigger trg_creators_slug_immutable
before update on public.creators
for each row execute function public._creators_slug_immutable();

-- 2) Extend requests table with web-checkout lifecycle fields
-- Note: we keep existing status as text for backward-compatibility
alter table if exists public.requests
  add column if not exists payment_status text check (payment_status in ('unpaid','paid','refunded')) default 'unpaid',
  add column if not exists accepted_at timestamptz,
  add column if not exists denied_at timestamptz,
  add column if not exists fulfilled_at timestamptz,
  add column if not exists accept_by timestamptz,
  add column if not exists deliver_by timestamptz,
  add column if not exists stripe_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists stripe_connect_account_id text;

-- 3) Helpful indexes for schedulers/queries
create index if not exists idx_creators_slug on public.creators(slug);
create index if not exists idx_requests_status on public.requests(status);
create index if not exists idx_requests_accept_by on public.requests(accept_by);
create index if not exists idx_requests_deliver_by on public.requests(deliver_by);

-- 4) RPC to fetch creator by slug with joined public profile fields
create or replace view public.creators_public as
select c.id as creator_id,
       c.slug,
       coalesce(p.full_name, p.username, 'Creator') as display_name,
       c.public_bio,
       coalesce(c.avatar_url, p.avatar_url) as avatar_url,
       c.hero_url,
       c.price_cents,
       c.stripe_connect_account_id,
       p.id as profile_id,
       p.username
from public.creators c
join public.profiles p on p.id = c.profile_id;

-- Ensure RLS permissions are handled at table level as in existing project


