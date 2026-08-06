import Stripe from 'stripe';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { applyCheckoutSessionSideEffects } from '@/lib/finalize-request-uploads';
import { markRequestPaidFromCheckoutSession } from '@/lib/mark-request-paid-from-checkout';

type ApplyArgs = {
  stripe: Stripe;
  event: Stripe.Event;
  session: Stripe.Checkout.Session;
};

/**
 * Shared path for checkout.session.completed and checkout.session.async_payment_succeeded.
 * Marks the request paid, records fees, moves temp uploads, and marks webhook_events completed.
 */
export async function applyCheckoutSessionPaidUpdate({ stripe, event, session }: ApplyArgs): Promise<void> {
  const metadata = (session.metadata || {}) as Record<string, string>;
  const requestId = metadata.request_id;
  const stripeAccountId = (event as { account?: string }).account as string | undefined;

  if (!requestId) return;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) return;

  const admin = createClient(url, key) as SupabaseClient;

  const paidResult = await markRequestPaidFromCheckoutSession({
    admin,
    stripe,
    session,
    requestId,
    stripeAccountId,
  });
  if (!paidResult.ok) {
    console.error('[checkout-paid] mark paid failed:', paidResult.error);
    return;
  }
  console.log('[checkout-paid] Request marked paid:', requestId);

  await applyCheckoutSessionSideEffects(admin, session, requestId);

  try {
    await admin.from('webhook_events').update({ status: 'completed' }).eq('stripe_event_id', event.id);
  } catch (updateError) {
    console.error('[checkout-paid] Failed to mark webhook_events completed:', updateError);
  }
}

export async function applyCheckoutSessionAsyncPaymentFailed(session: Stripe.Checkout.Session): Promise<void> {
  const metadata = (session.metadata || {}) as Record<string, string>;
  const requestId = metadata.request_id;
  if (!requestId) return;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) return;
  const admin = createClient(url, key);
  await admin
    .from('requests')
    .update({
      payment_distribution_error: 'stripe_checkout_async_payment_failed',
      payment_distribution_failed_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('status', 'pending');
}
