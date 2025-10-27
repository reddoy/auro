import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { requestId } = await req.json();
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
        stripe_session_id,
        stripe_payment_intent_id,
        payment_distributed,
        reviewer_amount_cents,
        stripe_transfer_id,
        payment_distributed_at,
        payment_distribution_attempts,
        payment_distribution_error,
        payment_distribution_failed_at,
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
      console.error('Failed to fetch request:', requestError);
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

    // Verify the request is completed
    if (request.status !== 'completed') {
      return new Response(JSON.stringify({ 
        error: 'Request is not completed yet. Payment can only be distributed after review completion.',
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
      // Log this as a failed distribution attempt
      await admin
        .from('requests')
        .update({ 
          payment_distribution_attempts: (request.payment_distribution_attempts || 0) + 1,
          payment_distribution_error: 'Reviewer has not set up Stripe Connect account',
          payment_distribution_failed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      return new Response(JSON.stringify({ 
        error: 'Reviewer has not set up their payment account yet.',
        errorType: 'NO_CONNECT_ACCOUNT',
        reviewerId: request.influencer_id,
        reviewerName: reviewer.full_name || reviewer.username,
        reviewerEmail: reviewer.email,
        message: 'Please ask the reviewer to complete their Stripe Connect setup in their profile settings.'
      }), { status: 400 });
    }

    // Calculate the amount to transfer to reviewer
    const totalAmount = request.amount_cents || 0;
    const auroFee = request.application_fee_cents || 0;
    const reviewerAmount = totalAmount - auroFee;

    if (reviewerAmount <= 0) {
      return new Response(JSON.stringify({ 
        error: 'Invalid payment amount. Reviewer amount would be zero or negative.',
        totalAmount,
        auroFee,
        reviewerAmount
      }), { status: 400 });
    }

    try {
      // Check account balance before attempting transfer
      // Use the Auro account ID to check the correct balance
      const auroAccountId = 'acct_1S0FmFBCrjcqavov';
      const balance = await stripe.balance.retrieve({}, { stripeAccount: auroAccountId });
      const availableBalance = balance.available[0]?.amount || 0; // In cents
      
      if (availableBalance < reviewerAmount) {
        // Log insufficient funds error
        await admin
          .from('requests')
          .update({ 
            payment_distribution_attempts: (request.payment_distribution_attempts || 0) + 1,
            payment_distribution_error: `Insufficient funds: Available ${availableBalance}, Required ${reviewerAmount}`,
            payment_distribution_failed_at: new Date().toISOString()
          })
          .eq('id', requestId);

        return new Response(JSON.stringify({ 
          error: 'Insufficient funds in Auro account to complete this transfer.',
          errorType: 'INSUFFICIENT_FUNDS',
          availableBalance: availableBalance,
          requiredAmount: reviewerAmount,
          shortfall: reviewerAmount - availableBalance,
          message: 'Please add funds to the Auro Stripe account or contact support.'
        }), { status: 400 });
      }

      // Create a transfer to the reviewer's Connect account
      const transfer = await stripe.transfers.create({
        amount: reviewerAmount,
        currency: 'usd',
        destination: connectAccountId,
        source_transaction: undefined, // Let Stripe use the account's available balance
        transfer_group: `review_${requestId}`,
        metadata: {
          request_id: requestId,
          reviewer_id: request.influencer_id,
          auro_fee_cents: auroFee.toString(),
          total_amount_cents: totalAmount.toString(),
          source_account: auroAccountId,
        },
      }, {
        stripeAccount: auroAccountId // Use the Auro account as the source
      });

      // Update the request to mark payment as distributed
      const { error: updateError } = await admin
        .from('requests')
        .update({ 
          payment_distributed: true,
          payment_distributed_at: new Date().toISOString(),
          stripe_transfer_id: transfer.id,
          reviewer_amount_cents: reviewerAmount,
          payment_distribution_error: null, // Clear any previous errors
          payment_distribution_failed_at: null
        })
        .eq('id', requestId);

      if (updateError) {
        console.error('Failed to update request with payment info:', updateError);
        // Don't fail the request since the transfer was successful
      }

      return new Response(JSON.stringify({ 
        success: true,
        transferId: transfer.id,
        reviewerAmount: reviewerAmount,
        auroFee: auroFee,
        totalAmount: totalAmount,
        reviewerName: reviewer.full_name || reviewer.username,
        message: 'Payment successfully distributed to reviewer'
      }), { status: 200 });

    } catch (stripeError: any) {
      // Handle Stripe-specific errors
      console.error('Stripe transfer failed:', stripeError);
      
      let errorType = 'STRIPE_ERROR';
      let errorMessage = stripeError.message || 'Stripe transfer failed';
      
      if (stripeError.code === 'insufficient_funds') {
        errorType = 'INSUFFICIENT_FUNDS';
        errorMessage = 'Insufficient funds in Auro account';
      } else if (stripeError.code === 'account_invalid') {
        errorType = 'INVALID_CONNECT_ACCOUNT';
        errorMessage = 'Reviewer\'s Stripe Connect account is invalid';
      }

      // Log the error
      await admin
        .from('requests')
        .update({ 
          payment_distribution_attempts: (request.payment_distribution_attempts || 0) + 1,
          payment_distribution_error: `${errorType}: ${errorMessage}`,
          payment_distribution_failed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      return new Response(JSON.stringify({ 
        error: errorMessage,
        errorType: errorType,
        stripeErrorCode: stripeError.code,
        reviewerId: request.influencer_id,
        reviewerName: reviewer.full_name || reviewer.username,
        message: 'Payment distribution failed. This can be retried manually.'
      }), { status: 500 });
    }

  } catch (error: any) {
    console.error('Error distributing payment:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to distribute payment',
      errorType: 'UNKNOWN_ERROR'
    }), { status: 500 });
  }
}
