-- ============================================
-- CHECK YOUR SPECIFIC REQUEST
-- Request ID: d3f6090f-60d9-4ee7-9fa2-071dd556d930
-- Reviewer ID: f2e184eb-d503-45c9-9334-74dfc646d5d5
-- ============================================

-- Check 1: Request payment status
SELECT 
  id,
  status,
  amount_cents / 100.0 as total_dollars,
  application_fee_cents / 100.0 as auro_fee_dollars,
  (amount_cents - application_fee_cents) / 100.0 as reviewer_amount_dollars,
  payment_distributed,
  payment_distributed_at,
  stripe_transfer_id,
  payment_distribution_attempts,
  payment_distribution_error,
  payment_distribution_failed_at,
  CASE 
    WHEN payment_distributed = true THEN '✅ PAYMENT DISTRIBUTED'
    WHEN payment_distributed = false AND payment_distribution_error ILIKE '%Payment held%' THEN '⏸️ HELD - Waiting for Stripe setup'
    WHEN payment_distributed = false THEN '❌ NOT DISTRIBUTED - Check error'
    ELSE '❓ UNKNOWN'
  END as payment_status
FROM requests
WHERE id = 'd3f6090f-60d9-4ee7-9fa2-071dd556d930';

-- Check 2: Reviewer's Stripe Connect account status
SELECT 
  p.id,
  p.username,
  p.first_name,
  p.last_name,
  CONCAT(p.first_name, ' ', p.last_name) as full_name,
  p.email,
  p.stripe_connect_account_id,
  CASE 
    WHEN p.stripe_connect_account_id IS NULL THEN '❌ NO STRIPE ACCOUNT'
    ELSE '✅ HAS STRIPE ACCOUNT'
  END as stripe_status
FROM profiles p
WHERE p.id = 'f2e184eb-d503-45c9-9334-74dfc646d5d5';

-- Check 3: Combined view - Request + Reviewer Stripe status
SELECT 
  r.id as request_id,
  r.status,
  r.amount_cents / 100.0 as total_dollars,
  r.payment_distributed,
  r.payment_distributed_at,
  r.payment_distribution_error,
  r.payment_distribution_attempts,
  p.stripe_connect_account_id,
  p.username as reviewer_username,
  CASE 
    WHEN r.payment_distributed = true THEN '✅ PAID'
    WHEN r.payment_distributed = false AND p.stripe_connect_account_id IS NULL THEN '⏸️ HELD - No Stripe account'
    WHEN r.payment_distributed = false AND p.stripe_connect_account_id IS NOT NULL THEN '⚠️ READY - Should be paid on next cron run'
    ELSE '❓ UNKNOWN'
  END as overall_status
FROM requests r
LEFT JOIN profiles p ON p.id = r.influencer_id
WHERE r.id = 'd3f6090f-60d9-4ee7-9fa2-071dd556d930';

-- Check 4: Find all held payments for this reviewer
SELECT 
  r.id as request_id,
  r.amount_cents / 100.0 as total_dollars,
  (r.amount_cents - r.application_fee_cents) / 100.0 as reviewer_amount_dollars,
  r.payment_distribution_error,
  r.created_at as review_completed_at,
  p.stripe_connect_account_id IS NOT NULL as reviewer_has_stripe
FROM requests r
LEFT JOIN profiles p ON p.id = r.influencer_id
WHERE r.influencer_id = 'f2e184eb-d503-45c9-9334-74dfc646d5d5'
  AND r.status = 'completed'
  AND r.payment_distributed = false
  AND r.payment_distribution_error ILIKE '%Payment held%'
ORDER BY r.created_at DESC;

