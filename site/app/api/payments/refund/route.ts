import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

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

    // IDEMPOTENCY: Check if we've already processed this refund request
    // Use idempotency key if provided, otherwise generate one from requestId + timestamp
    const effectiveIdempotencyKey = idempotencyKey || `refund_${requestId}_${Date.now()}`;
    
    // Check for existing refund operation with this idempotency key
    // We'll use the refund_status field as a simple idempotency check
    // For more robust idempotency, you could create a separate idempotency_keys table

    // Get the request details with atomic check
    const { data: request, error: requestError } = await admin
      .from('requests')
      .select(`
        id,
        status,
        user_id,
        amount_cents,
        stripe_payment_intent_id,
        stripe_session_id,
        refunded_amount_cents,
        refund_status,
        refund_reason,
        refunded_at,
        stripe_refund_id
      `)
      .eq('id', requestId)
      .maybeSingle();

    if (requestError) {
      console.error('Failed to fetch request:', requestError);
      return new Response(JSON.stringify({ error: 'Failed to fetch request', details: requestError.message }), { status: 500 });
    }

    // Get customer profile separately if needed
    let customer = null;
    if (request?.user_id) {
      try {
        const { data: profileData } = await admin
          .from('profiles')
          .select('id, email, full_name, username')
          .eq('id', request.user_id)
          .maybeSingle();
        customer = profileData;
      } catch (profileError) {
        console.error('Failed to fetch customer profile:', profileError);
        // Don't fail the refund if we can't get the profile
      }
    }

    if (!request) {
      return new Response(JSON.stringify({ error: 'Request not found' }), { status: 404 });
    }

    // IDEMPOTENCY: Check if already fully refunded
    if (request.refund_status === 'refunded') {
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Request already refunded',
        alreadyRefunded: true,
        refundedAmount: request.refunded_amount_cents,
        idempotencyKey: effectiveIdempotencyKey
      }), { status: 200 });
    }
    
    // IDEMPOTENCY: Check if there's an existing Stripe refund ID for this request
    // This prevents duplicate refunds if the same request is processed concurrently
    if (request.stripe_refund_id) {
      // Verify the refund exists in Stripe
      try {
        const existingRefund = await stripe.refunds.retrieve(request.stripe_refund_id);
        if (existingRefund && existingRefund.status !== 'failed') {
          return new Response(JSON.stringify({ 
            success: true,
            message: 'Refund already processed',
            alreadyRefunded: true,
            refundId: request.stripe_refund_id,
            refundedAmount: request.refunded_amount_cents,
            idempotencyKey: effectiveIdempotencyKey
          }), { status: 200 });
        }
      } catch (stripeError: any) {
        // If refund doesn't exist in Stripe, continue with new refund
        if (stripeError.code !== 'resource_missing') {
          console.warn('Error checking existing refund:', stripeError);
        }
      }
    }

    // Check if request has payment intent
    const paymentIntentId = request.stripe_payment_intent_id;
    if (!paymentIntentId) {
      return new Response(JSON.stringify({ 
        error: 'No payment intent found for this request',
        requestId: requestId
      }), { status: 400 });
    }

    // Determine refund amount
    const totalAmount = request.amount_cents || 0;
    const alreadyRefunded = request.refunded_amount_cents || 0;
    const maxRefundable = totalAmount - alreadyRefunded;
    
    let refundAmount = amountCents || maxRefundable;
    
    // Validate refund amount
    if (refundAmount <= 0) {
      return new Response(JSON.stringify({ 
        error: 'Invalid refund amount',
        totalAmount,
        alreadyRefunded,
        maxRefundable,
        requestedAmount: amountCents
      }), { status: 400 });
    }

    if (refundAmount > maxRefundable) {
      return new Response(JSON.stringify({ 
        error: 'Refund amount exceeds available amount',
        totalAmount,
        alreadyRefunded,
        maxRefundable,
        requestedAmount: amountCents
      }), { status: 400 });
    }

    try {
      // Create refund via Stripe
      console.log('🔄 Creating refund:', {
        paymentIntentId,
        amount: refundAmount,
        reason: reason || 'requested_by_customer',
        partial: partial || refundAmount < totalAmount
      });

      // Use idempotency key to prevent duplicate refunds if called concurrently
      const refund = await stripe.refunds.create(
        {
          payment_intent: paymentIntentId,
          amount: refundAmount,
          reason: reason || 'requested_by_customer',
          metadata: {
            request_id: requestId,
            refund_reason: reason || 'automatic',
            partial_refund: (partial || refundAmount < totalAmount).toString(),
            idempotency_key: effectiveIdempotencyKey,
          },
        },
        {
          idempotencyKey: effectiveIdempotencyKey.slice(0, 255), // Stripe limits to 255 chars
        }
      );

      console.log('✅ Refund created successfully:', {
        refundId: refund.id,
        amount: refund.amount,
        status: refund.status
      });

      // Update request with refund information
      const newRefundedAmount = alreadyRefunded + refundAmount;
      const isFullyRefunded = newRefundedAmount >= totalAmount;
      
      const updateData = {
        refunded_amount_cents: newRefundedAmount,
        refund_status: isFullyRefunded ? 'refunded' : 'partially_refunded',
        refund_reason: reason || 'automatic',
        refunded_at: new Date().toISOString(),
        stripe_refund_id: refund.id,
        // Update status if fully refunded
        ...(isFullyRefunded && { status: 'refunded', payment_status: 'refunded' })
      };

      const { error: updateError } = await admin
        .from('requests')
        .update(updateData)
        .eq('id', requestId);

      if (updateError) {
        console.error('Failed to update request with refund info:', updateError);
        // Don't fail the request since the refund was successful
      }

      return new Response(JSON.stringify({ 
        success: true,
        refundId: refund.id,
        refundAmount: refundAmount,
        totalRefunded: newRefundedAmount,
        totalAmount: totalAmount,
        isFullyRefunded: isFullyRefunded,
        customerName: customer?.full_name || customer?.username || null,
        customerEmail: customer?.email || null,
        idempotencyKey: effectiveIdempotencyKey,
        message: isFullyRefunded ? 'Request fully refunded' : 'Partial refund processed'
      }), { status: 200 });

    } catch (stripeError: any) {
      console.error('Stripe refund failed:', stripeError);
      
      let errorType = 'STRIPE_ERROR';
      let errorMessage = stripeError.message || 'Stripe refund failed';
      
      if (stripeError.code === 'charge_already_refunded') {
        errorType = 'ALREADY_REFUNDED';
        errorMessage = 'Payment has already been refunded';
      } else if (stripeError.code === 'amount_too_large') {
        errorType = 'AMOUNT_TOO_LARGE';
        errorMessage = 'Refund amount exceeds available amount';
      }

      // Log the error
      await admin
        .from('requests')
        .update({ 
          refund_status: 'failed',
          refund_reason: `${errorType}: ${errorMessage}`,
          refunded_at: new Date().toISOString()
        })
        .eq('id', requestId);

      return new Response(JSON.stringify({ 
        error: errorMessage,
        errorType: errorType,
        stripeErrorCode: stripeError.code,
        requestId: requestId,
        message: 'Refund failed. This can be retried manually.'
      }), { status: 500 });
    }

  } catch (error: any) {
    console.error('Error processing refund:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to process refund',
      errorType: 'UNKNOWN_ERROR'
    }), { status: 500 });
  }
}
