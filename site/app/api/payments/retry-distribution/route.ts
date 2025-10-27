import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { requestId, maxRetries = 3 } = await req.json();
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
        payment_distribution_attempts,
        payment_distribution_error,
        profiles!requests_influencer_id_fkey (
          id,
          stripe_connect_account_id,
          is_reviewer,
          username,
          full_name,
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
      return new Response(JSON.stringify({ 
        error: 'Reviewer has not set up Stripe Connect account',
        errorType: 'NO_CONNECT_ACCOUNT',
        reviewerId: request.influencer_id,
        reviewerName: reviewer.full_name || reviewer.username,
        reviewerEmail: reviewer.email,
        message: 'Please ask the reviewer to complete their Stripe Connect setup'
      }), { status: 400 });
    }

    // Calculate the amount to transfer
    const totalAmount = request.amount_cents || 0;
    const auroFee = request.application_fee_cents || 0;
    const reviewerAmount = totalAmount - auroFee;

    if (reviewerAmount <= 0) {
      return new Response(JSON.stringify({ 
        error: 'Invalid payment amount',
        totalAmount,
        auroFee,
        reviewerAmount
      }), { status: 400 });
    }

    try {
      // Check account balance
      const balance = await stripe.balance.retrieve();
      const availableBalance = balance.available[0]?.amount || 0;
      
      if (availableBalance < reviewerAmount) {
        // Log insufficient funds error
        await admin
          .from('requests')
          .update({ 
            payment_distribution_attempts: attempts + 1,
            payment_distribution_error: `Insufficient funds: Available ${availableBalance}, Required ${reviewerAmount}`,
            payment_distribution_failed_at: new Date().toISOString()
          })
          .eq('id', requestId);

        return new Response(JSON.stringify({ 
          error: 'Insufficient funds in Auro account',
          errorType: 'INSUFFICIENT_FUNDS',
          availableBalance: availableBalance,
          requiredAmount: reviewerAmount,
          shortfall: reviewerAmount - availableBalance,
          attempts: attempts + 1,
          message: 'Please add funds to the Auro Stripe account'
        }), { status: 400 });
      }

      // Create the transfer
      const transfer = await stripe.transfers.create({
        amount: reviewerAmount,
        currency: 'usd',
        destination: connectAccountId,
        transfer_group: `review_${requestId}`,
        metadata: {
          request_id: requestId,
          reviewer_id: request.influencer_id,
          auro_fee_cents: auroFee.toString(),
          total_amount_cents: totalAmount.toString(),
          retry_attempt: (attempts + 1).toString()
        },
      });

      // Update the request
      const { error: updateError } = await admin
        .from('requests')
        .update({ 
          payment_distributed: true,
          payment_distributed_at: new Date().toISOString(),
          stripe_transfer_id: transfer.id,
          reviewer_amount_cents: reviewerAmount,
          payment_distribution_error: null,
          payment_distribution_failed_at: null
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
        reviewerName: reviewer.full_name || reviewer.username,
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
          payment_distribution_failed_at: new Date().toISOString()
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
