-- Create function to count all reviewers including unverified email signups
-- This function counts reviewers from both verified profiles and unverified auth.users

CREATE OR REPLACE FUNCTION public.get_total_reviewer_count()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  verified_count integer := 0;
  unverified_count integer := 0;
  total_count integer := 0;
BEGIN
  -- Count verified reviewers from profiles table
  SELECT COUNT(*) INTO verified_count
  FROM public.profiles
  WHERE is_reviewer = true;
  
  -- Count unverified signups from auth.users who have profiles but aren't marked as reviewers yet
  -- This includes users who signed up but haven't completed email verification
  SELECT COUNT(*) INTO unverified_count
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.email_confirmed_at IS NULL  -- Not email verified
    AND p.id IS NOT NULL  -- Has a profile (signed up)
    AND (p.is_reviewer IS NULL OR p.is_reviewer = false);  -- Not already counted as verified reviewer
  
  total_count := verified_count + unverified_count;
  
  RETURN total_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_total_reviewer_count() TO authenticated;

-- Create a simpler version that counts all signups with reviewer intent
-- This counts users who have signed up (have profiles) regardless of email verification
CREATE OR REPLACE FUNCTION public.get_all_reviewer_signups_count()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_count integer := 0;
BEGIN
  -- Count all users who have profiles (signed up) regardless of email verification
  SELECT COUNT(*) INTO total_count
  FROM public.profiles
  WHERE is_reviewer = true OR reviewer_signup_status IS NOT NULL;
  
  RETURN total_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_all_reviewer_signups_count() TO authenticated;
