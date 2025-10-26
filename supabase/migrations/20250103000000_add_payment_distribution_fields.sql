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

-- Add pending payout balance to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS pending_payout_balance_cents INTEGER DEFAULT 0;

-- Create trigger function to automatically update pending balance
CREATE OR REPLACE FUNCTION update_reviewer_pending_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- When a request becomes paid and not yet distributed, add to pending balance
  IF NEW.amount_cents IS NOT NULL AND NEW.influencer_id IS NOT NULL 
     AND NEW.status = 'paid' 
     AND (NEW.payment_distributed IS NULL OR NEW.payment_distributed = FALSE) THEN
    -- Only add if this is a new paid request or status changed to paid
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.status != 'paid' OR OLD.status IS NULL)) THEN
      -- Calculate reviewer's share (80% of amount)
      UPDATE profiles
      SET pending_payout_balance_cents = COALESCE(pending_payout_balance_cents, 0) + FLOOR(NEW.amount_cents * 0.8)
      WHERE id = NEW.influencer_id;
    END IF;
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

-- Create trigger
DROP TRIGGER IF EXISTS trg_update_reviewer_pending_balance ON requests;
CREATE TRIGGER trg_update_reviewer_pending_balance
AFTER INSERT OR UPDATE ON requests
FOR EACH ROW
EXECUTE FUNCTION update_reviewer_pending_balance();
