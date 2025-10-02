-- Add reviewer signup completion status tracking
-- Safe to run multiple times

-- Add reviewer_signup_status column to profiles table
-- Values: 'pending' (started but not completed), 'completed' (finished signup), null (not started)
alter table if exists public.profiles
  add column if not exists reviewer_signup_status text check (reviewer_signup_status in ('pending', 'completed')) default null;

-- Add index for efficient lookups
create index if not exists idx_profiles_reviewer_signup_status on public.profiles(reviewer_signup_status);

-- Add index for reviewer count queries
create index if not exists idx_profiles_is_reviewer_completed on public.profiles(is_reviewer, reviewer_signup_status);

-- Update existing reviewers to have 'completed' status if they have is_reviewer = true
-- This handles existing users who are already reviewers
update public.profiles 
set reviewer_signup_status = 'completed' 
where is_reviewer = true and reviewer_signup_status is null;

-- Create a function to check if a user can complete reviewer signup
create or replace function public.can_complete_reviewer_signup(user_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  signup_status text;
begin
  -- Get the current signup status
  select reviewer_signup_status into signup_status
  from public.profiles
  where id = user_id;
  
  -- Allow if no status (not started) or pending (started but not completed)
  -- Block if completed (already finished signup)
  return signup_status is null or signup_status = 'pending';
end;
$$;

-- Create a function to get reviewer application status
create or replace function public.get_reviewer_signup_status(user_id uuid)
returns text
language plpgsql
security definer
as $$
declare
  signup_status text;
begin
  select reviewer_signup_status into signup_status
  from public.profiles
  where id = user_id;
  
  return coalesce(signup_status, 'not_started');
end;
$$;
