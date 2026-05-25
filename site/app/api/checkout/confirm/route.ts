import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { requireAuthenticatedUser } from '@/lib/require-authenticated-user';
import { markRequestPaidFromCheckoutSession } from '@/lib/mark-request-paid-from-checkout';

export async function POST(req: Request) {
  console.log('[checkout-confirm] ===== CHECKOUT CONFIRMATION REQUEST =====');
  try {
    const gate = await requireAuthenticatedUser(req);
    if (!gate.ok) {
      return new Response(JSON.stringify(gate.body), {
        status: gate.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { sessionId } = await req.json();
    console.log('[checkout-confirm] Session ID received:', sessionId);

    if (!sessionId) {
      console.log('[checkout-confirm] ERROR: Missing sessionId');
      return new Response(JSON.stringify({ error: 'Missing sessionId' }), { status: 400 });
    }

    const secret = process.env.STRIPE_SECRET_KEY || '';
    if (!secret) {
      console.log('[checkout-confirm] ERROR: Missing STRIPE_SECRET_KEY');
      return new Response(JSON.stringify({ error: 'Missing STRIPE_SECRET_KEY' }), { status: 500 });
    }

    const stripe = new Stripe(secret);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      console.log('[checkout-confirm] ERROR: Session not found');
      return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404 });
    }

    const metadata = (session.metadata || {}) as Record<string, string>;
    const requestId = metadata.request_id;
    console.log('[checkout-confirm] Request ID from metadata:', requestId);

    if (!requestId) {
      console.log('[checkout-confirm] ERROR: No request id on session');
      return new Response(JSON.stringify({ error: 'No request id on session' }), { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!url || !key) {
      console.log('[checkout-confirm] ERROR: Supabase not configured');
      return new Response(JSON.stringify({ error: 'Supabase not configured' }), { status: 500 });
    }

    const admin = createClient(url, key);

    const { data: ownedRequest, error: ownershipError } = await admin
      .from('requests')
      .select('id,user_id,status,payment_status')
      .eq('id', requestId)
      .maybeSingle();
    if (ownershipError || !ownedRequest) {
      return new Response(JSON.stringify({ error: 'Request not found' }), { status: 404 });
    }
    if (ownedRequest.user_id !== gate.user.userId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    if (session.payment_status === 'paid') {
      console.log('[checkout-confirm] ===== UPDATING REQUEST TO PAID STATUS =====');
      const paidResult = await markRequestPaidFromCheckoutSession({
        admin,
        stripe,
        session,
        requestId,
      });
      if (!paidResult.ok) {
        console.error('[checkout-confirm] mark paid failed:', paidResult.error);
        return new Response(JSON.stringify({ error: 'Database update failed' }), { status: 500 });
      }
      console.log('[checkout-confirm] Database update successful');
    } else {
      console.log('[checkout-confirm] Payment not completed, status:', session.payment_status);
    }

    console.log('[checkout-confirm] ===== CONFIRMATION COMPLETE =====');
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to confirm';
    return new Response(JSON.stringify({ error: message }), { status: 400 });
  }
}
