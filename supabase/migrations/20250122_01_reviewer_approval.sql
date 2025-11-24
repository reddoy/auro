-- Add reviewer approval system
-- Reviewers sign up and wait for manual approval before becoming active
-- Safe to run multiple times

-- Add reviewer_approved column to profiles table
-- Values: 'pending' (awaiting approval), 'approved' (manually approved), 'rejected' (not approved), null (not a reviewer applicant)
alter table if exists public.profiles
  add column if not exists reviewer_approved text check (reviewer_approved in ('pending', 'approved', 'rejected')) default null;

-- Add index for efficient lookups of pending reviewers
create index if not exists idx_profiles_reviewer_approved on public.profiles(reviewer_approved) where reviewer_approved is not null;

-- Add index for finding approved reviewers (for listings)
create index if not exists idx_profiles_reviewer_approved_active on public.profiles(is_reviewer, reviewer_approved) where is_reviewer = true and reviewer_approved = 'approved';

-- Add comment explaining the column
comment on column public.profiles.reviewer_approved is 'Reviewer approval status: pending (awaiting manual review), approved (manually approved and active), rejected (not approved), null (not a reviewer applicant)';

-- Note: When reviewer_approved is set to 'approved', you should also set is_reviewer = true
-- When reviewer_approved is 'rejected' or null, is_reviewer should be false

