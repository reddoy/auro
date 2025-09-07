import Stripe from 'stripe';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { creatorId, creatorSlug, reviewPayload } = body || {};
    if (!creatorId && !creatorSlug) {
      return new Response(JSON.stringify({ error: 'Missing creatorId or creatorSlug' }), { status: 400 });
    }

    const secret = process.env.STRIPE_SECRET_KEY || '';
    if (!secret) {
      return new Response(JSON.stringify({ error: 'Missing STRIPE_SECRET_KEY' }), { status: 500 });
    }
    const stripe = new Stripe(secret, { apiVersion: '2024-06-20' });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'Auro Review Request' },
            unit_amount: 1000,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_CREATOR_WEB_BASE || ''}/checkout/success?rid={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_CREATOR_WEB_BASE || ''}/checkout/cancel`,
    });

    return new Response(JSON.stringify({ url: session.url, reviewRequestId: session.id }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Failed to create session' }), { status: 400 });
  }
}


