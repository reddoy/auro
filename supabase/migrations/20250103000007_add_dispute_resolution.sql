-- Dispute resolution system
CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dispute_type TEXT NOT NULL CHECK (dispute_type IN ('quality', 'delivery', 'communication', 'payment', 'other')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'closed', 'escalated')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  description TEXT NOT NULL,
  customer_evidence JSONB,
  reviewer_response TEXT,
  reviewer_evidence JSONB,
  admin_notes TEXT,
  resolution TEXT,
  resolution_type TEXT CHECK (resolution_type IN ('refund_full', 'refund_partial', 'rework', 'no_action', 'escalate')),
  refund_amount_cents INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id)
);

-- Add indexes for dispute queries
CREATE INDEX IF NOT EXISTS idx_disputes_request_id ON public.disputes(request_id);
CREATE INDEX IF NOT EXISTS idx_disputes_customer_id ON public.disputes(customer_id);
CREATE INDEX IF NOT EXISTS idx_disputes_reviewer_id ON public.disputes(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_priority ON public.disputes(priority);
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON public.disputes(created_at);

-- Enable RLS on disputes
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- Create policies for disputes
CREATE POLICY "Customers can view their own disputes" ON public.disputes
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Reviewers can view disputes against them" ON public.disputes
  FOR SELECT USING (auth.uid() = reviewer_id);

CREATE POLICY "Admins can view all disputes" ON public.disputes
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Customers can create disputes" ON public.disputes
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Reviewers can respond to disputes" ON public.disputes
  FOR UPDATE USING (auth.uid() = reviewer_id AND status = 'open');

-- Add dispute fields to requests table
ALTER TABLE public.requests 
  ADD COLUMN IF NOT EXISTS dispute_id UUID REFERENCES public.disputes(id),
  ADD COLUMN IF NOT EXISTS dispute_status TEXT CHECK (dispute_status IN ('none', 'open', 'under_review', 'resolved'));

-- Add index for dispute status queries
CREATE INDEX IF NOT EXISTS idx_requests_dispute_status ON public.requests(dispute_status);

-- Create function to update dispute timestamps
CREATE OR REPLACE FUNCTION public.update_dispute_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create trigger for dispute updates
DROP TRIGGER IF EXISTS trigger_update_dispute_updated_at ON public.disputes;
CREATE TRIGGER trigger_update_dispute_updated_at
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_dispute_updated_at();

-- Create function to handle dispute resolution
CREATE OR REPLACE FUNCTION public.resolve_dispute(
  dispute_id_param UUID,
  resolution_param TEXT,
  resolution_type_param TEXT,
  refund_amount_param INTEGER DEFAULT 0,
  admin_notes_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  dispute_record RECORD;
  request_record RECORD;
BEGIN
  -- Get dispute details
  SELECT * INTO dispute_record FROM public.disputes WHERE id = dispute_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dispute not found';
  END IF;
  
  -- Get associated request
  SELECT * INTO request_record FROM public.requests WHERE id = dispute_record.request_id;
  
  -- Update dispute
  UPDATE public.disputes 
  SET 
    status = 'resolved',
    resolution = resolution_param,
    resolution_type = resolution_type_param,
    refund_amount_cents = refund_amount_param,
    admin_notes = admin_notes_param,
    resolved_at = NOW(),
    resolved_by = auth.uid(),
    updated_at = NOW()
  WHERE id = dispute_id_param;
  
  -- Update request dispute status
  UPDATE public.requests 
  SET 
    dispute_status = 'resolved',
    updated_at = NOW()
  WHERE id = dispute_record.request_id;
  
  -- If resolution involves refund, process it
  IF resolution_type_param IN ('refund_full', 'refund_partial') AND refund_amount_param > 0 THEN
    -- Mark request for refund processing
    UPDATE public.requests 
    SET 
      refund_status = CASE 
        WHEN refund_amount_param >= request_record.amount_cents THEN 'refunded'
        ELSE 'partially_refunded'
      END,
      refund_reason = 'dispute_resolution',
      refunded_amount_cents = refund_amount_param,
      updated_at = NOW()
    WHERE id = dispute_record.request_id;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Add comments explaining dispute system
COMMENT ON TABLE public.disputes IS 'Customer disputes and resolution tracking';
COMMENT ON COLUMN public.disputes.dispute_type IS 'Type of dispute: quality, delivery, communication, payment, other';
COMMENT ON COLUMN public.disputes.status IS 'Current dispute status: open, under_review, resolved, closed, escalated';
COMMENT ON COLUMN public.disputes.priority IS 'Dispute priority: low, medium, high, urgent';
COMMENT ON COLUMN public.disputes.resolution_type IS 'How dispute was resolved: refund_full, refund_partial, rework, no_action, escalate';
COMMENT ON FUNCTION public.resolve_dispute IS 'Resolves a dispute with specified resolution and refund amount';
