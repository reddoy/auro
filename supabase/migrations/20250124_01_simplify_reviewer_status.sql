-- ============================================
-- SIMPLIFY REVIEWER STATUS: Migrate from reviewer_approved to is_reviewer
-- ============================================
-- This migration:
-- 1. Changes is_reviewer from boolean to text ('pending', 'approved', 'rejected', null)
-- 2. Migrates data from reviewer_approved to is_reviewer
-- 3. Drops the redundant reviewer_approved column
-- 4. Cleans up unused fields
-- ============================================

-- Step 1: Add a temporary column to store the new text value
alter table if exists public.profiles
  add column if not exists _is_reviewer_temp text;

-- Step 2: Migrate data to temporary column
-- Logic:
-- - If reviewer_approved exists and = 'pending' → _is_reviewer_temp = 'pending'
-- - If reviewer_approved exists and = 'approved' → _is_reviewer_temp = 'approved'
-- - If reviewer_approved exists and = 'rejected' → _is_reviewer_temp = 'rejected'
-- - If reviewer_approved doesn't exist or is null but is_reviewer = true → _is_reviewer_temp = 'approved' (legacy data)
-- - Otherwise → _is_reviewer_temp = null
do $$
begin
  -- Check if reviewer_approved column exists
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'profiles' 
    and column_name = 'reviewer_approved'
  ) then
    -- Column exists, migrate from reviewer_approved
    update public.profiles
    set _is_reviewer_temp = case
      when reviewer_approved = 'pending' then 'pending'
      when reviewer_approved = 'approved' then 'approved'
      when reviewer_approved = 'rejected' then 'rejected'
      when reviewer_approved is null and (is_reviewer::text = 'true' or is_reviewer = true) then 'approved'
      else null
    end;
  else
    -- Column doesn't exist, check if is_reviewer is boolean or text
    if exists (
      select 1 from information_schema.columns 
      where table_schema = 'public' 
      and table_name = 'profiles' 
      and column_name = 'is_reviewer'
      and data_type = 'boolean'
    ) then
      -- is_reviewer is boolean, migrate from boolean
      update public.profiles
      set _is_reviewer_temp = case
        when is_reviewer::boolean = true then 'approved'
        else null
      end;
    else
      -- is_reviewer is already text or doesn't exist, just copy it
      update public.profiles
      set _is_reviewer_temp = is_reviewer::text;
    end if;
  end if;
end $$;

-- Step 3: Drop the old boolean is_reviewer column
alter table if exists public.profiles
  drop column if exists is_reviewer;

-- Step 4: Rename temporary column to is_reviewer
alter table if exists public.profiles
  rename column _is_reviewer_temp to is_reviewer;

-- Step 5: Add check constraint to ensure valid values
alter table if exists public.profiles
  add constraint check_is_reviewer_values 
  check (is_reviewer is null or is_reviewer in ('pending', 'approved', 'rejected'));

-- Step 6: Drop the redundant reviewer_approved column (if it exists)
alter table if exists public.profiles
  drop column if exists reviewer_approved;

-- Step 7: Drop old indexes that referenced reviewer_approved
drop index if exists public.idx_profiles_reviewer_approved;
drop index if exists public.idx_profiles_reviewer_approved_active;

-- Step 8: Create new indexes for is_reviewer
create index if not exists idx_profiles_is_reviewer_pending 
  on public.profiles(is_reviewer) 
  where is_reviewer = 'pending';

create index if not exists idx_profiles_is_reviewer_approved 
  on public.profiles(is_reviewer) 
  where is_reviewer = 'approved';

-- Step 9: Add comment explaining the new column
comment on column public.profiles.is_reviewer is 
  'Reviewer status: null (not a reviewer), pending (awaiting approval), approved (active reviewer), rejected (not approved)';

-- ============================================
-- CLEAN UP UNUSED FIELDS
-- ============================================

-- Drop reviewer_signup_status if it exists (redundant with onboarding preferences)
alter table if exists public.profiles
  drop column if exists reviewer_signup_status;

-- Step 10: Migrate full_name to first_name and last_name, then drop full_name
-- First, drop views that depend on full_name
drop view if exists public.failed_payment_distributions;
drop view if exists public.payment_distribution_status;

-- Ensure first_name and last_name columns exist
alter table if exists public.profiles
  add column if not exists first_name text;

