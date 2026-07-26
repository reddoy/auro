import Stripe from 'stripe';
import { requireAuthenticatedUser } from '@/lib/require-authenticated-user';
import { isReviewerApprovedForStripeConnect } from '@/lib/reviewer-connect-gate';
import {
  summarizeAccountRequirements,
  type AccountRequirementsSummary,
} from '@/lib/stripe-requirements';

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
  const connectIdRaw = (row as { stripe_connect_account_id?: string | null })?.stripe_connect_account_id;
  const connectAccountId =
    typeof connectIdRaw === 'string' && connectIdRaw.trim().length > 0 ? connectIdRaw.trim() : null;

  let stripeDetailsSubmitted: boolean | null = null;
  let stripeChargesEnabled: boolean | null = null;
  let stripePayoutsEnabled: boolean | null = null;
  let requirements: AccountRequirementsSummary | null = null;

  if (eligibleForOnboarding && connectAccountId) {
    const secret = process.env.STRIPE_SECRET_KEY || '';
    if (secret) {
      try {
        const stripe = new Stripe(secret);
        const acct = await stripe.accounts.retrieve(connectAccountId);
        stripeDetailsSubmitted = !!acct.details_submitted;
        stripeChargesEnabled = !!acct.charges_enabled;
        stripePayoutsEnabled = !!acct.payouts_enabled;
        requirements = summarizeAccountRequirements(acct);
      } catch (e: unknown) {
        if (e instanceof Stripe.errors.StripeError) {
          console.warn('[connect-eligibility] Stripe retrieve failed', e.code, e.message);
        } else {
          console.warn('[connect-eligibility] Stripe retrieve failed', e);
        }
      }
    }
  }

  const canOpenExpressDashboard = stripeDetailsSubmitted === true;

  return new Response(
    JSON.stringify({
      eligibleForOnboarding,
      is_reviewer: reviewerState || null,
      hasStripeConnectAccountId: !!connectAccountId,
      stripeDetailsSubmitted,
      stripeChargesEnabled,
      stripePayoutsEnabled,
      canOpenExpressDashboard,
      requirements,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  );
}
