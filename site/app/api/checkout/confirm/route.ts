import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json();
    if (!sessionId) return new Response(JSON.stringify({ error: 'Missing sessionId' }), { status: 400 });

    const secret = process.env.STRIPE_SECRET_KEY || '';
    if (!secret) return new Response(JSON.stringify({ error: 'Missing STRIPE_SECRET_KEY' }), { status: 500 });
    const stripe = new Stripe(secret);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404 });

    const metadata = (session.metadata || {}) as Record<string, string>;
    const requestId = metadata.request_id;
    if (!requestId) return new Response(JSON.stringify({ error: 'No request id on session' }), { status: 400 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON || '';
    if (!url || !key) return new Response(JSON.stringify({ error: 'Supabase not configured' }), { status: 500 });
    const admin = createClient(url, key);

    const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent as any)?.id;
    if (session.payment_status === 'paid') {
      await admin
        .from('requests')
        .update({ status: 'paid', payment_status: 'paid', stripe_session_id: session.id, stripe_payment_intent_id: paymentIntentId || null })
        .eq('id', requestId);
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Failed to confirm' }), { status: 400 });
  }
}