alter table if exists public.profiles
  add column if not exists last_name text;

-- Migrate full_name data to first_name and last_name (if full_name column exists)
-- Split full_name on space - first word goes to first_name, rest goes to last_name
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'profiles' 
    and column_name = 'full_name'
  ) then
    update public.profiles
    set 
      first_name = case 
        when full_name is not null and position(' ' in full_name) > 0 
        then substring(full_name from 1 for position(' ' in full_name) - 1)
        else full_name
      end,
      last_name = case
        when full_name is not null and position(' ' in full_name) > 0
        then substring(full_name from position(' ' in full_name) + 1)
        else null
      end
    where full_name is not null 
      and (first_name is null or last_name is null);
  end if;
end $$;

-- Drop full_name column (we use first_name and last_name instead)
alter table if exists public.profiles
  drop column if exists full_name;

-- Recreate views with first_name and last_name concatenated
create or replace view public.failed_payment_distributions as
select 
  r.id as request_id,
  r.status,
  r.amount_cents,
  r.application_fee_cents,
  r.payment_distribution_attempts,
  r.payment_distribution_error,
  r.payment_distribution_failed_at,
  r.created_at as request_created_at,
  p.username as reviewer_username,
  trim(concat(p.first_name, ' ', p.last_name)) as reviewer_name,
  p.email as reviewer_email,
  p.stripe_connect_account_id,
  case 
    when p.stripe_connect_account_id is null then 'NO_CONNECT_ACCOUNT'
    when r.payment_distribution_error like '%Insufficient funds%' then 'INSUFFICIENT_FUNDS'
    when r.payment_distribution_error like '%STRIPE_ERROR%' then 'STRIPE_ERROR'
    else 'UNKNOWN_ERROR'
  end as error_type
from requests r
join profiles p on p.id = r.influencer_id
where r.status = 'completed'
  and (r.payment_distributed is null or r.payment_distributed = false)
  and r.payment_distribution_error is not null
order by r.payment_distribution_failed_at desc;

create or replace view public.payment_distribution_status as
select 
  r.id as request_id,
  r.status,
  r.amount_cents,
  r.application_fee_cents,
  (r.amount_cents - coalesce(r.application_fee_cents, 0)) as reviewer_amount_cents,
  r.payment_distributed,
  r.payment_distributed_at,
  r.stripe_transfer_id,
  r.payment_distribution_attempts,
  r.payment_distribution_error,
  r.payment_distribution_failed_at,
  p.username as reviewer_username,
  trim(concat(p.first_name, ' ', p.last_name)) as reviewer_name,
  p.stripe_connect_account_id,
  case 
    when r.payment_distributed = true then 'DISTRIBUTED'
    when r.status != 'completed' then 'NOT_COMPLETED'
    when p.stripe_connect_account_id is null then 'NO_CONNECT_ACCOUNT'
    when r.payment_distribution_error is not null then 'FAILED'
    else 'PENDING'
  end as distribution_status
from requests r
join profiles p on p.id = r.influencer_id
where r.status in ('completed', 'paid', 'in_progress')
order by r.created_at desc;

-- Step 11: Restrict access to payment views for security
-- Revoke all public access to these sensitive views
revoke all on public.failed_payment_distributions from public;
revoke all on public.failed_payment_distributions from anon;
revoke all on public.failed_payment_distributions from authenticated;

revoke all on public.payment_distribution_status from public;
revoke all on public.payment_distribution_status from anon;
revoke all on public.payment_distribution_status from authenticated;

-- Only grant access to service_role (for admin/server-side operations)
grant select on public.failed_payment_distributions to service_role;
grant select on public.payment_distribution_status to service_role;

-- Note: Keep email, push_token, and other fields that might be used elsewhere
-- If you want to drop additional fields, add them here

-- ============================================
-- VERIFICATION QUERIES (run these to check the migration)
-- ============================================

-- Check pending reviewers
-- SELECT id, username, first_name, last_name, is_reviewer 
-- FROM public.profiles 
-- WHERE is_reviewer = 'pending';

-- Check approved reviewers
-- SELECT id, username, first_name, last_name, is_reviewer 
-- FROM public.profiles 
-- WHERE is_reviewer = 'approved';

-- Check all reviewer statuses
-- SELECT is_reviewer, count(*) 
-- FROM public.profiles 
-- GROUP BY is_reviewer;

