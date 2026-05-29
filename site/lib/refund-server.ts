import type { SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { profileDisplayName } from '@/lib/profile-display-name';

export type RefundResult =
  | {
      ok: true;
      refundId: string;
      refundAmount: number;
      totalRefunded: number;
      totalAmount: number;
      isFullyRefunded: boolean;
      idempotencyKey: string;
      alreadyRefunded: boolean;
      customerName: string | null;
      customerEmail: string | null;
      message: string;
    }
  | {
      ok: false;
      status: number;
      error: string;
      errorType?: string;
      stripeErrorCode?: string;
      details?: unknown;
    };

export interface ProcessRefundParams {
  requestId: string;
  reason?: string;
  amountCents?: number;
  partial?: boolean;
  idempotencyKey?: string;
}

/**
 * Pure server-side refund helper. Safe to call directly from server functions
 * (e.g. when a reviewer denies a paid request). Returns a typed result rather
 * than throwing so callers can decide how to react.
 *
 * Behaviour mirrors the public /api/payments/refund route so that route can
 * delegate to this helper without changing external semantics.
 */
export async function processRefund(
  admin: SupabaseClient,
  stripe: Stripe,
  params: ProcessRefundParams
): Promise<RefundResult> {
  const { requestId, reason, amountCents, partial = false, idempotencyKey } = params;

  if (!requestId) {
    return { ok: false, status: 400, error: 'Missing requestId' };
  }

  const effectiveIdempotencyKey = idempotencyKey || `refund_${requestId}_${Date.now()}`;

  const { data: request, error: requestError } = await admin
    .from('requests')
    .select(
      `
        id,
        status,
        user_id,
        amount_cents,
        stripe_payment_intent_id,
        stripe_session_id,
        stripe_connect_account_id,
        refunded_amount_cents,
        refund_status,
        refund_reason,
        refunded_at,
        stripe_refund_id
      `
    )
    .eq('id', requestId)
    .maybeSingle();

  if (requestError) {
    console.error('[processRefund] Failed to fetch request:', requestError);
    return {
      ok: false,
      status: 500,
      error: 'Failed to fetch request',
      details: requestError.message,
    };
  }

  if (!request) {
    return { ok: false, status: 404, error: 'Request not found' };
  }

  type CustomerProfile = {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    username?: string | null;
  };
  let customer: CustomerProfile | null = null;
  if (request.user_id) {
    try {
      const { data: profileData } = await admin
        .from('profiles')
        .select('id, email, first_name, last_name, username')
        .eq('id', request.user_id)
        .maybeSingle();
      customer = (profileData as CustomerProfile | null) ?? null;
    } catch (profileError) {
      console.error('[processRefund] Failed to fetch customer profile:', profileError);
    }
  }
  const customerName = profileDisplayName(customer);

  if (request.refund_status === 'refunded') {
    return {
      ok: true,
      refundId: request.stripe_refund_id || '',
      refundAmount: 0,
      totalRefunded: request.refunded_amount_cents || 0,
      totalAmount: request.amount_cents || 0,
      isFullyRefunded: true,
      idempotencyKey: effectiveIdempotencyKey,
      alreadyRefunded: true,
      customerName,
      customerEmail: customer?.email || null,
      message: 'Request already refunded',
    };
  }

  if (request.stripe_refund_id) {
    try {
      const existingRefund = await stripe.refunds.retrieve(request.stripe_refund_id);
      if (existingRefund && existingRefund.status !== 'failed') {
        return {
          ok: true,
          refundId: request.stripe_refund_id,
          refundAmount: 0,
          totalRefunded: request.refunded_amount_cents || 0,
          totalAmount: request.amount_cents || 0,
          isFullyRefunded: (request.refunded_amount_cents || 0) >= (request.amount_cents || 0),
          idempotencyKey: effectiveIdempotencyKey,
          alreadyRefunded: true,
          customerName,
          customerEmail: customer?.email || null,
          message: 'Refund already processed',
        };
      }
    } catch (stripeError: unknown) {
      const code = (stripeError as { code?: string })?.code;
      if (code !== 'resource_missing') {
        console.warn('[processRefund] Error checking existing refund:', stripeError);
      }
    }
  }

  let paymentIntentId = request.stripe_payment_intent_id as string | null;
  if (!paymentIntentId && request.stripe_session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(request.stripe_session_id as string);
      paymentIntentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : (session.payment_intent as { id?: string } | null)?.id ?? null;
      if (paymentIntentId) {
        await admin
          .from('requests')
          .update({ stripe_payment_intent_id: paymentIntentId })
          .eq('id', requestId);
      }
    } catch (sessionErr) {
      console.warn('[processRefund] Could not recover payment intent from session:', sessionErr);
    }
  }

  if (!paymentIntentId) {
    return {
      ok: false,
      status: 400,
      error: 'No payment intent found for this request',
      details: { requestId },
    };
  }

  const totalAmount = request.amount_cents || 0;
  const alreadyRefunded = request.refunded_amount_cents || 0;
  const maxRefundable = totalAmount - alreadyRefunded;
  const refundAmount = amountCents || maxRefundable;

  if (refundAmount <= 0) {
    return {
      ok: false,
      status: 400,
      error: 'Invalid refund amount',
      details: { totalAmount, alreadyRefunded, maxRefundable, requestedAmount: amountCents },
    };
  }

  if (refundAmount > maxRefundable) {
    return {
      ok: false,
      status: 400,
      error: 'Refund amount exceeds available amount',
      details: { totalAmount, alreadyRefunded, maxRefundable, requestedAmount: amountCents },
    };
  }

  try {
    const refund = await stripe.refunds.create(
      {
        payment_intent: paymentIntentId,
        amount: refundAmount,
        reason: (reason as Stripe.RefundCreateParams.Reason) || 'requested_by_customer',
        metadata: {
          request_id: requestId,
          refund_reason: reason || 'automatic',
          partial_refund: (partial || refundAmount < totalAmount).toString(),
          idempotency_key: effectiveIdempotencyKey,
        },
      },
      {
        idempotencyKey: effectiveIdempotencyKey.slice(0, 255),
      }
    );

    const newRefundedAmount = alreadyRefunded + refundAmount;
    const isFullyRefunded = newRefundedAmount >= totalAmount;

    const updateData: Record<string, unknown> = {
      refunded_amount_cents: newRefundedAmount,
      refund_status: isFullyRefunded ? 'refunded' : 'partially_refunded',
      refund_reason: reason || 'automatic',
      refunded_at: new Date().toISOString(),
      stripe_refund_id: refund.id,
    };
    updateData.payment_status = 'refunded';
    if (isFullyRefunded) {
      // Keep terminal UX statuses (rejected/completed); move active payment states to refunded.
      if (
        request.status === 'paid' ||
        request.status === 'in_progress' ||
        request.status === 'timeout' ||
        request.status === 'accepted'
      ) {
        updateData.status = 'refunded';
      }
    }

    const { error: updateError } = await admin
      .from('requests')
      .update(updateData)
      .eq('id', requestId);

    if (updateError) {
      console.error('[processRefund] Failed to update request with refund info:', updateError);
    }

    return {
      ok: true,
      refundId: refund.id,
      refundAmount,
      totalRefunded: newRefundedAmount,
      totalAmount,
      isFullyRefunded,
      idempotencyKey: effectiveIdempotencyKey,
      alreadyRefunded: false,
      customerName,
      customerEmail: customer?.email || null,
      message: isFullyRefunded ? 'Request fully refunded' : 'Partial refund processed',
    };
  } catch (stripeError: unknown) {
    const err = stripeError as { message?: string; code?: string };
    console.error('[processRefund] Stripe refund failed:', stripeError);

    let errorType = 'STRIPE_ERROR';
    let errorMessage = err.message || 'Stripe refund failed';

    if (err.code === 'charge_already_refunded') {
      errorType = 'ALREADY_REFUNDED';
      errorMessage = 'Payment has already been refunded';
    } else if (err.code === 'amount_too_large') {
      errorType = 'AMOUNT_TOO_LARGE';
      errorMessage = 'Refund amount exceeds available amount';
    }

    await admin
      .from('requests')
      .update({
        refund_status: 'failed',
        refund_reason: `${errorType}: ${errorMessage}`,
        refunded_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    return {
      ok: false,
      status: 500,
      error: errorMessage,
      errorType,
      stripeErrorCode: err.code,
    };
  }
}
