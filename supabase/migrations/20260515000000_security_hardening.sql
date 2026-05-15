-- Security hardening migration
-- 1. Fix mutable search_path on all flagged functions
-- 2. Revoke anon/authenticated EXECUTE on sensitive admin-only functions

-- ============================================================
-- 1. Fix mutable search_path (prevents search_path injection)
-- ============================================================
ALTER FUNCTION public.update_reviewer_reviews_updated_at() SET search_path = public;
ALTER FUNCTION public.update_reviewer_rating_average() SET search_path = public;
ALTER FUNCTION public.update_reviewer_completed_count() SET search_path = public;
ALTER FUNCTION public.update_dispute_updated_at() SET search_path = public;
ALTER FUNCTION public.resolve_dispute(
  dispute_id_param uuid,
  resolution_param text,
  resolution_type_param text,
  refund_amount_param integer,
  admin_notes_param text
) SET search_path = public;
ALTER FUNCTION public.handle_request_timeouts() SET search_path = public;
ALTER FUNCTION public.get_payment_system_health() SET search_path = public;
ALTER FUNCTION public.process_payment_maintenance() SET search_path = public;
ALTER FUNCTION public.update_reviewer_pending_balance() SET search_path = public;
ALTER FUNCTION public.check_payment_distributed_at() SET search_path = public;
ALTER FUNCTION public.check_stripe_transfer_id() SET search_path = public;
ALTER FUNCTION public.get_payment_distribution_stats() SET search_path = public;
ALTER FUNCTION public.cleanup_old_webhook_events() SET search_path = public;
ALTER FUNCTION public.calculate_reviewer_amount_cents(request_row requests) SET search_path = public;
ALTER FUNCTION public.refresh_profile_payout_balances(profile_id uuid) SET search_path = public;

-- ============================================================
-- 2. Revoke anon + authenticated EXECUTE on admin-only functions
--    These are SECURITY DEFINER functions that should only be
--    called via the service_role (server-side API routes).
-- ============================================================

-- resolve_dispute: admin action — no external role should trigger this directly
REVOKE EXECUTE ON FUNCTION public.resolve_dispute(
  dispute_id_param uuid,
  resolution_param text,
  resolution_type_param text,
  refund_amount_param integer,
  admin_notes_param text
) FROM anon, authenticated;

-- get_payment_system_health: internal health check
REVOKE EXECUTE ON FUNCTION public.get_payment_system_health() FROM anon, authenticated;

-- process_payment_maintenance: internal scheduled job
REVOKE EXECUTE ON FUNCTION public.process_payment_maintenance() FROM anon, authenticated;

-- handle_request_timeouts: internal scheduled job
REVOKE EXECUTE ON FUNCTION public.handle_request_timeouts() FROM anon, authenticated;
