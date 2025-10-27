-- Add payment status tracking to requests table
-- This will help track the payment lifecycle more accurately

-- Add payment_status field to track the current state
ALTER TABLE requests ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

-- Update payment_status based on existing data
UPDATE requests 
SET payment_status = CASE 
  WHEN status = 'completed' AND payment_distributed = true THEN 'paid'
  WHEN status = 'completed' AND payment_distributed = false AND payment_distribution_error IS NOT NULL THEN 'failed'
  WHEN status = 'completed' AND payment_distributed = false THEN 'queued'
  WHEN status = 'paid' THEN 'pending'
  ELSE 'pending'
END;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_requests_payment_status ON requests(payment_status);

-- Add comment to explain the payment status values
COMMENT ON COLUMN requests.payment_status IS 'Payment status: pending (not completed), queued (completed, waiting for funds), paid (distributed), failed (distribution failed)';
