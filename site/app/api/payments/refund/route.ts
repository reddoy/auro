import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { isTrustedInternalRequest } from '@/lib/internal-fetch-secret';
import { parseBearerToken, verifyAdminAccess } from '@/lib/admin-server';
import { processRefund } from '@/lib/refund-server';

export async function POST(req: Request) {
  try {
    const { requestId, reason, amountCents, partial = false, idempotencyKey } = await req.json();

    if (!requestId) {
      return new Response(JSON.stringify({ error: 'Missing requestId' }), { status: 400 });
    }

    const secret = process.env.STRIPE_SECRET_KEY || '';
    if (!secret) {
      return new Response(JSON.stringify({ error: 'Missing STRIPE_SECRET_KEY' }), { status: 500 });
    }
    const stripe = new Stripe(secret);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!url || !key) {
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500 });
    }
    const admin = createClient(url, key);

    // AuthZ: cron header, internal-trusted callers, the reviewer on the request,
    // or an admin can issue a refund.
    const internalOk = isTrustedInternalRequest(req);
    const vercelCron = !!req.headers.get('x-vercel-cron');
    if (!internalOk && !vercelCron) {
      const bearer = parseBearerToken(req);
      if (!bearer) {
        return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401 });
      }
      const { data: authUser, error: authErr } = await admin.auth.getUser(bearer);
      if (authErr || !authUser?.user?.id) {
        return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401 });
      }
      const uid = authUser.user.id;
      const { data: ownerRow, error: ownerErr } = await admin
        .from('requests')
        .select('influencer_id')
        .eq('id', requestId)
        .maybeSingle();
      if (ownerErr) {
        return new Response(JSON.stringify({ error: 'Failed to authorize refund' }), { status: 500 });
      }
      if (!ownerRow) {
        return new Response(JSON.stringify({ error: 'Request not found' }), { status: 404 });
      }
      let allowed = (ownerRow as { influencer_id: string }).influencer_id === uid;
      if (!allowed) {
        const adminSession = await verifyAdminAccess(admin, bearer);
        allowed = !!adminSession;
      }
      if (!allowed) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
      }
    }

    const result = await processRefund(admin, stripe, {
      requestId,
      reason,
      amountCents,
      partial,
      idempotencyKey,
    });

    if (!result.ok) {
      return new Response(
        JSON.stringify({
          error: result.error,
          errorType: result.errorType,
          stripeErrorCode: result.stripeErrorCode,
          details: result.details,
          requestId,
          message: 'Refund failed. This can be retried manually.',
        }),
        { status: result.status }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        refundId: result.refundId,
        refundAmount: result.refundAmount,
        totalRefunded: result.totalRefunded,
        totalAmount: result.totalAmount,
        isFullyRefunded: result.isFullyRefunded,
        alreadyRefunded: result.alreadyRefunded || undefined,
        customerName: result.customerName,
        customerEmail: result.customerEmail,
        idempotencyKey: result.idempotencyKey,
        message: result.message,
      }),
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error processing refund:', error);
    const message = error instanceof Error ? error.message : 'Failed to process refund';
    return new Response(
      JSON.stringify({ error: message, errorType: 'UNKNOWN_ERROR' }),
      { status: 500 }
    );
  }
}
