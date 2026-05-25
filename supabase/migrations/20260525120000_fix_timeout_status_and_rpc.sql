-- Fix production timeout pipeline: allow timeout status, fix handle_request_timeouts profile columns.

ALTER TABLE public.requests DROP CONSTRAINT IF EXISTS requests_status_check;

ALTER TABLE public.requests
  ADD CONSTRAINT requests_status_check
  CHECK (
    status = ANY (
      ARRAY[
        'pending'::text,
        'accepted'::text,
        'rejected'::text,
        'paid'::text,
        'in_progress'::text,
        'completed'::text,
        'timeout'::text,
        'refunded'::text
      ]
    )
  );

COMMENT ON CONSTRAINT requests_status_check ON public.requests IS
  'Request lifecycle status including timeout (auto-refund) and refunded (payment reversed).';

DROP FUNCTION IF EXISTS public.handle_request_timeouts();

CREATE OR REPLACE FUNCTION public.handle_request_timeouts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  timeout_request RECORD;
  marked_count INTEGER := 0;
BEGIN
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
      p.email AS customer_email,
      COALESCE(
        NULLIF(TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))), ''),
        p.username,
        'Customer'
      ) AS customer_name
    FROM public.requests r
    LEFT JOIN public.profiles p ON p.id = r.user_id
    WHERE r.status IN ('paid', 'in_progress')
      AND r.refund_status = 'none'
      AND r.amount_cents > 0
      AND r.stripe_payment_intent_id IS NOT NULL
      AND (
        (r.status = 'paid' AND r.created_at < NOW() - INTERVAL '14 days')
        OR
        (r.status = 'in_progress' AND r.deliver_by IS NOT NULL AND r.deliver_by < NOW())
        OR
        (r.created_at < NOW() - INTERVAL '16 days')
      )
  LOOP
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

    marked_count := marked_count + 1;
  END LOOP;

  INSERT INTO public.timeout_log (
    request_id,
    timeout_type,
    timeout_reason,
    amount_cents,
    customer_email,
    created_at
  ) VALUES (
    NULL,
    'summary',
    'Timeout check completed - ' || marked_count || ' request(s) marked',
    0,
    NULL,
    NOW()
  );

  RETURN marked_count;
END;
$$;

COMMENT ON FUNCTION public.handle_request_timeouts() IS
  'Marks eligible paid/in_progress requests as timeout for automatic refund (14 days to accept, 48 hours to complete). Returns count marked.';

-- Backfill accept_by for paid rows created before confirm/webhook set the deadline.
UPDATE public.requests
SET accept_by = created_at + INTERVAL '14 days'
WHERE status IN ('paid', 'in_progress')
  AND accept_by IS NULL
  AND created_at IS NOT NULL;
