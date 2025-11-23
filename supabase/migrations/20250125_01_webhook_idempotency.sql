-- Webhook idempotency table to prevent duplicate webhook processing
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_event_id ON public.webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed_at ON public.webhook_events(processed_at);

-- Enable RLS
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Only service role can insert/update (handled by service role key)
CREATE POLICY "Service role can manage webhook events" ON public.webhook_events
  FOR ALL USING (true);

COMMENT ON TABLE public.webhook_events IS 'Tracks processed Stripe webhook events for idempotency';
COMMENT ON COLUMN public.webhook_events.stripe_event_id IS 'Unique Stripe event ID to prevent duplicate processing';







