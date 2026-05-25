import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import { notifyReviewerOfPaidRequest } from '@/lib/reviewer-request-notifications';

const ACCEPT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export type MarkRequestPaidArgs = {
  admin: SupabaseClient;
  stripe: Stripe;
  session: Stripe.Checkout.Session;
  requestId: string;
  stripeAccountId?: string;
};

/**
 * Shared paid-state update for checkout.session.completed webhook and /api/checkout/confirm.
 * Sets accept_by (+14 days), payment intent, fees, and notifies the reviewer.
 */
export async function markRequestPaidFromCheckoutSession({
  admin,
  stripe,
  session,
  requestId,
  stripeAccountId,
}: MarkRequestPaidArgs): Promise<{ ok: boolean; error?: string }> {
  const metadata = (session.metadata || {}) as Record<string, string>;

  let applicationFeeCentsFromMetadata: number | undefined;
  if (metadata.auro_fee_cents) {
    const parsed = parseInt(metadata.auro_fee_cents, 10);
    if (!Number.isNaN(parsed)) applicationFeeCentsFromMetadata = parsed;
  }

  let stripeFeeCents: number | undefined;
  let netAmountCents: number | undefined;
  let amountCents: number | undefined;
  let applicationFeeCents: number | undefined;

  try {
    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : (session.payment_intent as { id?: string } | null)?.id;
    if (paymentIntentId) {
      const pi = stripeAccountId
        ? await stripe.paymentIntents.retrieve(paymentIntentId, { stripeAccount: stripeAccountId })
        : await stripe.paymentIntents.retrieve(paymentIntentId);
      amountCents = typeof pi.amount === 'number' ? pi.amount : undefined;
      const piApplicationFee =
        typeof pi.application_fee_amount === 'number' ? pi.application_fee_amount : undefined;
      applicationFeeCents = piApplicationFee || applicationFeeCentsFromMetadata;

      const chargeList = stripeAccountId
        ? await stripe.charges.list({ payment_intent: paymentIntentId, limit: 1 }, { stripeAccount: stripeAccountId })
        : await stripe.charges.list({ payment_intent: paymentIntentId, limit: 1 });
      const chargeId = chargeList.data[0]?.id;
      if (chargeId) {
        const charge = stripeAccountId
          ? await stripe.charges.retrieve(chargeId, { stripeAccount: stripeAccountId })
          : await stripe.charges.retrieve(chargeId);
        const balTxId = (charge as { balance_transaction?: string }).balance_transaction;
        if (balTxId) {
          const balTx = stripeAccountId
            ? await stripe.balanceTransactions.retrieve(balTxId, { stripeAccount: stripeAccountId })
            : await stripe.balanceTransactions.retrieve(balTxId);
          stripeFeeCents = typeof balTx.fee === 'number' ? balTx.fee : undefined;
          netAmountCents = typeof balTx.net === 'number' ? balTx.net : undefined;
        }
      }
    }
  } catch (feeErr) {
    console.error('[mark-request-paid] fee calc error', feeErr);
  }

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent as { id?: string } | null)?.id;

  const updateData: Record<string, unknown> = {
    status: 'paid',
    payment_status: 'paid',
    stripe_session_id: session.id,
    stripe_payment_intent_id: paymentIntentId || null,
    stripe_fee_cents: typeof stripeFeeCents === 'number' ? stripeFeeCents : null,
    net_amount_cents: typeof netAmountCents === 'number' ? netAmountCents : null,
    accept_by: new Date(Date.now() + ACCEPT_WINDOW_MS).toISOString(),
  };

  if (typeof amountCents === 'number') {
    updateData.amount_cents = amountCents;
  }

  if (typeof applicationFeeCents === 'number') {
    updateData.application_fee_cents = applicationFeeCents;
  } else if (applicationFeeCentsFromMetadata) {
    updateData.application_fee_cents = applicationFeeCentsFromMetadata;
  }

  const { error } = await admin.from('requests').update(updateData).eq('id', requestId);
  if (error) {
    console.error('[mark-request-paid] Database update error:', error);
    return { ok: false, error: error.message };
  }

  await notifyReviewerOfPaidRequest(admin, requestId);
  return { ok: true };
}
