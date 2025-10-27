import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { processAll = false, limit = 10 } = await req.json();

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

    // Get timeout requests that need refunds
    const { data: timeoutRequests, error: queryError } = await admin
      .from('requests')
      .select(`
        id,
        user_id,
        amount_cents,
        stripe_payment_intent_id,
        refund_status,
        refund_reason,
        profiles!requests_user_id_fkey (
          id,
          email,
          full_name,
          username
        )
      `)
      .eq('status', 'timeout')
      .eq('refund_status', 'none')
      .not('stripe_payment_intent_id', 'is', null)
      .limit(processAll ? 1000 : limit);

    if (queryError) {
      console.error('Failed to fetch timeout requests:', queryError);
      return new Response(JSON.stringify({ error: 'Failed to fetch timeout requests' }), { status: 500 });
    }

    if (!timeoutRequests || timeoutRequests.length === 0) {
      return new Response(JSON.stringify({ 
        success: true,
        message: 'No timeout requests found',
        processed: 0
      }), { status: 200 });
    }

    console.log(`[timeout-refunds] Processing ${timeoutRequests.length} timeout requests`);

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as any[]
    };

    // Process each timeout request
    for (const request of timeoutRequests) {
      try {
        results.processed++;
        
        const paymentIntentId = request.stripe_payment_intent_id;
        const amountCents = request.amount_cents || 0;
        
        if (!paymentIntentId || amountCents <= 0) {
          results.failed++;
          results.errors.push({
            requestId: request.id,
            error: 'Invalid payment intent or amount',
            amount: amountCents
          });
          continue;
        }

        console.log(`[timeout-refunds] Processing refund for request ${request.id}: $${(amountCents / 100).toFixed(2)}`);

        // Create refund via Stripe
        const refund = await stripe.refunds.create({
          payment_intent: paymentIntentId,
          amount: amountCents,
          reason: 'requested_by_customer',
          metadata: {
            request_id: request.id,
            refund_reason: 'timeout_automatic',
            timeout_type: request.refund_reason || 'unknown',
          },
        });

        console.log(`[timeout-refunds] Refund created: ${refund.id}`);

        // Update request with refund information
        const { error: updateError } = await admin
          .from('requests')
          .update({
            refunded_amount_cents: amountCents,
            refund_status: 'refunded',
            refunded_at: new Date().toISOString(),
            stripe_refund_id: refund.id,
            payment_status: 'refunded'
          })
          .eq('id', request.id);

        if (updateError) {
          console.error(`[timeout-refunds] Failed to update request ${request.id}:`, updateError);
          results.failed++;
          results.errors.push({
            requestId: request.id,
            error: 'Database update failed',
            refundId: refund.id
          });
        } else {
          results.successful++;
          console.log(`[timeout-refunds] Successfully processed refund for request ${request.id}`);
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error: any) {
        console.error(`[timeout-refunds] Failed to process request ${request.id}:`, error);
        results.failed++;
        results.errors.push({
          requestId: request.id,
          error: error.message || 'Unknown error',
          stripeError: error.code
        });

        // Update request to mark refund as failed
        await admin
          .from('requests')
          .update({
            refund_status: 'failed',
            refund_reason: `timeout_refund_failed: ${error.message || 'Unknown error'}`,
            refunded_at: new Date().toISOString()
          })
          .eq('id', request.id);
      }
    }

    console.log(`[timeout-refunds] Completed processing: ${results.successful} successful, ${results.failed} failed`);

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${results.processed} timeout requests`,
      results: results
    }), { status: 200 });

  } catch (error: any) {
    console.error('Error processing timeout refunds:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to process timeout refunds',
      errorType: 'UNKNOWN_ERROR'
    }), { status: 500 });
  }
}
