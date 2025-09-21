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

    // Ensure a creators row exists so we have a place to store connect id
    let creatorsRow: any = null;
    try {
      const existing = await admin
        .from('creators')
        .select('id, profile_id, slug, stripe_connect_account_id')
        .eq('profile_id', reviewerId)
        .maybeSingle();
      creatorsRow = existing.data || null;
      if (!creatorsRow) {
        const slug = (profile as any)?.username || reviewerId;
        const insert = await admin
          .from('creators')
          .insert([{ profile_id: reviewerId, slug }])
          .select('id, profile_id, slug, stripe_connect_account_id')
          .single();
        creatorsRow = insert.data || null;
      }
    } catch {}

    // Create Stripe Express account if missing
    let connectAccountId = creatorsRow?.stripe_connect_account_id as string | undefined;
    if (!connectAccountId) {
      const acct = await stripe.accounts.create({
        type: 'express',
        email: (profile as any)?.email || undefined,
        capabilities: {
          transfers: { requested: true },
        },
      });
      connectAccountId = acct.id;
      await admin
        .from('creators')
        .update({ stripe_connect_account_id: connectAccountId })
        .eq('profile_id', reviewerId);
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.appauro.com';
    const accountLink = await stripe.accountLinks.create({
      account: connectAccountId!,
      type: 'account_onboarding',
      return_url: returnUrl || siteUrl,
      refresh_url: returnUrl || siteUrl,
    });
    return new Response(JSON.stringify({ url: accountLink.url, accountId: connectAccountId }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Failed to create onboarding link' }), { status: 400 });
  }
}




