-- Timeout handling function for automatic refunds
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
  -- Get Stripe secret key from environment (this would need to be set in Supabase)
  -- For now, we'll log the requests that need refunding and handle them via API
  
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
        -- 30 days since payment and no acceptance
        (r.status = 'paid' AND r.created_at < NOW() - INTERVAL '30 days')
        OR
        -- 30 days since acceptance and no completion
        (r.status = 'in_progress' AND r.accept_by IS NOT NULL AND r.accept_by < NOW() - INTERVAL '30 days')
        OR
        -- 45 days since payment regardless of status (absolute timeout)
        (r.created_at < NOW() - INTERVAL '45 days')
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
        WHEN timeout_request.status = 'paid' AND timeout_request.created_at < NOW() - INTERVAL '30 days' THEN 'no_acceptance'
        WHEN timeout_request.status = 'in_progress' AND timeout_request.accept_by < NOW() - INTERVAL '30 days' THEN 'no_completion'
        WHEN timeout_request.created_at < NOW() - INTERVAL '45 days' THEN 'absolute_timeout'
        ELSE 'unknown'
      END,
      'Automatic timeout refund required',
      timeout_request.amount_cents,
      timeout_request.customer_email,
      NOW()
    );
    
    -- Update request status to indicate timeout
    UPDATE public.requests 
    SET 
      status = 'timeout',
      refund_reason = 'timeout_' || CASE 
        WHEN timeout_request.status = 'paid' AND timeout_request.created_at < NOW() - INTERVAL '30 days' THEN 'no_acceptance'
        WHEN timeout_request.status = 'in_progress' AND timeout_request.accept_by < NOW() - INTERVAL '30 days' THEN 'no_completion'
        WHEN timeout_request.created_at < NOW() - INTERVAL '45 days' THEN 'absolute_timeout'
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

-- Create timeout log table for tracking
CREATE TABLE IF NOT EXISTS public.timeout_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.requests(id),
  timeout_type TEXT NOT NULL,
  timeout_reason TEXT NOT NULL,
  amount_cents INTEGER DEFAULT 0,
  customer_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for timeout log queries
CREATE INDEX IF NOT EXISTS idx_timeout_log_request_id ON public.timeout_log(request_id);
CREATE INDEX IF NOT EXISTS idx_timeout_log_created_at ON public.timeout_log(created_at);
CREATE INDEX IF NOT EXISTS idx_timeout_log_type ON public.timeout_log(timeout_type);

-- Enable RLS on timeout_log
ALTER TABLE public.timeout_log ENABLE ROW LEVEL SECURITY;

-- Create policy for timeout_log (admin only)
CREATE POLICY "Admin can view timeout logs" ON public.timeout_log
  FOR SELECT USING (auth.role() = 'service_role');

-- Add timeout status to requests table
ALTER TABLE public.requests 
  ADD COLUMN IF NOT EXISTS accept_by TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deliver_by TIMESTAMPTZ;

-- Update existing requests to set timeout dates
UPDATE public.requests 
SET 
  accept_by = created_at + INTERVAL '30 days',
  deliver_by = created_at + INTERVAL '60 days'
WHERE accept_by IS NULL AND status IN ('paid', 'in_progress');

-- Add indexes for timeout queries
CREATE INDEX IF NOT EXISTS idx_requests_accept_by ON public.requests(accept_by);
CREATE INDEX IF NOT EXISTS idx_requests_deliver_by ON public.requests(deliver_by);
CREATE INDEX IF NOT EXISTS idx_requests_timeout_status ON public.requests(status, refund_status, created_at);

-- Add comment explaining timeout fields
COMMENT ON COLUMN public.requests.accept_by IS 'Deadline for reviewer to accept request (30 days from payment)';
COMMENT ON COLUMN public.requests.deliver_by IS 'Deadline for reviewer to complete review (60 days from payment)';
COMMENT ON FUNCTION public.handle_request_timeouts() IS 'Processes timeout requests and marks them for automatic refund';
