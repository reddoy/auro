-- Add reviewer setup completion fields to profiles table
-- These fields are required for reviewers to appear in listings
-- Safe to run multiple times (uses IF NOT EXISTS)

-- Add stripe_connect_account_id to profiles table (if it doesn't exist)
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT;

-- Add hourly_rate to profiles table (if it doesn't exist)
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10, 2);

-- Add index for efficient queries filtering reviewers by setup completion
CREATE INDEX IF NOT EXISTS idx_profiles_reviewer_setup_complete 
ON public.profiles(is_reviewer, stripe_connect_account_id, hourly_rate)
WHERE is_reviewer = true;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.stripe_connect_account_id IS 'Stripe Connect account ID for receiving payments. Required for reviewers to appear in listings.';
COMMENT ON COLUMN public.profiles.hourly_rate IS 'Price per review in USD. Required for reviewers to appear in listings.';

