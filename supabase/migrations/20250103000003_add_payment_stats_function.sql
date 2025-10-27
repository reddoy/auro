-- Create function to get payment distribution statistics
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
