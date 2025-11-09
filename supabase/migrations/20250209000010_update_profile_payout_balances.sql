DROP FUNCTION IF EXISTS calculate_reviewer_amount_cents(requests);

CREATE OR REPLACE FUNCTION calculate_reviewer_amount_cents(request_row requests)
RETURNS INTEGER AS $$
DECLARE
  reviewer_amount INTEGER;
BEGIN
  IF request_row.reviewer_amount_cents IS NOT NULL THEN
    reviewer_amount := request_row.reviewer_amount_cents;
  ELSE
    reviewer_amount := COALESCE(request_row.amount_cents, 0) - COALESCE(request_row.application_fee_cents, 0);
  END IF;
  RETURN GREATEST(reviewer_amount, 0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS awaiting_payout_balance_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completed_paid_total_cents INTEGER DEFAULT 0;

CREATE OR REPLACE FUNCTION refresh_profile_payout_balances(profile_id UUID)
RETURNS VOID AS $$
DECLARE
  pending_total INTEGER := 0;
  awaiting_total INTEGER := 0;
  completed_total INTEGER := 0;
BEGIN
  SELECT COALESCE(SUM(calculate_reviewer_amount_cents(r)), 0)
  INTO pending_total
  FROM requests r
  WHERE r.influencer_id = profile_id
    AND r.status = 'paid'
    AND COALESCE(r.payment_distributed, FALSE) = FALSE;

  SELECT COALESCE(SUM(calculate_reviewer_amount_cents(r)), 0)
  INTO awaiting_total
  FROM requests r
  WHERE r.influencer_id = profile_id
    AND r.status = 'completed'
    AND COALESCE(r.payment_distributed, FALSE) = FALSE;

  SELECT COALESCE(SUM(calculate_reviewer_amount_cents(r)), 0)
  INTO completed_total
  FROM requests r
  WHERE r.influencer_id = profile_id
    AND r.status = 'completed'
    AND r.payment_distributed = TRUE;

  UPDATE profiles
  SET pending_payout_balance_cents = pending_total,
      awaiting_payout_balance_cents = awaiting_total,
      completed_paid_total_cents = completed_total
  WHERE id = profile_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_reviewer_pending_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.influencer_id IS NOT NULL THEN
      PERFORM refresh_profile_payout_balances(OLD.influencer_id);
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.influencer_id IS NOT NULL AND OLD.influencer_id <> NEW.influencer_id THEN
    PERFORM refresh_profile_payout_balances(OLD.influencer_id);
  END IF;

  IF NEW.influencer_id IS NOT NULL THEN
    PERFORM refresh_profile_payout_balances(NEW.influencer_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_reviewer_pending_balance ON requests;
CREATE TRIGGER trg_update_reviewer_pending_balance
AFTER INSERT OR UPDATE OR DELETE ON requests
FOR EACH ROW
EXECUTE FUNCTION update_reviewer_pending_balance();

WITH calculated AS (
  SELECT
    influencer_id,
    SUM(CASE
          WHEN status = 'paid' AND COALESCE(payment_distributed, FALSE) = FALSE
            THEN calculate_reviewer_amount_cents(r)
          ELSE 0
        END) AS pending_total,
    SUM(CASE
          WHEN status = 'completed' AND COALESCE(payment_distributed, FALSE) = FALSE
            THEN calculate_reviewer_amount_cents(r)
          ELSE 0
        END) AS awaiting_total,
    SUM(CASE
          WHEN status = 'completed' AND payment_distributed = TRUE
            THEN calculate_reviewer_amount_cents(r)
          ELSE 0
        END) AS completed_total
  FROM requests r
  GROUP BY influencer_id
)
UPDATE profiles p
SET pending_payout_balance_cents = COALESCE(c.pending_total, 0),
    awaiting_payout_balance_cents = COALESCE(c.awaiting_total, 0),
    completed_paid_total_cents = COALESCE(c.completed_total, 0)
FROM calculated c
WHERE p.id = c.influencer_id;

UPDATE profiles
SET pending_payout_balance_cents = 0,
    awaiting_payout_balance_cents = 0,
    completed_paid_total_cents = 0
WHERE pending_payout_balance_cents IS NULL
  OR awaiting_payout_balance_cents IS NULL
  OR completed_paid_total_cents IS NULL;
