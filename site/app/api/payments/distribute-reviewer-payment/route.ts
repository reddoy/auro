import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const REVIEWER_SHARE_BPS = 8000;
const MAX_RETRIES = 3;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function paymentError(errorType: string, message: string, status = 400) {
  return new Response(JSON.stringify({ errorType, error: message }), { status });
}

export async function POST(req: Request) {
  try {
    const { requestId } = await req.json();
    if (!requestId) {
      return paymentError('BAD_REQUEST', 'Missing requestId');
    }

    const stripe = new Stripe(requireEnv('STRIPE_SECRET_KEY'));
    const admin = createClient(requireEnv('NEXT_PUBLIC_SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'));
    const platformAccountId = requireEnv('STRIPE_PLATFORM_ACCOUNT_ID');

    const { data: request, error: requestError } = await admin
      .from('requests')
      .select(`
        id,
        status,
        influencer_id,
        amount_cents,
        payment_distributed,
        stripe_transfer_id,
        payment_distribution_attempts,
        profiles!requests_influencer_id_fkey (
          id,
          stripe_connect_account_id,
          is_reviewer,
          username,
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', requestId)
      .maybeSingle();

    if (requestError) return paymentError('REQUEST_FETCH_FAILED', 'Failed to fetch request', 500);
    if (!request) return paymentError('NOT_FOUND', 'Request not found', 404);
    if (request.payment_distributed) {
      return new Response(
        JSON.stringify({
          success: true,
          alreadyDistributed: true,
          transferId: request.stripe_transfer_id || null,
        }),
        { status: 200 }
      );
    }
    if (request.status !== 'completed') {
      return paymentError('INVALID_STATUS', `Request is ${request.status}. Must be completed before payout.`);
    }

    const priorAttempts = request.payment_distribution_attempts || 0;
    if (priorAttempts >= MAX_RETRIES) {
      return paymentError('MAX_RETRIES_EXCEEDED', `Reached max payout attempts (${MAX_RETRIES}).`);
    }

    const nextAttempt = priorAttempts + 1;
    const { data: lockResult } = await admin
      .from('requests')
      .update({
        payment_distribution_attempts: nextAttempt,
        payment_distribution_error: null,
      })
      .eq('id', requestId)
      .eq('payment_distributed', false)
      .select('id, payment_distributed')
      .maybeSingle();

    if (!lockResult || lockResult.payment_distributed) {
      return new Response(
        JSON.stringify({
          success: true,
          alreadyDistributed: true,
          message: 'Distribution is already in progress or completed.',
        }),
        { status: 200 }
      );
    }

    let reviewer = (request as any).profiles;
    if (Array.isArray(reviewer)) reviewer = reviewer[0];
    if (!reviewer?.id) {
      const { data: directReviewer } = await admin
        .from('profiles')
        .select('id, stripe_connect_account_id, is_reviewer, username, first_name, last_name, email')
        .eq('id', request.influencer_id)
        .maybeSingle();
      reviewer = directReviewer;
    }

    if (!reviewer?.is_reviewer) {
      await admin
        .from('requests')
        .update({
          payment_distribution_error: 'Invalid reviewer for payout',
          payment_distribution_failed_at: new Date().toISOString(),
        })
        .eq('id', requestId);
      return paymentError('INVALID_REVIEWER', 'Invalid reviewer', 400);
    }

    const reviewerName =
      [reviewer.first_name, reviewer.last_name].filter(Boolean).join(' ') ||
      reviewer.username ||
      'Reviewer';
    const connectAccountId = reviewer.stripe_connect_account_id?.trim() || null;
    if (!connectAccountId) {
      await admin
        .from('requests')
        .update({
          payment_distribution_error:
            'Payment held: reviewer must complete Stripe Connect onboarding before payout.',
          payment_status: 'queued',
        })
        .eq('id', requestId);
      return new Response(
        JSON.stringify({
          success: true,
          held: true,
          errorType: 'NO_CONNECT_ACCOUNT',
          message: 'Payment held until reviewer connects Stripe.',
          reviewerName,
          reviewerEmail: reviewer.email || null,
        }),
        { status: 200 }
      );
    }

    const account = await stripe.accounts.retrieve(connectAccountId);
    if (!account.payouts_enabled) {
      await admin
        .from('requests')
        .update({
          payment_distribution_error: 'Reviewer payouts are not enabled in Stripe Connect.',
          payment_distribution_failed_at: new Date().toISOString(),
          payment_status: 'queued',
        })
        .eq('id', requestId);
      return paymentError('PAYOUTS_DISABLED', 'Reviewer account is not payout-ready.');
    }

    const totalAmount = request.amount_cents || 0;
    const reviewerAmount = Math.floor((totalAmount * REVIEWER_SHARE_BPS) / 10000);
    const auroFee = totalAmount - reviewerAmount;
    if (reviewerAmount <= 0) {
      await admin
        .from('requests')
        .update({
          payment_distribution_error: `Invalid payout amount: ${reviewerAmount}`,
          payment_distribution_failed_at: new Date().toISOString(),
        })
        .eq('id', requestId);
      return paymentError('INVALID_AMOUNT', 'Reviewer amount resolved to zero.');
    }

    const balance = await stripe.balance.retrieve({}, { stripeAccount: platformAccountId });
    const availableBalance = balance.available[0]?.amount || 0;
    if (availableBalance < reviewerAmount) {
      await admin
        .from('requests')
        .update({
          payment_distribution_error: `Insufficient funds: available=${availableBalance}, required=${reviewerAmount}`,
          payment_distribution_failed_at: new Date().toISOString(),
          payment_status: 'queued',
        })
        .eq('id', requestId);
      return paymentError('INSUFFICIENT_FUNDS', 'Insufficient available balance for payout.');
    }

    let transfer: Stripe.Transfer;
    try {
      transfer = await stripe.transfers.create(
        {
          amount: reviewerAmount,
          currency: 'usd',
          destination: connectAccountId,
          transfer_group: `review_${requestId}`,
          metadata: {
            request_id: requestId,
            reviewer_id: request.influencer_id,
            total_amount_cents: String(totalAmount),
            reviewer_amount_cents: String(reviewerAmount),
            auro_fee_cents: String(auroFee),
            attempt: String(nextAttempt),
            source_account: platformAccountId,
          },
        },
        { idempotencyKey: `reviewer-payout-${requestId}-attempt-${nextAttempt}` }
      );
    } catch (error: any) {
      const isInsufficient = error?.code === 'insufficient_funds';
      const isAccount = error?.code === 'account_invalid' || error?.code === 'no_account';
      const errorType = isInsufficient
        ? 'INSUFFICIENT_FUNDS'
        : isAccount
          ? 'TRANSFER_FAILED'
          : 'TRANSFER_FAILED';

      await admin
        .from('requests')
        .update({
          payment_distribution_error: `${errorType}: ${error?.message || 'Unknown Stripe error'}`,
          payment_distribution_failed_at: new Date().toISOString(),
          payment_status: 'queued',
        })
        .eq('id', requestId);

      return paymentError(errorType, error?.message || 'Stripe transfer failed');
    }

    await admin
      .from('requests')
      .update({
        payment_distributed: true,
        payment_distributed_at: new Date().toISOString(),
        stripe_transfer_id: transfer.id,
        reviewer_amount_cents: reviewerAmount,
        application_fee_cents: auroFee,
        payment_distribution_error: null,
        payment_distribution_failed_at: null,
        payment_status: 'paid',
      })
      .eq('id', requestId);

    return new Response(
      JSON.stringify({
        success: true,
        transferId: transfer.id,
        reviewerName,
        totalAmount,
        reviewerAmount,
        auroFee,
      }),
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[distribute-reviewer-payment] fatal error', error);
    return paymentError('UNKNOWN_ERROR', error?.message || 'Failed to distribute payment', 500);
  }
}
