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

    const { data: profile } = await admin
      .from('profiles')
      .select('stripe_connect_account_id')
      .eq('id', targetReviewerId)
      .eq('is_reviewer', 'approved')
      .maybeSingle();
    const connectAccountId = (profile as any)?.stripe_connect_account_id as string | undefined;
    if (!connectAccountId) {
      return new Response(JSON.stringify({ error: 'Reviewer is not connected to Stripe' }), { status: 400 });
    }

    const secret = process.env.STRIPE_SECRET_KEY || '';
    if (!secret) return new Response(JSON.stringify({ error: 'Missing STRIPE_SECRET_KEY' }), { status: 500 });
    const stripe = new Stripe(secret);

    const link = await stripe.accounts.createLoginLink(connectAccountId);
    return new Response(JSON.stringify({ url: link.url }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Failed to create login link' }), { status: 400 });
  }
}


