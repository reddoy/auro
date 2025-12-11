-- Update timeout handling: 14 days for acceptance, 48 hours for completion
-- This migration updates timeout logic:
-- - 14 days (2 weeks) for reviewer to accept/deny when status = 'paid'
-- - 48 hours for reviewer to complete review after acceptance when status = 'in_progress'

-- Update the timeout handling function
CREATE OR REPLACE FUNCTION public.handle_request_timeouts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  timeout_request RECORD;
  refund_api_url TEXT := 'https://www.appauro.com/api/payments/refund';
  stripe_secret_key TEXT;
  stripe_client TEXT;
  refund_response TEXT;
  refund_status_code INTEGER;
BEGIN
  -- Find requests that have timed out and need refunds
  FOR timeout_request IN
    SELECT 
      r.id,
      r.user_id,
      r.influencer_id,
      r.amount_cents,
      r.stripe_payment_intent_id,
      r.created_at,
      r.accept_by,
      r.deliver_by,
      r.status,
      r.refund_status,
      p.email as customer_email,
      p.full_name as customer_name
    FROM public.requests r
    LEFT JOIN public.profiles p ON p.id = r.user_id
    WHERE r.status IN ('paid', 'in_progress')
      AND r.refund_status = 'none'
      AND r.amount_cents > 0
      AND r.stripe_payment_intent_id IS NOT NULL
      AND (
        -- 14 days since payment and no acceptance (status = 'paid')
        (r.status = 'paid' AND r.created_at < NOW() - INTERVAL '14 days')
        OR
        -- 48 hours since acceptance and no completion (status = 'in_progress')
        (r.status = 'in_progress' AND r.deliver_by IS NOT NULL AND r.deliver_by < NOW())
        OR
        -- Fallback: 16 days since payment regardless of status (14 days + 48 hours buffer)
        (r.created_at < NOW() - INTERVAL '16 days')
      )
  LOOP
    -- Log the timeout for manual processing
    INSERT INTO public.timeout_log (
      request_id,
      timeout_type,
      timeout_reason,
      amount_cents,
      customer_email,
      created_at
    ) VALUES (
      timeout_request.id,
      CASE 
        WHEN timeout_request.status = 'paid' AND timeout_request.created_at < NOW() - INTERVAL '14 days' THEN 'no_acceptance'
        WHEN timeout_request.status = 'in_progress' AND timeout_request.deliver_by IS NOT NULL AND timeout_request.deliver_by < NOW() THEN 'no_completion'
        WHEN timeout_request.created_at < NOW() - INTERVAL '16 days' THEN 'absolute_timeout'
        ELSE 'unknown'
      END,
      CASE 
        WHEN timeout_request.status = 'paid' THEN 'Automatic timeout refund required (14 days to accept/deny)'
        WHEN timeout_request.status = 'in_progress' THEN 'Automatic timeout refund required (48 hours to complete after acceptance)'
        ELSE 'Automatic timeout refund required'
      END,
      timeout_request.amount_cents,
      timeout_request.customer_email,
      NOW()
    );
    
    -- Update request status to indicate timeout
    UPDATE public.requests 
    SET 
      status = 'timeout',
      refund_reason = 'timeout_' || CASE 
        WHEN timeout_request.status = 'paid' AND timeout_request.created_at < NOW() - INTERVAL '14 days' THEN 'no_acceptance'
        WHEN timeout_request.status = 'in_progress' AND timeout_request.deliver_by IS NOT NULL AND timeout_request.deliver_by < NOW() THEN 'no_completion'
        WHEN timeout_request.created_at < NOW() - INTERVAL '16 days' THEN 'absolute_timeout'
        ELSE 'unknown'
      END,
      refunded_at = NOW()
    WHERE id = timeout_request.id;
    
  END LOOP;
  
  -- Log summary
  INSERT INTO public.timeout_log (
    request_id,
    timeout_type,
    timeout_reason,
    amount_cents,
    customer_email,
    created_at
  ) VALUES (
    NULL, -- No specific request
    'summary',
    'Timeout check completed - ' || (SELECT COUNT(*) FROM public.requests WHERE status = 'timeout' AND refunded_at > NOW() - INTERVAL '1 hour') || ' requests processed',
    0,
    NULL,
    NOW()
  );
  
END;
$$;

-- Update existing requests to set new timeout dates
-- For paid requests: accept_by = created_at + 14 days
-- For in_progress requests: deliver_by = accept_by + 48 hours (or created_at + 14 days + 48 hours if accept_by is missing)
UPDATE public.requests 
SET 
  accept_by = CASE 
    WHEN status = 'paid' AND accept_by IS NULL THEN created_at + INTERVAL '14 days'
    WHEN status = 'paid' AND (accept_by IS NOT NULL AND accept_by != created_at + INTERVAL '14 days') THEN created_at + INTERVAL '14 days'
    ELSE accept_by
  END,
  deliver_by = CASE 
    WHEN status = 'in_progress' AND accept_by IS NOT NULL THEN accept_by + INTERVAL '48 hours'
    WHEN status = 'in_progress' AND accept_by IS NULL THEN created_at + INTERVAL '14 days' + INTERVAL '48 hours'
    ELSE deliver_by
  END
WHERE status IN ('paid', 'in_progress') 
  AND (
    (status = 'paid' AND (accept_by IS NULL OR accept_by != created_at + INTERVAL '14 days'))
    OR
    (status = 'in_progress' AND (deliver_by IS NULL OR (accept_by IS NOT NULL AND deliver_by != accept_by + INTERVAL '48 hours')))
  );

-- Update comments
COMMENT ON COLUMN public.requests.accept_by IS 'Deadline for reviewer to accept/deny request (14 days from payment)';
COMMENT ON COLUMN public.requests.deliver_by IS 'Deadline for reviewer to complete review (48 hours from acceptance)';
COMMENT ON FUNCTION public.handle_request_timeouts() IS 'Processes timeout requests and marks them for automatic refund (14 days to accept, 48 hours to complete)';

