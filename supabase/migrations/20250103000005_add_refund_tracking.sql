-- Add refund tracking fields to requests table
ALTER TABLE public.requests 
  ADD COLUMN IF NOT EXISTS refunded_amount_cents INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_status TEXT CHECK (refund_status IN ('none', 'pending', 'refunded', 'partially_refunded', 'failed')) DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS refund_reason TEXT,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_refund_id TEXT;

-- Add index for refund queries
CREATE INDEX IF NOT EXISTS idx_requests_refund_status ON public.requests(refund_status);
CREATE INDEX IF NOT EXISTS idx_requests_refunded_at ON public.requests(refunded_at);

-- Add comment explaining refund fields
COMMENT ON COLUMN public.requests.refunded_amount_cents IS 'Total amount refunded in cents';
COMMENT ON COLUMN public.requests.refund_status IS 'Current refund status: none, pending, refunded, partially_refunded, failed';
COMMENT ON COLUMN public.requests.refund_reason IS 'Reason for refund: reviewer_denied, timeout, customer_request, dispute, etc.';
COMMENT ON COLUMN public.requests.refunded_at IS 'Timestamp when refund was processed';
COMMENT ON COLUMN public.requests.stripe_refund_id IS 'Stripe refund ID for tracking';
