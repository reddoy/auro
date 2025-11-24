-- ============================================
-- MANUAL REVIEWER APPROVAL SQL QUERIES
-- ============================================
-- Use these queries in your Supabase SQL Editor to manually approve/reject reviewers
-- ============================================

-- 1. VIEW ALL PENDING REVIEWER APPLICATIONS
-- This shows all reviewers waiting for approval
SELECT 
  id,
  email,
  full_name,
  username,
  bio,
  skills,
  hourly_rate,
  avatar_url,
  reviewer_approved,
  reviewer_signup_status,
  created_at
FROM public.profiles
WHERE reviewer_approved = 'pending'
ORDER BY created_at DESC;

-- 2. APPROVE A SPECIFIC REVIEWER BY EMAIL
-- Replace 'reviewer@example.com' with the actual email
UPDATE public.profiles
SET 
  reviewer_approved = 'approved',
  is_reviewer = true
WHERE email = 'reviewer@example.com'
  AND reviewer_approved = 'pending';

-- 3. APPROVE A SPECIFIC REVIEWER BY ID
-- Replace 'user-uuid-here' with the actual user ID
UPDATE public.profiles
SET 
  reviewer_approved = 'approved',
  is_reviewer = true
WHERE id = 'user-uuid-here'
  AND reviewer_approved = 'pending';

-- 4. REJECT A SPECIFIC REVIEWER BY EMAIL
-- Replace 'reviewer@example.com' with the actual email
UPDATE public.profiles
SET 
  reviewer_approved = 'rejected',
  is_reviewer = false
WHERE email = 'reviewer@example.com'
  AND reviewer_approved = 'pending';

-- 5. VIEW DETAILED REVIEWER APPLICATION INFO
-- This shows more details including social handles and phone
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.username,
  p.bio,
  p.skills,
  p.hourly_rate,
  p.avatar_url,
  p.phone,
  p.links->>'instagram' as instagram_handle,
  p.links->>'tiktok' as tiktok_handle,
  p.reviewer_approved,
  p.reviewer_signup_status,
  p.created_at,
  p.preferences->>'marketing_consent' as marketing_consent
FROM public.profiles p
WHERE p.reviewer_approved = 'pending'
ORDER BY p.created_at DESC;

-- 6. APPROVE MULTIPLE REVIEWERS AT ONCE (by email list)
-- Replace the emails in the IN clause with actual emails
UPDATE public.profiles
SET 
  reviewer_approved = 'approved',
  is_reviewer = true
WHERE email IN ('reviewer1@example.com', 'reviewer2@example.com', 'reviewer3@example.com')
  AND reviewer_approved = 'pending';

-- 7. COUNT PENDING APPLICATIONS
SELECT COUNT(*) as pending_count
FROM public.profiles
WHERE reviewer_approved = 'pending';

-- 8. COUNT APPROVED REVIEWERS
SELECT COUNT(*) as approved_count
FROM public.profiles
WHERE reviewer_approved = 'approved' AND is_reviewer = true;

-- 9. VIEW ALL REVIEWER STATUSES (for overview)
SELECT 
  reviewer_approved,
  COUNT(*) as count
FROM public.profiles
WHERE reviewer_approved IS NOT NULL
GROUP BY reviewer_approved
ORDER BY reviewer_approved;

-- ============================================
-- QUICK APPROVAL WORKFLOW
-- ============================================
-- Step 1: View pending applications
-- Run query #1 or #5 above

-- Step 2: Review the applications in Supabase dashboard

-- Step 3: Approve or reject
-- Run query #2 (approve) or #4 (reject) for each reviewer

-- ============================================
-- NOTES
-- ============================================
-- - When approving: Set both reviewer_approved='approved' AND is_reviewer=true
-- - When rejecting: Set reviewer_approved='rejected' AND is_reviewer=false
-- - Only reviewers with reviewer_approved='approved' will appear in public listings
-- - Users will receive email notifications (you may want to set up a trigger for this)

