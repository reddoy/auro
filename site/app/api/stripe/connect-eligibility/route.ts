import { requireAuthenticatedUser } from '@/lib/require-authenticated-user';
import { isReviewerEligibleForStripeConnect } from '@/lib/reviewer-connect-gate';

/**
 * Returns whether the signed-in user is allowed to start Stripe Express onboarding,
 * mirroring gate logic in `/api/stripe/express-onboarding` (helps debug “before redirect”).
 */
export async function GET(req: Request) {
  const gate = await requireAuthenticatedUser(req);
  if (!gate.ok) {
    return new Response(JSON.stringify(gate.body), {
      status: gate.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const existing = await gate.admin
    .from('profiles')
    .select('is_reviewer, stripe_connect_account_id')
    .eq('id', gate.user.userId)
    .maybeSingle();

  if (existing.error) {
    return new Response(JSON.stringify({ error: existing.error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const row = existing.data ?? null;
  const rawReviewer = (row as { is_reviewer?: unknown })?.is_reviewer;
  const reviewerState =
    typeof rawReviewer === 'string'
      ? rawReviewer.trim()
      : String(rawReviewer ?? '').trim();
  const eligibleForOnboarding = isReviewerEligibleForStripeConnect(rawReviewer);

  return new Response(
    JSON.stringify({
      eligibleForOnboarding,
      is_reviewer: reviewerState || null,
      hasStripeConnectAccountId: !!(row as { stripe_connect_account_id?: string | null })?.stripe_connect_account_id?.trim(),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
