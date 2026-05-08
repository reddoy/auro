import Stripe from 'stripe';
import { requireAuthenticatedUser } from '@/lib/require-authenticated-user';

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

    // Fetch profile for email/username
    const { data: profile } = await admin
      .from('profiles')
      .select('id, email, username')
      .eq('id', targetReviewerId)
      .maybeSingle();

    const secret = process.env.STRIPE_SECRET_KEY || '';
    if (!secret) return new Response(JSON.stringify({ error: 'Missing STRIPE_SECRET_KEY' }), { status: 500 });
    const stripe = new Stripe(secret);

    // Check if profile exists and is a reviewer
    let profileRow: any = null;
    try {
      const existing = await admin
        .from('profiles')
        .select('id, username, stripe_connect_account_id, is_reviewer')
        .eq('id', targetReviewerId)
        .maybeSingle();
      profileRow = existing.data || null;
      if (!profileRow) {
        return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404 });
      }
      if (!(profileRow as any)?.is_reviewer) {
        return new Response(JSON.stringify({ error: 'User is not a reviewer' }), { status: 400 });
      }
    } catch {}

    // Create Stripe Express account if missing
    let connectAccountId = profileRow?.stripe_connect_account_id as string | undefined;
    if (!connectAccountId) {
      const acct = await stripe.accounts.create({
        type: 'express',
        email: (profile as any)?.email || undefined,
        capabilities: {
          transfers: { requested: true },
        },
        settings: {
          payouts: {
            schedule: {
              interval: 'daily',
            },
          },
        },
      });
      connectAccountId = acct.id;
      await admin
        .from('profiles')
        .update({ stripe_connect_account_id: connectAccountId })
        .eq('id', targetReviewerId);
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://appauro.com';
    const successUrl = returnUrl || `${siteUrl}/auth/stripe-connect-success`;
    const accountLink = await stripe.accountLinks.create({
      account: connectAccountId!,
      type: 'account_onboarding',
      return_url: successUrl,
      refresh_url: successUrl,
    });

    // Note: Once the reviewer completes Stripe onboarding and payouts are enabled,
    // the retry-failed-distributions cron job will automatically pick up and distribute any held payments

    return new Response(JSON.stringify({ url: accountLink.url, accountId: connectAccountId }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Failed to create onboarding link' }), { status: 400 });
  }
}




