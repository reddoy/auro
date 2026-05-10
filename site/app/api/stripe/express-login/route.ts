import Stripe from 'stripe';
import { requireAuthenticatedUser } from '@/lib/require-authenticated-user';
import { isReviewerApprovedForStripeConnect } from '@/lib/reviewer-connect-gate';

export async function POST(req: Request) {
  try {
    const gate = await requireAuthenticatedUser(req);
    if (!gate.ok) {
      return new Response(JSON.stringify(gate.body), {
        status: gate.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { reviewerId } = body || {};
    const targetReviewerId =
      typeof reviewerId === 'string' && reviewerId.trim().length > 0 ? reviewerId.trim() : gate.user.userId;
    if (targetReviewerId !== gate.user.userId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }
    const admin = gate.admin;

    const { data: profile, error: profileErr } = await admin
      .from('profiles')
      .select('stripe_connect_account_id, is_reviewer')
      .eq('id', targetReviewerId)
      .maybeSingle();

    if (profileErr) {
      return new Response(JSON.stringify({ error: profileErr.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404 });
    }

    const rawReviewer = (profile as { is_reviewer?: unknown }).is_reviewer;
    if (!isReviewerApprovedForStripeConnect(rawReviewer)) {
      const reviewerState = typeof rawReviewer === 'string' ? rawReviewer.trim() : String(rawReviewer ?? '').trim();
      return new Response(
        JSON.stringify({
          error:
            reviewerState === 'pending'
              ? 'Stripe Express login is available after your reviewer application is approved.'
              : 'Only approved reviewers can open the payout dashboard.',
        }),
        { status: 400 }
      );
    }

    const stored = (profile as { stripe_connect_account_id?: unknown }).stripe_connect_account_id;
    const connectAccountId =
      typeof stored === 'string' && stored.trim().length > 0 ? stored.trim() : undefined;
    if (!connectAccountId) {
      return new Response(
        JSON.stringify({
          error: 'Stripe onboarding not finished — use Connect Stripe first, then try again.',
        }),
        { status: 400 }
      );
    }

    const secret = process.env.STRIPE_SECRET_KEY || '';
    if (!secret) return new Response(JSON.stringify({ error: 'Missing STRIPE_SECRET_KEY' }), { status: 500 });
    const stripe = new Stripe(secret);

    const acct = await stripe.accounts.retrieve(connectAccountId);
    if (!acct.details_submitted) {
      return new Response(
        JSON.stringify({
          error:
            'Finish Stripe onboarding first — then you can open the Express payout dashboard.',
          appCode: 'STRIPE_ONBOARDING_INCOMPLETE',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const link = await stripe.accounts.createLoginLink(connectAccountId);
    return new Response(JSON.stringify({ url: link.url }), { status: 200 });
  } catch (e: unknown) {
    if (e instanceof Stripe.errors.StripeError) {
      const err = e;
      return new Response(
        JSON.stringify({
          error: err.message,
          stripeCode: err.code ?? null,
          stripeType: err.type ?? null,
          stripeRequestId: err.requestId ?? null,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const msg = e instanceof Error ? e.message : 'Failed to create login link';
    return new Response(JSON.stringify({ error: msg }), { status: 400 });
  }
}


