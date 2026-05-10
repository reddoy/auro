import Stripe from 'stripe';
import { requireAuthenticatedUser } from '@/lib/require-authenticated-user';

function canonicalSiteBase(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.appauro.com').trim().replace(/\/$/, '');
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' && u.hostname !== 'localhost') {
      u.protocol = 'https:';
    }
    return u.origin;
  } catch {
    return 'https://www.appauro.com';
  }
}

function protocolOkForStripeRedirect(u: URL): boolean {
  if (u.protocol === 'https:') return true;
  return u.protocol === 'http:' && u.hostname === 'localhost';
}

/** Stripe return URL after onboarding completes (must stay in sync with client `returnUrl`). */
function validatedSuccessUrl(base: string, returnUrl: unknown): string {
  let successUrl = `${base}/auth/stripe-connect-success`;
  if (typeof returnUrl !== 'string' || returnUrl.trim().length === 0) {
    return successUrl;
  }
  try {
    const clientU = new URL(returnUrl.trim());
    const baseU = new URL(base);
    const norm = (h: string) => h.replace(/^www\./, '');
    const samePrimary =
      norm(clientU.hostname) === norm(baseU.hostname) || clientU.hostname === baseU.hostname;
    if (
      protocolOkForStripeRedirect(clientU) &&
      samePrimary &&
      clientU.pathname.startsWith('/auth/stripe-connect-success')
    ) {
      successUrl = clientU.toString();
    }
  } catch {
    // keep canonical successUrl
  }
  return successUrl;
}

function stripeConnectRefreshUrl(base: string): string {
  return `${base}/auth/stripe-connect-refresh`;
}

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
    const { reviewerId, returnUrl } = body || {};
    const targetReviewerId =
      typeof reviewerId === 'string' && reviewerId.trim().length > 0 ? reviewerId.trim() : gate.user.userId;
    if (targetReviewerId !== gate.user.userId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    const admin = gate.admin;

    const secret = process.env.STRIPE_SECRET_KEY || '';
    if (!secret) return new Response(JSON.stringify({ error: 'Missing STRIPE_SECRET_KEY' }), { status: 500 });
    const stripe = new Stripe(secret);

    const existing = await admin
      .from('profiles')
      .select('id, username, email, stripe_connect_account_id, is_reviewer')
      .eq('id', targetReviewerId)
      .maybeSingle();

    const profileRow = existing.data ?? null;
    if (existing.error) {
      console.warn('[express-onboarding] profile query error', existing.error.message);
      return new Response(JSON.stringify({ error: existing.error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (!profileRow) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404 });
    }

    const reviewerState = String((profileRow as { is_reviewer?: string | null }).is_reviewer ?? '').trim();
    if (!(reviewerState === 'pending' || reviewerState === 'approved')) {
      console.warn('[express-onboarding] reviewer gate failed', {
        reviewerId: targetReviewerId,
        is_reviewer: reviewerState || null,
      });
      return new Response(JSON.stringify({ error: 'User is not a reviewer' }), { status: 400 });
    }

    let connectAccountId = profileRow?.stripe_connect_account_id as string | undefined;
    if (!connectAccountId) {
      const platformCountry =
        (process.env.STRIPE_CONNECT_DEFAULT_COUNTRY || 'US').trim().toUpperCase() || 'US';
      const acct = await stripe.accounts.create({
        type: 'express',
        country: platformCountry,
        email:
          ((profileRow as { email?: string | null }).email ?? gate.user.email) || undefined,
        capabilities: {
          transfers: { requested: true },
        },
      });
      connectAccountId = acct.id;
      const { error: updErr } = await admin
        .from('profiles')
        .update({ stripe_connect_account_id: connectAccountId })
        .eq('id', targetReviewerId);
      if (updErr) {
        console.error('[express-onboarding] DB update failed after accounts.create', {
          reviewerId: targetReviewerId,
          connectAccountId,
          message: updErr.message,
        });
        return new Response(JSON.stringify({ error: updErr.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const base = canonicalSiteBase();
    const successUrl = validatedSuccessUrl(base, returnUrl);
    const refreshUrl = stripeConnectRefreshUrl(base);

    const accountLink = await stripe.accountLinks.create({
      account: connectAccountId!,
      type: 'account_onboarding',
      return_url: successUrl,
      refresh_url: refreshUrl,
    });

    return new Response(JSON.stringify({ url: accountLink.url, accountId: connectAccountId }), { status: 200 });
  } catch (e: unknown) {
    if (e instanceof Stripe.errors.StripeError) {
      const err = e;
      const payload = {
        error: err.message,
        stripeCode: err.code ?? null,
        stripeType: err.type ?? null,
        stripeRequestId: err.requestId ?? null,
      };
      console.error('[express-onboarding] Stripe error', JSON.stringify(payload));
      return new Response(JSON.stringify(payload), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const msg = e instanceof Error ? e.message : 'Failed to create onboarding link';
    console.error('[express-onboarding]', msg);
    return new Response(JSON.stringify({ error: msg }), { status: 400 });
  }
}
