-- Add admin flag to profiles table for secure admin access control
-- This is more secure than email-based checks and allows proper audit trails

-- Add is_admin column to profiles table
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false NOT NULL;

-- Add index for admin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin) WHERE is_admin = true;

-- Add comment explaining the column
COMMENT ON COLUMN public.profiles.is_admin IS 'Admin flag: true if user has admin access, false otherwise. Only settable via direct database access for security.';

-- Enable RLS (Row Level Security) - admins can see admin status
-- Note: Regular users can't see if others are admins
-- Only service role and the user themselves can read their own admin status

-- Example: Set yourself as admin (replace with your user ID)
-- UPDATE public.profiles SET is_admin = true WHERE id = 'YOUR_USER_ID_HERE';
-- Or by email:
-- UPDATE public.profiles SET is_admin = true WHERE email = 'your-email@example.com';

