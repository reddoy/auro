import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import {
  applyCheckoutSessionAsyncPaymentFailed,
  applyCheckoutSessionPaidUpdate,
} from '@/lib/stripe-checkout-session-paid';

export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY || '';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  const stripe = new Stripe(secret);
  const body = await req.text();
  const sig = (req.headers.get('stripe-signature') || '') as string;
  
  console.log('[stripe-webhook] ===== WEBHOOK RECEIVED =====');
  console.log('[stripe-webhook] Body length:', body.length);
  console.log('[stripe-webhook] Signature present:', !!sig);
  
  try {
    const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    
    // CRITICAL: Idempotency check - prevent duplicate webhook processing
    // Store processed event IDs to prevent reprocessing
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (url && key) {
      const admin = createClient(url, key);
      
      // Check if we've already processed this event
      const { data: existingEvent } = await admin
        .from('webhook_events')
        .select('id, processed_at')
        .eq('stripe_event_id', event.id)
        .maybeSingle();
      
      if (existingEvent) {
        console.log('[stripe-webhook] Event already processed:', event.id, 'at', existingEvent.processed_at);
        return new Response(JSON.stringify({ received: true, alreadyProcessed: true }), { status: 200 });
      }
      
      // Mark event as processing (with a small delay to handle race conditions)
      try {
        await admin
          .from('webhook_events')
          .insert({
            stripe_event_id: event.id,
            event_type: event.type,
            processed_at: new Date().toISOString(),
            status: 'processing'
          });
      } catch (insertError: any) {
        // If insert fails due to unique constraint, event was already processed
        if (insertError?.code === '23505') {
          console.log('[stripe-webhook] Event already being processed:', event.id);
          return new Response(JSON.stringify({ received: true, alreadyProcessed: true }), { status: 200 });
        }
        // Log but continue - don't fail webhook processing
        console.error('[stripe-webhook] Failed to record event:', insertError);
      }
    }
    console.log('[stripe-webhook] ===== EVENT PARSED SUCCESSFULLY =====');
    console.log('[stripe-webhook] Event ID:', event.id);
    console.log('[stripe-webhook] Event type:', event.type);
    console.log('[stripe-webhook] Event created:', new Date(event.created * 1000).toISOString());
    console.log('[stripe-webhook] Event data keys:', Object.keys(event.data.object));
    switch (event.type) {
      case 'checkout.session.completed':
        console.log('[stripe-webhook] ===== PROCESSING CHECKOUT.SESSION.COMPLETED =====');
        try {
          const session = event.data.object as Stripe.Checkout.Session;
          console.log('[stripe-webhook] Session ID:', session.id);
          console.log('[stripe-webhook] Session status:', session.payment_status);
          console.log('[stripe-webhook] Payment intent ID:', session.payment_intent);
          await applyCheckoutSessionPaidUpdate({ stripe, event, session });
        } catch (e) {
          console.error('[stripe-webhook] ===== WEBHOOK UPDATE ERROR =====');
          console.error('[stripe-webhook] Error details:', e);
          
          // Mark webhook event as failed
          try {
            const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
            const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
            if (url && key) {
              const admin = createClient(url, key);
              await admin
                .from('webhook_events')
                .update({ 
                  status: 'failed',
                  error_message: (e as any)?.message || 'Unknown error'
                })
                .eq('stripe_event_id', event.id);
            }
          } catch (updateError) {
            console.error('[stripe-webhook] Failed to mark event as failed:', updateError);
          }
        }
        break;
      case 'checkout.session.async_payment_succeeded':
        console.log('[stripe-webhook] ===== ASYNC PAYMENT SUCCEEDED (Checkout) =====');
        try {
          const session = event.data.object as Stripe.Checkout.Session;
          if (session.payment_status === 'paid') {
            await applyCheckoutSessionPaidUpdate({ stripe, event, session });
          } else {
            console.warn('[stripe-webhook] async_payment_succeeded but session not paid:', session.payment_status);
          }
        } catch (e) {
          console.error('[stripe-webhook] async_payment_succeeded error', e);
        }
        break;
      case 'checkout.session.async_payment_failed':
        console.log('[stripe-webhook] ===== ASYNC PAYMENT FAILED (Checkout) =====');
        try {
          const session = event.data.object as Stripe.Checkout.Session;
          await applyCheckoutSessionAsyncPaymentFailed(session);
        } catch (e) {
          console.error('[stripe-webhook] async_payment_failed error', e);
        }
        break;
      case 'charge.refunded':
      case 'charge.refund.updated':
        console.log('[stripe-webhook] ===== PROCESSING CHARGE.REFUNDED =====');
        try {
          const charge = event.data.object as Stripe.Charge;
          const metadata = (charge.metadata || {}) as Record<string, string>;
          const requestId = metadata.request_id || metadata.requestId;
          
          if (!requestId) {
            // Try to get request ID from payment intent metadata
            const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : (charge.payment_intent as any)?.id;
            if (paymentIntentId) {
              try {
                const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
                const piMetadata = (pi.metadata || {}) as Record<string, string>;
                const piRequestId = piMetadata.request_id || piMetadata.requestId;
                if (piRequestId) {
                  // Use request ID from payment intent
                  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
                  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
                  if (url && key) {
                    const admin = createClient(url, key);
                    const amountRefunded = typeof charge.amount_refunded === 'number' ? charge.amount_refunded : 0;
                    const totalAmount = typeof charge.amount === 'number' ? charge.amount : 0;
                    const fullyRefunded = totalAmount > 0 && amountRefunded >= totalAmount;
                    
                    // Get current refund status to calculate new total
                    const { data: existingRequest } = await admin
                      .from('requests')
                      .select('refunded_amount_cents, amount_cents')
                      .eq('id', piRequestId)
                      .maybeSingle();
                    
                    const currentRefunded = existingRequest?.refunded_amount_cents || 0;
                    const requestTotal = existingRequest?.amount_cents || totalAmount;
                    const newRefundedTotal = Math.max(currentRefunded, amountRefunded);
                    const isFullyRefunded = newRefundedTotal >= requestTotal;
                    
                    const updateData: any = {
                      refunded_amount_cents: newRefundedTotal,
                      refund_status: isFullyRefunded ? 'refunded' : 'partially_refunded',
                      payment_status: isFullyRefunded ? 'refunded' : 'partial_refund',
                      refunded_at: new Date().toISOString(),
                    };
                    
                    if (isFullyRefunded) {
                      updateData.status = 'refunded';
                    }
                    
                    const { error: updateError } = await admin
                      .from('requests')
                      .update(updateData)
                      .eq('id', piRequestId);
                    
                    if (updateError) {
                      console.error('[stripe-webhook] Failed to update refund status:', updateError);
                    } else {
                      console.log('[stripe-webhook] Refund status updated successfully:', {
                        requestId: piRequestId,
                        amountRefunded: newRefundedTotal,
                        isFullyRefunded
                      });
                    }
                  }
                }
              } catch (piError) {
                console.error('[stripe-webhook] Failed to retrieve payment intent for refund:', piError);
              }
            }
            break;
          }
          
          // Process refund with request ID from charge metadata
          const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
          const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
          if (url && key) {
            const admin = createClient(url, key);
            const amountRefunded = typeof charge.amount_refunded === 'number' ? charge.amount_refunded : 0;
            const totalAmount = typeof charge.amount === 'number' ? charge.amount : 0;
            
            // Get current refund status to calculate new total
            const { data: existingRequest } = await admin
              .from('requests')
              .select('refunded_amount_cents, amount_cents')
              .eq('id', requestId)
              .maybeSingle();
            
            const currentRefunded = existingRequest?.refunded_amount_cents || 0;
            const requestTotal = existingRequest?.amount_cents || totalAmount;
            const newRefundedTotal = Math.max(currentRefunded, amountRefunded);
            const isFullyRefunded = newRefundedTotal >= requestTotal;
            
            const updateData: any = {
              refunded_amount_cents: newRefundedTotal,
              refund_status: isFullyRefunded ? 'refunded' : 'partially_refunded',
              payment_status: isFullyRefunded ? 'refunded' : 'partial_refund',
              refunded_at: new Date().toISOString(),
            };
            
            if (isFullyRefunded) {
              updateData.status = 'refunded';
            }
            
            const { error: updateError } = await admin
              .from('requests')
              .update(updateData)
              .eq('id', requestId);
            
            if (updateError) {
              console.error('[stripe-webhook] Failed to update refund status:', updateError);
            } else {
              console.log('[stripe-webhook] Refund status updated successfully:', {
                requestId,
                amountRefunded: newRefundedTotal,
                isFullyRefunded
              });
            }
            
            // Mark webhook event as completed
            try {
              await admin
                .from('webhook_events')
                .update({ status: 'completed' })
                .eq('stripe_event_id', event.id);
            } catch (updateError) {
              console.error('[stripe-webhook] Failed to mark event as completed:', updateError);
            }
          }
        } catch (e) {
          console.error('[stripe-webhook] ===== REFUND WEBHOOK ERROR =====');
          console.error('[stripe-webhook] Error details:', e);
          
          // Mark webhook event as failed
          try {
            const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
            const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
            if (url && key) {
              const admin = createClient(url, key);
              await admin
                .from('webhook_events')
                .update({ 
                  status: 'failed',
                  error_message: (e as any)?.message || 'Unknown error'
                })
                .eq('stripe_event_id', event.id);
            }
          } catch (updateError) {
            console.error('[stripe-webhook] Failed to mark event as failed:', updateError);
          }
        }
        break;
      default:
        break;
    }
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Webhook error' }), { status: 400 });
  }
}


