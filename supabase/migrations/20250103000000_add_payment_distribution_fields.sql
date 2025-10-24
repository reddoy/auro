-- Add fields to track payment distribution to reviewers
ALTER TABLE requests 
ADD COLUMN IF NOT EXISTS payment_distributed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payment_distributed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT,
ADD COLUMN IF NOT EXISTS reviewer_amount_cents INTEGER;

-- Add index for payment distribution queries
CREATE INDEX IF NOT EXISTS idx_requests_payment_distributed ON requests(payment_distributed);
CREATE INDEX IF NOT EXISTS idx_requests_payment_distributed_at ON requests(payment_distributed_at);

-- Add comment explaining the payment flow
COMMENT ON COLUMN requests.payment_distributed IS 'Whether payment has been distributed to the reviewer';
COMMENT ON COLUMN requests.payment_distributed_at IS 'When the payment was distributed to the reviewer';
COMMENT ON COLUMN requests.stripe_transfer_id IS 'Stripe transfer ID for the payment to reviewer';
COMMENT ON COLUMN requests.reviewer_amount_cents IS 'Amount in cents that was transferred to the reviewer';
