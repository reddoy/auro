-- Exclude refunded/partially-refunded requests from the reviewer "awaiting payout"
-- and "pending payout" rollups. Before this migration, a request that was
-- refunded (refund_status='refunded') but still had status='completed'
-- (the schema's status enum has no 'refunded' value) continued to inflate
-- profiles.awaiting_payout_balance_cents, making the dashboard report money
-- the reviewer is no longer owed.

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
    AND COALESCE(r.payment_distributed, FALSE) = FALSE
    AND COALESCE(r.refund_status, 'none') NOT IN ('refunded', 'partially_refunded');

  SELECT COALESCE(SUM(calculate_reviewer_amount_cents(r)), 0)
  INTO awaiting_total
  FROM requests r
  WHERE r.influencer_id = profile_id
    AND r.status = 'completed'
    AND COALESCE(r.payment_distributed, FALSE) = FALSE
    AND COALESCE(r.refund_status, 'none') NOT IN ('refunded', 'partially_refunded');

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

-- Rebuild balances now so any historically-refunded rows stop counting.
WITH calculated AS (
  SELECT
    influencer_id,
    SUM(CASE
          WHEN status = 'paid'
            AND COALESCE(payment_distributed, FALSE) = FALSE
            AND COALESCE(refund_status, 'none') NOT IN ('refunded', 'partially_refunded')
            THEN calculate_reviewer_amount_cents(r)
          ELSE 0
        END) AS pending_total,
    SUM(CASE
          WHEN status = 'completed'
            AND COALESCE(payment_distributed, FALSE) = FALSE
            AND COALESCE(refund_status, 'none') NOT IN ('refunded', 'partially_refunded')
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
