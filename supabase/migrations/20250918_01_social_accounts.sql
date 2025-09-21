-- Social accounts linking for TikTok and Instagram (Graph via FB)

create table if not exists public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('tiktok','instagram')),
  external_user_id text,
  username text,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, provider)
);

create index if not exists idx_social_accounts_user on public.social_accounts(user_id);
create index if not exists idx_social_accounts_provider on public.social_accounts(provider);

create or replace function public._social_accounts_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;$$;

drop trigger if exists trg_social_accounts_updated on public.social_accounts;
create trigger trg_social_accounts_updated
before update on public.social_accounts
for each row execute function public._social_accounts_set_updated_at();


