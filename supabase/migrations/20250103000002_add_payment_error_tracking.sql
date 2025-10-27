-- Add fields to track payment distribution failures and retry attempts
ALTER TABLE requests 
ADD COLUMN IF NOT EXISTS payment_distribution_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_distribution_error TEXT,
ADD COLUMN IF NOT EXISTS payment_distribution_failed_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for monitoring failed payments
CREATE INDEX IF NOT EXISTS idx_requests_payment_distribution_attempts ON requests(payment_distribution_attempts);
CREATE INDEX IF NOT EXISTS idx_requests_payment_distribution_error ON requests(payment_distribution_error);
CREATE INDEX IF NOT EXISTS idx_requests_payment_distribution_failed_at ON requests(payment_distribution_failed_at);

-- Add comments explaining the new fields
COMMENT ON COLUMN requests.payment_distribution_attempts IS 'Number of times payment distribution has been attempted';
COMMENT ON COLUMN requests.payment_distribution_error IS 'Last error message from payment distribution attempt';
COMMENT ON COLUMN requests.payment_distribution_failed_at IS 'When the last payment distribution attempt failed';

-- Create a view for monitoring failed payments
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
