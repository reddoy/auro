-- Create reviewee waitlist table for guys who want to get reviewed
-- This is a simple waitlist to collect phone numbers before full app launch

create table if not exists public.reviewee_waitlist (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null,
  created_at timestamptz not null default now(),
  
  -- Optional metadata
  source text null, -- where they signed up from (e.g., 'homepage_footer', 'request_page')
  
  -- Prevent duplicate phone numbers
  constraint unique_phone unique (phone_number)
);

-- Create index for quick lookups
create index if not exists idx_reviewee_waitlist_created_at on public.reviewee_waitlist (created_at desc);

-- Enable RLS (Row Level Security)
alter table public.reviewee_waitlist enable row level security;

-- Allow anyone to insert (sign up)
create policy "Anyone can sign up for waitlist"
  on public.reviewee_waitlist
  for insert
  with check (true);

-- Only allow service role to read (for your admin access)
create policy "Only admins can view waitlist"
  on public.reviewee_waitlist
  for select
  using (false); -- Regular users can't read, only service role can

-- Add comment for documentation
comment on table public.reviewee_waitlist is 'Waitlist for guys interested in getting reviewed';

