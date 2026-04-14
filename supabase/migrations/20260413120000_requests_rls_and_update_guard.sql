-- Row-level access for requests + trigger to restrict which columns clients may change.
-- Service role (Next.js API routes, webhooks, Edge Functions) bypasses RLS.

ALTER TABLE IF EXISTS public.requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS requests_select_participants ON public.requests;
CREATE POLICY requests_select_participants ON public.requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = influencer_id);

DROP POLICY IF EXISTS requests_insert_reviewee ON public.requests;
CREATE POLICY requests_insert_reviewee ON public.requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS requests_update_participants ON public.requests;
CREATE POLICY requests_update_participants ON public.requests
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = influencer_id)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = influencer_id);

CREATE OR REPLACE FUNCTION public.enforce_requests_row_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  reviewer_allowed text[] := ARRAY[
    'status', 'photos', 'notes', 'review', 'accept_by', 'deliver_by',
    'archived_by_influencer', 'archived_at', 'consent_social', 'completed_at'
  ];
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- Service role / maintenance (no JWT subject): allow
  IF uid IS NULL THEN
    RETURN NEW;
  END IF;

  IF OLD.user_id IS NOT DISTINCT FROM OLD.influencer_id AND OLD.user_id IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid request participants';
  END IF;

  -- Reviewee: only review_viewed_at may change
  IF uid = OLD.user_id AND uid IS DISTINCT FROM OLD.influencer_id THEN
    IF (to_jsonb(NEW) - ARRAY['review_viewed_at']::text[])
       IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['review_viewed_at']::text[]) THEN
      RAISE EXCEPTION 'Only review_viewed_at may be updated by the reviewee';
    END IF;
    RETURN NEW;
  END IF;

  -- Reviewer: only workflow fields (money + Stripe columns locked)
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

DROP TRIGGER IF EXISTS trg_enforce_requests_row_update ON public.requests;
CREATE TRIGGER trg_enforce_requests_row_update
  BEFORE UPDATE ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_requests_row_update();

COMMENT ON FUNCTION public.enforce_requests_row_update() IS
  'Restricts authenticated updates to requests: reviewees may only touch review_viewed_at; reviewers may touch workflow fields only.';
