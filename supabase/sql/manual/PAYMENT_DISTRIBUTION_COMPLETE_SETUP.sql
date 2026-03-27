-- Complete SQL for payment distribution error handling and monitoring
-- Run this in your Supabase SQL editor

-- 1. Add fields to track payment distribution failures and retry attempts
ALTER TABLE requests 
ADD COLUMN IF NOT EXISTS payment_distribution_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_distribution_error TEXT,
ADD COLUMN IF NOT EXISTS payment_distribution_failed_at TIMESTAMP WITH TIME ZONE;

-- 2. Add indexes for monitoring failed payments
CREATE INDEX IF NOT EXISTS idx_requests_payment_distribution_attempts ON requests(payment_distribution_attempts);
CREATE INDEX IF NOT EXISTS idx_requests_payment_distribution_error ON requests(payment_distribution_error);
CREATE INDEX IF NOT EXISTS idx_requests_payment_distribution_failed_at ON requests(payment_distribution_failed_at);

-- 3. Add comments explaining the new fields
COMMENT ON COLUMN requests.payment_distribution_attempts IS 'Number of times payment distribution has been attempted';
COMMENT ON COLUMN requests.payment_distribution_error IS 'Last error message from payment distribution attempt';
COMMENT ON COLUMN requests.payment_distribution_failed_at IS 'When the last payment distribution attempt failed';

-- 4. Create a view for monitoring failed payments
CREATE OR REPLACE VIEW failed_payment_distributions AS
SELECT 
  r.id as request_id,
  r.status,
  r.amount_cents,
  r.application_fee_cents,
  r.payment_distribution_attempts,
  r.payment_distribution_error,
  r.payment_distribution_failed_at,
  r.created_at as request_created_at,
  p.username as reviewer_username,
  p.full_name as reviewer_name,
  p.email as reviewer_email,
  p.stripe_connect_account_id,
  CASE 
    WHEN p.stripe_connect_account_id IS NULL THEN 'NO_CONNECT_ACCOUNT'
    WHEN r.payment_distribution_error LIKE '%Insufficient funds%' THEN 'INSUFFICIENT_FUNDS'
    WHEN r.payment_distribution_error LIKE '%STRIPE_ERROR%' THEN 'STRIPE_ERROR'
    ELSE 'UNKNOWN_ERROR'
  END as error_type
FROM requests r
JOIN profiles p ON p.id = r.influencer_id
WHERE r.status = 'completed'
  AND (r.payment_distributed IS NULL OR r.payment_distributed = FALSE)
  AND r.payment_distribution_error IS NOT NULL
ORDER BY r.payment_distribution_failed_at DESC;

