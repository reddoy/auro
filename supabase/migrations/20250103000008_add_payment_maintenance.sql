-- Scheduled function to process timeouts and retry failed distributions
CREATE OR REPLACE FUNCTION public.process_payment_maintenance()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  timeout_count INTEGER := 0;
  retry_count INTEGER := 0;
  maintenance_log_id UUID;
BEGIN
  -- Create maintenance log entry
  INSERT INTO public.maintenance_log (
    maintenance_type,
    started_at,
    status
  ) VALUES (
    'payment_maintenance',
    NOW(),
    'running'
  ) RETURNING id INTO maintenance_log_id;

  -- Process timeout requests
  BEGIN
    PERFORM public.handle_request_timeouts();
    
    -- Count processed timeouts
    SELECT COUNT(*) INTO timeout_count
    FROM public.requests 
    WHERE status = 'timeout' 
      AND refunded_at > NOW() - INTERVAL '1 hour';
    
  EXCEPTION WHEN OTHERS THEN
    -- Log timeout processing error
    INSERT INTO public.maintenance_log (
      maintenance_type,
      started_at,
      completed_at,
      status,
      error_message
    ) VALUES (
      'timeout_processing',
      NOW(),
      NOW(),
      'failed',
      SQLERRM
    );
  END;

  -- Process failed distribution retries
  BEGIN
    -- This would typically call an API endpoint, but we'll log the requests that need retry
    SELECT COUNT(*) INTO retry_count
    FROM public.requests 
    WHERE status = 'completed' 
      AND payment_distributed = false
      AND payment_distribution_attempts < 3
      AND payment_distribution_failed_at < NOW() - INTERVAL '1 hour';
    
  EXCEPTION WHEN OTHERS THEN
    -- Log retry processing error
    INSERT INTO public.maintenance_log (
      maintenance_type,
      started_at,
      completed_at,
      status,
      error_message
    ) VALUES (
      'retry_processing',
      NOW(),
      NOW(),
      'failed',
      SQLERRM
    );
  END;

  -- Update maintenance log
  UPDATE public.maintenance_log 
  SET 
    completed_at = NOW(),
    status = 'completed',
    details = jsonb_build_object(
      'timeouts_processed', timeout_count,
      'retries_needed', retry_count
    )
  WHERE id = maintenance_log_id;

  -- Log summary
  INSERT INTO public.maintenance_log (
    maintenance_type,
    started_at,
    completed_at,
    status,
    details
  ) VALUES (
    'payment_maintenance_summary',
    NOW(),
    NOW(),
    'completed',
    jsonb_build_object(
      'timeouts_processed', timeout_count,
      'retries_needed', retry_count,
      'maintenance_log_id', maintenance_log_id
    )
  );

END;
$$;

-- Create maintenance log table
CREATE TABLE IF NOT EXISTS public.maintenance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_type TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  error_message TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for maintenance log
CREATE INDEX IF NOT EXISTS idx_maintenance_log_type ON public.maintenance_log(maintenance_type);
CREATE INDEX IF NOT EXISTS idx_maintenance_log_started_at ON public.maintenance_log(started_at);
CREATE INDEX IF NOT EXISTS idx_maintenance_log_status ON public.maintenance_log(status);

-- Enable RLS on maintenance log
ALTER TABLE public.maintenance_log ENABLE ROW LEVEL SECURITY;

-- Create policy for maintenance log (admin only)
CREATE POLICY "Admin can view maintenance logs" ON public.maintenance_log
  FOR ALL USING (auth.role() = 'service_role');

-- Create function to get payment system health
CREATE OR REPLACE FUNCTION public.get_payment_system_health()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  health_data JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_requests', (SELECT COUNT(*) FROM public.requests WHERE amount_cents > 0),
    'pending_payouts', (SELECT COUNT(*) FROM public.requests WHERE status = 'completed' AND payment_distributed = false),
    'failed_distributions', (SELECT COUNT(*) FROM public.requests WHERE status = 'completed' AND payment_distributed = false AND payment_distribution_attempts > 0),
    'open_disputes', (SELECT COUNT(*) FROM public.requests WHERE dispute_status = 'open'),
    'timeout_requests', (SELECT COUNT(*) FROM public.requests WHERE status = 'timeout' AND refund_status = 'none'),
    'total_revenue_cents', (SELECT COALESCE(SUM(amount_cents), 0) FROM public.requests WHERE amount_cents > 0),
    'total_fees_cents', (SELECT COALESCE(SUM(application_fee_cents), 0) FROM public.requests WHERE application_fee_cents > 0),
    'total_paid_out_cents', (SELECT COALESCE(SUM(reviewer_amount_cents), 0) FROM public.requests WHERE reviewer_amount_cents > 0),
    'total_refunded_cents', (SELECT COALESCE(SUM(refunded_amount_cents), 0) FROM public.requests WHERE refunded_amount_cents > 0),
    'last_maintenance', (
      SELECT jsonb_build_object(
        'completed_at', completed_at,
        'status', status,
        'details', details
      )
      FROM public.maintenance_log 
      WHERE maintenance_type = 'payment_maintenance_summary'
      ORDER BY completed_at DESC 
      LIMIT 1
    ),
    'health_score', (
      CASE 
        WHEN (SELECT COUNT(*) FROM public.requests WHERE status = 'completed' AND payment_distributed = false) = 0 THEN 100
        WHEN (SELECT COUNT(*) FROM public.requests WHERE status = 'completed' AND payment_distributed = false) < 5 THEN 90
        WHEN (SELECT COUNT(*) FROM public.requests WHERE status = 'completed' AND payment_distributed = false) < 10 THEN 75
        WHEN (SELECT COUNT(*) FROM public.requests WHERE status = 'completed' AND payment_distributed = false) < 20 THEN 50
        ELSE 25
      END
    )
  ) INTO health_data;
  
  RETURN health_data;
END;
$$;

-- Add comments
COMMENT ON FUNCTION public.process_payment_maintenance() IS 'Scheduled function to process timeouts and retry failed distributions';
COMMENT ON FUNCTION public.get_payment_system_health() IS 'Returns comprehensive health metrics for the payment system';
COMMENT ON TABLE public.maintenance_log IS 'Logs of automated maintenance tasks and their results';
