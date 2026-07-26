import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-server';
import { REVIEWER_SHARE_BPS } from '@/lib/platform-fee';

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return new Response(JSON.stringify(auth.body), { status: auth.status, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const { requestId, maxRetries = 3 } = await req.json();
    if (!requestId) {
      return new Response(JSON.stringify({ error: 'Missing requestId' }), { status: 400 });
    }

    const stripe = new Stripe(requireEnv('STRIPE_SECRET_KEY'));

    const admin = createClient(requireEnv('NEXT_PUBLIC_SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'));
    const platformAccountId = requireEnv('STRIPE_PLATFORM_ACCOUNT_ID');

    // Get the request details
    const { data: request, error: requestError } = await admin
      .from('requests')
      .select(`
        id,
        status,
        influencer_id,
        amount_cents,
        application_fee_cents,
        payment_distributed,
        reviewer_amount_cents,
        stripe_transfer_id,
        stripe_payment_intent_id,
        payment_distributed_at,
        payment_distribution_attempts,
        payment_distribution_error,
        payment_distribution_failed_at,
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

    if (requestError) {
      return new Response(JSON.stringify({ error: 'Failed to fetch request' }), { status: 500 });
    }

    if (!request) {
      return new Response(JSON.stringify({ error: 'Request not found' }), { status: 404 });
    }

    // Check if already distributed
    if (request.payment_distributed) {
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Payment already distributed',
        alreadyDistributed: true
      }), { status: 200 });
    }

    // Check if we've exceeded max retries
    const attempts = request.payment_distribution_attempts || 0;
    if (attempts >= maxRetries) {
      return new Response(JSON.stringify({ 
        error: `Maximum retry attempts (${maxRetries}) exceeded`,
        attempts,
        lastError: request.payment_distribution_error,
        message: 'Please investigate manually or contact support'
      }), { status: 400 });
    }

    // Verify the request is completed
    if (request.status !== 'completed') {
      return new Response(JSON.stringify({ 
        error: 'Request is not completed yet',
        currentStatus: request.status
      }), { status: 400 });
    }

    const reviewer = (request as any).profiles;
    if (!reviewer?.is_reviewer) {
      return new Response(JSON.stringify({ error: 'Invalid reviewer' }), { status: 400 });
    }

    // Check if reviewer has Stripe Connect account
    const connectAccountId = reviewer.stripe_connect_account_id;
    if (!connectAccountId) {
      // Payment is still being held - not an error, just waiting for Stripe setup
      return new Response(JSON.stringify({ 
        success: false,
        held: true,
        message: 'Payment is still being held. Reviewer needs to set up Stripe Connect account.',
        errorType: 'NO_CONNECT_ACCOUNT',
        reviewerId: request.influencer_id,
        reviewerName: [reviewer.first_name, reviewer.last_name].filter(Boolean).join(' ') || reviewer.username,
        reviewerEmail: reviewer.email,
        note: 'Once Stripe is connected, payment will be distributed automatically.'
      }), { status: 200 });
    }

    // Calculate the amount to transfer
    // SIMPLE MODEL: Customer pays X, Reviewer gets 80%, Auro absorbs Stripe fee
    // Standard fee: 20% for all reviewers
    const totalAmount = request.amount_cents || 0;
    const reviewerAmount = Math.floor((totalAmount * REVIEWER_SHARE_BPS) / 10000);
    const auroFee = totalAmount - reviewerAmount;

    if (reviewerAmount <= 0) {
      return new Response(JSON.stringify({ 
        error: 'Invalid payment amount',
        totalAmount,
        auroFee,
        reviewerAmount
      }), { status: 400 });
    }

    try {
      // Resolve a source_transaction (the original charge) from the PaymentIntent.
      // When set, Stripe links the transfer to that charge and releases funds
      // when the charge becomes available — no platform balance required.
      let sourceTransactionId: string | null = null;
      const piId =
        typeof (request as { stripe_payment_intent_id?: string | null }).stripe_payment_intent_id === 'string'
          ? (request as { stripe_payment_intent_id: string }).stripe_payment_intent_id
          : null;
      if (piId) {
        try {
          const pi = await stripe.paymentIntents.retrieve(piId);
          const latest = (pi as { latest_charge?: string | { id?: string } | null }).latest_charge;
          if (typeof latest === 'string') sourceTransactionId = latest;
          else if (latest && typeof latest === 'object' && typeof latest.id === 'string') sourceTransactionId = latest.id;
        } catch (piErr) {
          console.warn('[retry-distribution] paymentIntent introspect failed', {
            requestId,
            piId,
            message: (piErr as { message?: string })?.message,
          });
        }
      }

      // Only enforce a balance pre-check when we have no source_transaction to anchor to.
      if (!sourceTransactionId) {
        const balance = await stripe.balance.retrieve({}, { stripeAccount: platformAccountId });
        const availableBalance = balance.available[0]?.amount || 0; // In cents
        const pendingBalance = balance.pending[0]?.amount || 0; // In cents

        if (availableBalance < reviewerAmount) {
          await admin
            .from('requests')
            .update({
              payment_distribution_attempts: attempts + 1,
              payment_distribution_error: `Insufficient funds: Available ${availableBalance}, Pending ${pendingBalance}, Required ${reviewerAmount}`,
              payment_distribution_failed_at: new Date().toISOString(),
              payment_status: 'queued'
            })
            .eq('id', requestId);

          return new Response(JSON.stringify({
            error: 'Insufficient funds in Auro account',
            errorType: 'INSUFFICIENT_FUNDS',
            availableBalance: availableBalance,
            requiredAmount: reviewerAmount,
            shortfall: reviewerAmount - availableBalance,
            attempts: attempts + 1,
            message: 'No source charge available and platform balance is too low'
          }), { status: 400 });
        }
      }

      // Create the transfer (linked to the source charge when we have one)
      const transfer = await stripe.transfers.create(
        {
          amount: reviewerAmount,
          currency: 'usd',
          destination: connectAccountId,
          ...(sourceTransactionId ? { source_transaction: sourceTransactionId } : {}),
          transfer_group: `review_${requestId}`,
          metadata: {
            request_id: requestId,
            reviewer_id: request.influencer_id,
            auro_fee_cents: auroFee.toString(),
            total_amount_cents: totalAmount.toString(),
            retry_attempt: (attempts + 1).toString(),
            source_account: platformAccountId,
            source_transaction: sourceTransactionId || 'none',
          },
        },
        { idempotencyKey: `reviewer-payout-${requestId}-attempt-${attempts + 1}` }
      );

      // Update the request
      const { error: updateError } = await admin
        .from('requests')
        .update({ 
          payment_distributed: true,
          payment_distributed_at: new Date().toISOString(),
          stripe_transfer_id: transfer.id,
          reviewer_amount_cents: reviewerAmount,
          application_fee_cents: auroFee,
          payment_distribution_error: null,
          payment_distribution_failed_at: null,
          payment_status: 'paid'
        })
        .eq('id', requestId);

      if (updateError) {
        console.error('Failed to update request:', updateError);
      }

      return new Response(JSON.stringify({ 
        success: true,
        transferId: transfer.id,
        reviewerAmount: reviewerAmount,
        auroFee: auroFee,
        totalAmount: totalAmount,
        reviewerName: [reviewer.first_name, reviewer.last_name].filter(Boolean).join(' ') || reviewer.username,
        attempts: attempts + 1,
        message: 'Payment successfully distributed to reviewer'
      }), { status: 200 });

    } catch (stripeError: any) {
      // Log the error
      await admin
        .from('requests')
        .update({ 
          payment_distribution_attempts: attempts + 1,
          payment_distribution_error: `STRIPE_ERROR: ${stripeError.message}`,
          payment_distribution_failed_at: new Date().toISOString(),
          payment_status: 'queued'
        })
        .eq('id', requestId);

      return new Response(JSON.stringify({ 
        error: stripeError.message || 'Stripe transfer failed',
        errorType: 'STRIPE_ERROR',
        stripeErrorCode: stripeError.code,
        attempts: attempts + 1,
        reviewerId: request.influencer_id,
        reviewerName: reviewer.full_name || reviewer.username,
        message: 'Payment distribution failed. This can be retried again.'
      }), { status: 500 });
    }

  } catch (error: any) {
    console.error('Error retrying payment distribution:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to retry payment distribution',
      errorType: 'UNKNOWN_ERROR'
    }), { status: 500 });
  }
}