-- 5. Create function to get payment distribution statistics
CREATE OR REPLACE FUNCTION get_payment_distribution_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_completed_requests', (
      SELECT COUNT(*) 
      FROM requests 
      WHERE status = 'completed'
    ),
    'distributed_payments', (
      SELECT COUNT(*) 
      FROM requests 
      WHERE payment_distributed = true
    ),
    'failed_distributions', (
      SELECT COUNT(*) 
      FROM requests 
      WHERE status = 'completed' 
        AND (payment_distributed IS NULL OR payment_distributed = FALSE)
        AND payment_distribution_error IS NOT NULL
    ),
    'no_connect_account', (
      SELECT COUNT(*) 
      FROM requests r
      JOIN profiles p ON p.id = r.influencer_id
      WHERE r.status = 'completed' 
        AND (r.payment_distributed IS NULL OR r.payment_distributed = FALSE)
        AND p.stripe_connect_account_id IS NULL
    ),
    'insufficient_funds', (
      SELECT COUNT(*) 
      FROM requests 
      WHERE status = 'completed' 
        AND (payment_distributed IS NULL OR payment_distributed = FALSE)
        AND payment_distribution_error LIKE '%Insufficient funds%'
    ),
    'stripe_errors', (
      SELECT COUNT(*) 
      FROM requests 
      WHERE status = 'completed' 
        AND (payment_distributed IS NULL OR payment_distributed = FALSE)
        AND payment_distribution_error LIKE '%STRIPE_ERROR%'
    ),
    'total_pending_amount', (
      SELECT COALESCE(SUM(amount_cents - COALESCE(application_fee_cents, 0)), 0)
      FROM requests 
      WHERE status = 'completed' 
        AND (payment_distributed IS NULL OR payment_distributed = FALSE)
    ),
    'total_distributed_amount', (
      SELECT COALESCE(SUM(reviewer_amount_cents), 0)
      FROM requests 
      WHERE payment_distributed = true
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 6. Fix pending payout balance calculation to match actual fee structure
CREATE OR REPLACE FUNCTION update_reviewer_pending_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- When a request becomes paid and not yet distributed, add to pending balance
  IF NEW.amount_cents IS NOT NULL AND NEW.influencer_id IS NOT NULL 
     AND NEW.status = 'paid' 
     AND (NEW.payment_distributed IS NULL OR NEW.payment_distributed = FALSE) THEN
    -- Only add if this is a new paid request or status changed to paid
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.status != 'paid' OR OLD.status IS NULL)) THEN
      -- Calculate reviewer's share (amount - auro fee)
      UPDATE profiles
      SET pending_payout_balance_cents = COALESCE(pending_payout_balance_cents, 0) + (NEW.amount_cents - COALESCE(NEW.application_fee_cents, 0))
      WHERE id = NEW.influencer_id;
    END IF;
  END IF;
  
  -- When a review is completed, subtract from pending balance (they earned it)
  IF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed'
     AND NEW.influencer_id IS NOT NULL 
     AND NEW.amount_cents IS NOT NULL THEN
    -- Remove the pending amount since the review is now complete
    UPDATE profiles
    SET pending_payout_balance_cents = GREATEST(0, COALESCE(pending_payout_balance_cents, 0) - (NEW.amount_cents - COALESCE(NEW.application_fee_cents, 0)))
    WHERE id = NEW.influencer_id;
  END IF;
  
  -- When a review is rejected, subtract from pending balance (no payout for rejected requests)
  IF TG_OP = 'UPDATE' AND NEW.status = 'rejected' AND OLD.status != 'rejected'
     AND NEW.influencer_id IS NOT NULL 
     AND NEW.amount_cents IS NOT NULL
     AND OLD.status = 'paid' THEN
    -- Remove the pending amount since the review was rejected
    UPDATE profiles
    SET pending_payout_balance_cents = GREATEST(0, COALESCE(pending_payout_balance_cents, 0) - (NEW.amount_cents - COALESCE(NEW.application_fee_cents, 0)))
    WHERE id = NEW.influencer_id;
  END IF;
  
  -- When a payment is distributed, subtract from pending balance
  IF TG_OP = 'UPDATE' AND NEW.payment_distributed = TRUE AND OLD.payment_distributed = FALSE 
     AND NEW.influencer_id IS NOT NULL THEN
    UPDATE profiles
    SET pending_payout_balance_cents = GREATEST(0, COALESCE(pending_payout_balance_cents, 0) - COALESCE(NEW.reviewer_amount_cents, 0))
    WHERE id = NEW.influencer_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Recalculate pending payout balances for all reviewers using the correct formula
UPDATE profiles
SET pending_payout_balance_cents = (
  SELECT COALESCE(SUM(amount_cents - COALESCE(application_fee_cents, 0)), 0)
  FROM requests
  WHERE influencer_id = profiles.id
    AND status = 'paid'
    AND (payment_distributed IS NULL OR payment_distributed = FALSE)
    AND amount_cents IS NOT NULL
)
WHERE id IN (
  SELECT DISTINCT influencer_id
  FROM requests
  WHERE status = 'paid'
    AND (payment_distributed IS NULL OR payment_distributed = FALSE)
);

-- 8. Create a helpful query to check current payment distribution status
CREATE OR REPLACE VIEW payment_distribution_status AS
SELECT 
  r.id as request_id,
  r.status,
  r.amount_cents,
  r.application_fee_cents,
  (r.amount_cents - COALESCE(r.application_fee_cents, 0)) as reviewer_amount_cents,
  r.payment_distributed,
  r.payment_distributed_at,
  r.stripe_transfer_id,
  r.payment_distribution_attempts,
  r.payment_distribution_error,
  r.payment_distribution_failed_at,
  p.username as reviewer_username,
  p.full_name as reviewer_name,
  p.stripe_connect_account_id,
  CASE 
    WHEN r.payment_distributed = true THEN 'DISTRIBUTED'
    WHEN r.status != 'completed' THEN 'NOT_COMPLETED'
    WHEN p.stripe_connect_account_id IS NULL THEN 'NO_CONNECT_ACCOUNT'
    WHEN r.payment_distribution_error IS NOT NULL THEN 'FAILED'
    ELSE 'PENDING'
  END as distribution_status
FROM requests r
JOIN profiles p ON p.id = r.influencer_id
WHERE r.status IN ('completed', 'paid', 'in_progress')
ORDER BY r.created_at DESC;
