-- Fix pending payout balance calculation to include Stripe fees (2.9% + $0.30)
-- This migration updates the trigger function to use the correct fee calculation

-- Drop and recreate the trigger function with corrected calculations including Stripe fees
CREATE OR REPLACE FUNCTION update_reviewer_pending_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- When a request becomes paid and not yet distributed, add to pending balance
  IF NEW.amount_cents IS NOT NULL AND NEW.influencer_id IS NOT NULL 
     AND NEW.status = 'paid' 
     AND (NEW.payment_distributed IS NULL OR NEW.payment_distributed = FALSE) THEN
    -- Only add if this is a new paid request or status changed to paid
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.status != 'paid' OR OLD.status IS NULL)) THEN
      -- Calculate reviewer's share: amount - auro fee (20%) - stripe fee (2.9% + $0.30)
      DECLARE
        reviewer_amount_cents INTEGER;
      BEGIN
        reviewer_amount_cents := NEW.amount_cents - ROUND(NEW.amount_cents * 0.2) - ROUND(NEW.amount_cents * 0.029 + 30);
        
        UPDATE profiles
        SET pending_payout_balance_cents = COALESCE(pending_payout_balance_cents, 0) + reviewer_amount_cents
        WHERE id = NEW.influencer_id;
      END;
    END IF;
  END IF;
  
  -- When a review is completed, subtract from pending balance (they earned it)
  IF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed'
     AND NEW.influencer_id IS NOT NULL 
     AND NEW.amount_cents IS NOT NULL THEN
    -- Remove the pending amount since the review is now complete
    DECLARE
      reviewer_amount_cents INTEGER;
    BEGIN
      reviewer_amount_cents := NEW.amount_cents - ROUND(NEW.amount_cents * 0.2) - ROUND(NEW.amount_cents * 0.029 + 30);
      
      UPDATE profiles
      SET pending_payout_balance_cents = GREATEST(0, COALESCE(pending_payout_balance_cents, 0) - reviewer_amount_cents)
      WHERE id = NEW.influencer_id;
    END;
  END IF;
  
  -- When a review is rejected, subtract from pending balance (no payout for rejected requests)
  IF TG_OP = 'UPDATE' AND NEW.status = 'rejected' AND OLD.status != 'rejected'
     AND NEW.influencer_id IS NOT NULL 
     AND NEW.amount_cents IS NOT NULL
     AND OLD.status = 'paid' THEN
    -- Remove the pending amount since the review was rejected
    DECLARE
      reviewer_amount_cents INTEGER;
    BEGIN
      reviewer_amount_cents := NEW.amount_cents - ROUND(NEW.amount_cents * 0.2) - ROUND(NEW.amount_cents * 0.029 + 30);
      
      UPDATE profiles
      SET pending_payout_balance_cents = GREATEST(0, COALESCE(pending_payout_balance_cents, 0) - reviewer_amount_cents)
      WHERE id = NEW.influencer_id;
    END;
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

-- Recalculate pending payout balances for all reviewers using the correct formula
UPDATE profiles
SET pending_payout_balance_cents = (
  SELECT COALESCE(SUM(
    amount_cents - ROUND(amount_cents * 0.2) - ROUND(amount_cents * 0.029 + 30)
  ), 0)
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

