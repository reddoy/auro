import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { reviewerId, returnUrl } = body || {};
    if (!reviewerId) return new Response(JSON.stringify({ error: 'Missing reviewerId' }), { status: 400 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!url || !key) return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500 });
    const admin = createClient(url, key);

    const { data: creator } = await admin
      .from('creators')
      .select('stripe_connect_account_id')
      .eq('profile_id', reviewerId)
      .maybeSingle();
    const connectAccountId = (creator as any)?.stripe_connect_account_id as string | undefined;
    if (!connectAccountId) {
      return new Response(JSON.stringify({ error: 'Reviewer is not connected to Stripe' }), { status: 400 });
    }

    const secret = process.env.STRIPE_SECRET_KEY || '';
    if (!secret) return new Response(JSON.stringify({ error: 'Missing STRIPE_SECRET_KEY' }), { status: 500 });
    const stripe = new Stripe(secret);

    const link = await stripe.accounts.createLoginLink(connectAccountId, {
      redirect_url: returnUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.appauro.com',
    });
    return new Response(JSON.stringify({ url: link.url }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Failed to create login link' }), { status: 400 });
  }
}


