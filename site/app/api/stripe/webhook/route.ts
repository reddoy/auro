import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY || '';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  const stripe = new Stripe(secret);
  const body = await req.text();
  const sig = (req.headers.get('stripe-signature') || '') as string;
  try {
    const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    console.log('[stripe-webhook] event', event.type);
    switch (event.type) {
      case 'checkout.session.completed':
        try {
          const session = event.data.object as Stripe.Checkout.Session;
          const metadata = (session.metadata || {}) as Record<string, string>;
          const requestId = metadata.request_id;
          if (requestId) {
            const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
            const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
            if (url && key) {
              const admin = createClient(url, key);
              const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent as any)?.id;
              await admin
                .from('requests')
                .update({ payment_status: 'paid', stripe_session_id: session.id, stripe_payment_intent_id: paymentIntentId || null })
                .eq('id', requestId);
            }
          }
        } catch (e) {
          console.error('webhook update error', e);
        }
        break;
      case 'checkout.session.async_payment_succeeded':
        // TODO: handle async payment success
        break;
      case 'checkout.session.async_payment_failed':
        // TODO: handle async payment failure
        break;
      case 'charge.refunded':
      case 'charge.refund.updated':
        // TODO: mark review request as refunded
        break;
      default:
        break;
    }
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Webhook error' }), { status: 400 });
  }
}


