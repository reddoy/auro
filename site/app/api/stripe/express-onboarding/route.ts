import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { reviewerId, returnUrl } = body || {};
    if (!reviewerId) return new Response(JSON.stringify({ error: 'Missing reviewerId' }), { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!supabaseUrl || !serviceKey) return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500 });
    const admin = createClient(supabaseUrl, serviceKey);

    // Fetch profile for email/username
    const { data: profile } = await admin
      .from('profiles')
      .select('id, email, username')
      .eq('id', reviewerId)
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
        .eq('id', reviewerId)
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
          card_payments: { requested: true },
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
        .eq('id', reviewerId);
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.appauro.com';
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




