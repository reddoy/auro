-- Remove status from reviewer client updates (transitions via API routes only).
-- Ensure social_accounts exists on remote, then enable RLS (OAuth tokens).

CREATE TABLE IF NOT EXISTS public.social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('tiktok', 'instagram')),
  external_user_id text,
  username text,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_social_accounts_user ON public.social_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_provider ON public.social_accounts(provider);

CREATE OR REPLACE FUNCTION public._social_accounts_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_social_accounts_updated ON public.social_accounts;
CREATE TRIGGER trg_social_accounts_updated
  BEFORE UPDATE ON public.social_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public._social_accounts_set_updated_at();

CREATE OR REPLACE FUNCTION public.enforce_requests_row_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  reviewer_allowed text[] := ARRAY[
    'photos', 'notes', 'review', 'accept_by', 'deliver_by',
    'archived_by_influencer', 'archived_at', 'consent_social', 'completed_at'
  ];
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF uid IS NULL THEN
    RETURN NEW;
  END IF;

  IF OLD.user_id IS NOT DISTINCT FROM OLD.influencer_id AND OLD.user_id IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid request participants';
  END IF;

  IF uid = OLD.user_id AND uid IS DISTINCT FROM OLD.influencer_id THEN
    IF (to_jsonb(NEW) - ARRAY['review_viewed_at']::text[])
       IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['review_viewed_at']::text[]) THEN
      RAISE EXCEPTION 'Only review_viewed_at may be updated by the reviewee';
    END IF;
    RETURN NEW;
  END IF;

  IF uid = OLD.influencer_id THEN
    IF (to_jsonb(NEW) - reviewer_allowed)
       IS DISTINCT FROM (to_jsonb(OLD) - reviewer_allowed) THEN
      RAISE EXCEPTION 'Update to protected request fields is not allowed for reviewers';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Not authorized to update this request';
END;
$$;

COMMENT ON FUNCTION public.enforce_requests_row_update() IS
  'Restricts authenticated updates: reviewees touch review_viewed_at only; reviewers touch workflow fields except status (API-only).';

ALTER TABLE IF EXISTS public.social_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS social_accounts_select_own ON public.social_accounts;
CREATE POLICY social_accounts_select_own ON public.social_accounts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS social_accounts_insert_own ON public.social_accounts;
CREATE POLICY social_accounts_insert_own ON public.social_accounts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS social_accounts_update_own ON public.social_accounts;
CREATE POLICY social_accounts_update_own ON public.social_accounts
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS social_accounts_delete_own ON public.social_accounts;
CREATE POLICY social_accounts_delete_own ON public.social_accounts
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
