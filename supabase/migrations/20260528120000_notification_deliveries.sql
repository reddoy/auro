-- Product notification delivery log (email/SMS idempotency).

CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  entity_id text,
  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'push')),
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'skipped')),
  provider_id text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS notification_deliveries_dedupe_idx
  ON public.notification_deliveries (user_id, notification_type, entity_id, channel)
  WHERE status = 'sent' AND entity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS notification_deliveries_user_created_idx
  ON public.notification_deliveries (user_id, created_at DESC);

ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.notification_deliveries IS 'Idempotent log of product transactional notifications (email/SMS/push).';
