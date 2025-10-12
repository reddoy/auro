-- Fix function search path security issues
-- This migration addresses the "Function Search Path Mutable" security warnings

-- Update can_complete_reviewer_signup function with secure search_path
create or replace function public.can_complete_reviewer_signup(user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
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

-- Update get_reviewer_signup_status function with secure search_path
create or replace function public.get_reviewer_signup_status(user_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
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

