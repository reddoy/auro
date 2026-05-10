import Stripe from 'stripe';
import { requireAuthenticatedUser } from '@/lib/require-authenticated-user';
import { isReviewerEligibleForStripeConnect } from '@/lib/reviewer-connect-gate';

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
  if (u.protocol !== 'http:') return false;
  const h = u.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
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

function stripePayloadFrom(err: Stripe.errors.StripeError) {
  return {
    error: err.message,
    stripeCode: err.code ?? null,
    stripeType: err.type ?? null,
    stripeRequestId: err.requestId ?? null,
  };
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

    const rawReviewer = (profileRow as { is_reviewer?: unknown }).is_reviewer;
    if (!isReviewerEligibleForStripeConnect(rawReviewer)) {
      const reviewerState = typeof rawReviewer === 'string' ? rawReviewer.trim() : String(rawReviewer ?? '').trim();
      console.warn('[express-onboarding] reviewer gate failed', {
        reviewerId: targetReviewerId,
        is_reviewer: reviewerState || null,
      });
      return new Response(JSON.stringify({ error: 'User is not a reviewer' }), { status: 400 });
    }

    const storedConnectId = (profileRow as { stripe_connect_account_id?: unknown }).stripe_connect_account_id;
    let connectAccountId =
      typeof storedConnectId === 'string' && storedConnectId.trim().length > 0
        ? storedConnectId.trim()
        : undefined;

    // Stale IDs (e.g. test-mode acct persisted while prod keys run) break accountLinks.create.
    if (connectAccountId) {
      try {
        await stripe.accounts.retrieve(connectAccountId);
      } catch (e: unknown) {
        if (
          e instanceof Stripe.errors.StripeError &&
          (e.code === 'resource_missing' || e.code === 'account_invalid')
        ) {
          console.warn('[express-onboarding] Clearing invalid Connect account id', {
            reviewerId: targetReviewerId,
            connectAccountId,
            stripeCode: e.code,
          });
          const { error: clearErr } = await admin
            .from('profiles')
            .update({ stripe_connect_account_id: null })
            .eq('id', targetReviewerId);
          if (clearErr) {
            return new Response(JSON.stringify({ error: clearErr.message }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          connectAccountId = undefined;
        } else if (e instanceof Stripe.errors.StripeError) {
          console.error('[express-onboarding] Stripe error (retrieve)', JSON.stringify(stripePayloadFrom(e)));
          return new Response(JSON.stringify(stripePayloadFrom(e)), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        } else {
          throw e;
        }
      }
    }

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

    let accountLink: Stripe.AccountLink;
    try {
      accountLink = await stripe.accountLinks.create({
        account: connectAccountId!,
        type: 'account_onboarding',
        return_url: successUrl,
        refresh_url: refreshUrl,
      });
    } catch (inner: unknown) {
      // Cross-mode connected account IDs slipping through retrieve, or orphaned account rows.
      if (
        inner instanceof Stripe.errors.StripeError &&
        (inner.code === 'resource_missing' || inner.code === 'account_invalid')
      ) {
        console.warn('[express-onboarding] Clearing invalid Connect account (link create)', {
          reviewerId: targetReviewerId,
          connectAccountId,
          stripeCode: inner.code,
        });
        const { error: clearErr } = await admin
          .from('profiles')
          .update({ stripe_connect_account_id: null })
          .eq('id', targetReviewerId);
        if (clearErr) {
          return new Response(JSON.stringify({ error: clearErr.message }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }
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
          return new Response(JSON.stringify({ error: updErr.message }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        accountLink = await stripe.accountLinks.create({
          account: connectAccountId!,
          type: 'account_onboarding',
          return_url: successUrl,
          refresh_url: refreshUrl,
        });
      } else {
        throw inner;
      }
    }

    return new Response(JSON.stringify({ url: accountLink.url, accountId: connectAccountId }), { status: 200 });
  } catch (e: unknown) {
    if (e instanceof Stripe.errors.StripeError) {
      const err = e;
      const payload = stripePayloadFrom(err);
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
