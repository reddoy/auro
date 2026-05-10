import { requireAuthenticatedUser } from '@/lib/require-authenticated-user';
import { isReviewerApprovedForStripeConnect } from '@/lib/reviewer-connect-gate';

/**
 * Returns whether the signed-in user may use Stripe Connect APIs (`express-onboarding` / `express-login`).
 * Only **approved** reviewers — same gate as those routes.
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
  const eligibleForOnboarding = isReviewerApprovedForStripeConnect(rawReviewer);

  return new Response(
    JSON.stringify({
      eligibleForOnboarding,
      is_reviewer: reviewerState || null,
      hasStripeConnectAccountId: !!(row as { stripe_connect_account_id?: string | null })?.stripe_connect_account_id?.trim(),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
