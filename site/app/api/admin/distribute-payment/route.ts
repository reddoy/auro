import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { requestId, force = false } = await req.json();
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
        profiles!requests_influencer_id_fkey (
          id,
          stripe_connect_account_id,
          is_reviewer,
          username,
          full_name
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

    // Check if payment already distributed
    if (request.payment_distributed && !force) {
      return new Response(JSON.stringify({ 
        error: 'Payment already distributed. Use force=true to override.',
        alreadyDistributed: true,
        transferId: request.stripe_transfer_id,
        reviewerAmount: request.reviewer_amount_cents
      }), { status: 400 });
    }

    // Verify the request is completed (unless forced)
    if (request.status !== 'completed' && !force) {
      return new Response(JSON.stringify({ 
        error: 'Request is not completed yet. Use force=true to override.',
        currentStatus: request.status
      }), { status: 400 });
    }

    const reviewer = (request as any).profiles;
    if (!reviewer?.is_reviewer) {
      return new Response(JSON.stringify({ error: 'Invalid reviewer' }), { status: 400 });
    }

    const connectAccountId = reviewer.stripe_connect_account_id;
    if (!connectAccountId) {
      return new Response(JSON.stringify({ 
        error: 'Reviewer has not set up their payment account yet. Please ask them to complete their Stripe Connect setup.',
        reviewerId: request.influencer_id,
        reviewerName: reviewer.full_name || reviewer.username
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

    // Create a transfer to the reviewer's Connect account
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
        distributed_by: 'admin_manual'
      },
    });

    // Update the request to mark payment as distributed
    const { error: updateError } = await admin
      .from('requests')
      .update({ 
        payment_distributed: true,
        payment_distributed_at: new Date().toISOString(),
        stripe_transfer_id: transfer.id,
        reviewer_amount_cents: reviewerAmount
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

  } catch (error: any) {
    console.error('Error distributing payment:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to distribute payment' 
    }), { status: 500 });
  }
}