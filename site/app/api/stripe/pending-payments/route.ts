import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Force this route to be dynamic since it uses request.url
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const reviewerId = url.searchParams.get('reviewerId');
    
    if (!reviewerId) {
      return new Response(JSON.stringify({ error: 'Missing reviewerId' }), { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500 });
    }
    
    const admin = createClient(supabaseUrl, serviceKey);

    // Get the Stripe Connect account ID for the reviewer
    const { data: profile, error: profErr } = await admin
      .from('profiles')
      .select('stripe_connect_account_id')
      .eq('id', reviewerId)
      .eq('is_reviewer', true)
      .maybeSingle();
      
    if (profErr) {
      return new Response(JSON.stringify({ error: profErr.message }), { status: 400 });
    }
    
    const connectAccountId = (profile as any)?.stripe_connect_account_id as string | undefined;
    if (!connectAccountId) {
      return new Response(JSON.stringify({ error: 'Reviewer is not connected to Stripe' }), { status: 400 });
    }

    const secret = process.env.STRIPE_SECRET_KEY || '';
    if (!secret) {
      return new Response(JSON.stringify({ error: 'Missing STRIPE_SECRET_KEY' }), { status: 500 });
    }
    
    const stripe = new Stripe(secret);

    // Get the account balance from Stripe Connect
    const balance = await stripe.balance.retrieve({ stripeAccount: connectAccountId });
    
    // Calculate pending amount (available balance that hasn't been paid out yet)
    const pendingAmount = balance.pending.reduce((sum, balanceItem) => {
      // Only include USD amounts for now
      if (balanceItem.currency === 'usd') {
        return sum + balanceItem.amount;
      }
      return sum;
    }, 0);

    // Get recent transfers to show payout history
    const transfers = await stripe.transfers.list(
      { limit: 10 },
      { stripeAccount: connectAccountId }
    );

    return new Response(JSON.stringify({ 
      pendingAmountCents: pendingAmount,
      pendingAmountDollars: pendingAmount / 100,
      currency: 'usd',
      recentTransfers: transfers.data.map(transfer => ({
        id: transfer.id,
        amount: transfer.amount,
        amountDollars: transfer.amount / 100,
        currency: transfer.currency,
        created: transfer.created,
        description: transfer.description
      }))
    }), { status: 200 });
    
  } catch (e: any) {
    console.error('[pending-payments] Error:', e);
    return new Response(JSON.stringify({ error: e?.message || 'Failed to fetch pending payments' }), { status: 400 });
  }
}
