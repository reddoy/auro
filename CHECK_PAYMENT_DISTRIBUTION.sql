-- ============================================
-- CHECK IF PAYMENT WAS DISTRIBUTED
-- ============================================
-- Use this to check if a specific request's payment was distributed to the reviewer

-- Replace 'REQUEST_ID_HERE' with the actual request ID
SELECT 
  r.id as request_id,
  r.status,
  r.amount_cents,
  r.application_fee_cents,
  r.reviewer_amount_cents,
  r.payment_distributed,
  r.payment_distributed_at,
  r.stripe_transfer_id,
  r.payment_distribution_attempts,
  r.payment_distribution_error,
  r.payment_distribution_failed_at,
  p.stripe_connect_account_id,
  p.username as reviewer_username,
  CONCAT(p.first_name, ' ', p.last_name) as reviewer_name,
  p.email as reviewer_email,
  CASE 
    WHEN r.payment_distributed = true THEN '✅ PAID'
    WHEN r.payment_distributed = false AND p.stripe_connect_account_id IS NULL THEN '⏸️ WAITING - No Stripe account'
    WHEN r.payment_distributed = false AND p.stripe_connect_account_id IS NOT NULL THEN '❌ FAILED - Check error'
    ELSE '❓ UNKNOWN'
  END as payment_status
FROM requests r
LEFT JOIN profiles p ON p.id = r.influencer_id
WHERE r.id = 'REQUEST_ID_HERE'  -- Replace with actual request ID
  AND r.status = 'completed';

-- ============================================
-- CHECK ALL PENDING PAYMENTS
-- ============================================
-- Find all completed reviews that haven't been paid yet

SELECT 
  r.id as request_id,
  r.status,
  r.amount_cents / 100.0 as total_amount_dollars,
  r.application_fee_cents / 100.0 as auro_fee_dollars,
  (r.amount_cents - r.application_fee_cents) / 100.0 as reviewer_amount_dollars,
  r.payment_distributed,
  r.payment_distribution_attempts,
  r.payment_distribution_error,
  r.payment_distribution_failed_at,
  r.created_at as review_completed_at,
  p.stripe_connect_account_id,
  p.username as reviewer_username,
  p.email as reviewer_email,
  CASE 
    WHEN p.stripe_connect_account_id IS NULL THEN '⚠️ Reviewer needs to set up Stripe'
    WHEN p.stripe_connect_account_id IS NOT NULL THEN '✅ Reviewer has Stripe - should be paid'
    ELSE '❓ Unknown'
  END as issue
FROM requests r
LEFT JOIN profiles p ON p.id = r.influencer_id
WHERE r.status = 'completed'
  AND r.payment_distributed = false
ORDER BY r.created_at DESC;

-- ============================================
-- CHECK IF REVIEWER HAS STRIPE SET UP
-- ============================================
-- Check a specific reviewer's Stripe Connect account status

SELECT 
  id,
  username,
  first_name,
  last_name,
  CONCAT(first_name, ' ', last_name) as full_name,
  email,
  stripe_connect_account_id,
  is_reviewer,
  CASE 
    WHEN stripe_connect_account_id IS NULL THEN '❌ No Stripe account'
    WHEN stripe_connect_account_id IS NOT NULL THEN '✅ Has Stripe account'
    ELSE '❓ Unknown'
  END as stripe_status
FROM profiles
WHERE id = 'REVIEWER_ID_HERE'  -- Replace with reviewer's profile ID
  OR username = 'USERNAME_HERE'  -- Or replace with username
  OR email = 'EMAIL_HERE';  -- Or replace with email

-- ============================================
-- CHECK RECENT PAYMENT DISTRIBUTIONS
-- ============================================
-- See payments that were successfully distributed in the last 7 days

SELECT 
  r.id as request_id,
  r.reviewer_amount_cents / 100.0 as amount_paid_dollars,
  r.payment_distributed_at,
  r.stripe_transfer_id,
  p.username as reviewer_username,
  p.email as reviewer_email
FROM requests r
LEFT JOIN profiles p ON p.id = r.influencer_id
WHERE r.payment_distributed = true
  AND r.payment_distributed_at > NOW() - INTERVAL '7 days'
ORDER BY r.payment_distributed_at DESC;

-- ============================================
-- CHECK PAYMENT DISTRIBUTION ERRORS
-- ============================================
-- Find payments that failed to distribute

SELECT 
  r.id as request_id,
  r.amount_cents / 100.0 as total_amount_dollars,
  r.payment_distribution_attempts,
  r.payment_distribution_error,
  r.payment_distribution_failed_at,
  r.created_at as review_completed_at,
  p.username as reviewer_username,
  p.stripe_connect_account_id,
  CASE 
    WHEN r.payment_distribution_error ILIKE '%Payment held%' THEN '⏸️ Held - Waiting for Stripe setup'
    WHEN r.payment_distribution_error ILIKE '%Insufficient funds%' THEN '💰 Insufficient funds'
    ELSE '❌ Other error'
  END as error_type
FROM requests r
LEFT JOIN profiles p ON p.id = r.influencer_id
WHERE r.status = 'completed'
  AND r.payment_distributed = false
  AND r.payment_distribution_error IS NOT NULL
ORDER BY r.payment_distribution_failed_at DESC;

