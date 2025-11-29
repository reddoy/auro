import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

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
          const metadata = (session.metadata || {}) as Record<string, string>;
          const requestId = metadata.request_id;
          const uploadSessionId = metadata.upload_session_id;
          const customerEmail = (session.customer_details as any)?.email || (session as any)?.customer_email || '';
          const stripeAccountId = (event as any).account as string | undefined; // present for Connect events
          
          console.log('[stripe-webhook] Session ID:', session.id);
          console.log('[stripe-webhook] Session status:', session.payment_status);
          console.log('[stripe-webhook] Customer email:', customerEmail);
          console.log('[stripe-webhook] Request ID from metadata:', requestId);
          console.log('[stripe-webhook] Upload session ID:', uploadSessionId);
          console.log('[stripe-webhook] Metadata:', metadata);
          console.log('[stripe-webhook] Payment intent ID:', session.payment_intent);
          // Get application fee from metadata first (since Connect may be disabled)
          // Metadata has the correct fee calculated during checkout
          let applicationFeeCentsFromMetadata: number | undefined = undefined;
          if (metadata.auro_fee_cents) {
            const parsed = parseInt(metadata.auro_fee_cents, 10);
            if (!isNaN(parsed)) {
              applicationFeeCentsFromMetadata = parsed;
            }
          }
          
          // Retrieve PaymentIntent to compute Stripe fee and net (via balance transaction)
          let stripeFeeCents: number | undefined = undefined;
          let netAmountCents: number | undefined = undefined;
          let amountCents: number | undefined = undefined;
          let applicationFeeCents: number | undefined = undefined;
          try {
            const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent as any)?.id;
            if (paymentIntentId) {
              const pi = stripeAccountId
                ? await stripe.paymentIntents.retrieve(paymentIntentId, { stripeAccount: stripeAccountId })
                : await stripe.paymentIntents.retrieve(paymentIntentId);
              amountCents = typeof pi.amount === 'number' ? pi.amount : undefined;
              
              // Use PaymentIntent.application_fee_amount only if available (when Connect is enabled)
              // Otherwise, use the value from metadata (set during checkout)
              const piApplicationFee = typeof pi.application_fee_amount === 'number' ? pi.application_fee_amount : undefined;
              applicationFeeCents = piApplicationFee || applicationFeeCentsFromMetadata;
              
              console.log(`[stripe-webhook] PaymentIntent ${paymentIntentId}: amount=${amountCents}, application_fee=${applicationFeeCents}, stripeAccount=${stripeAccountId}`);
              // List charges by payment_intent instead of reading from pi.charges (more stable types)
              const chargeList = stripeAccountId
                ? await stripe.charges.list({ payment_intent: paymentIntentId, limit: 1 }, { stripeAccount: stripeAccountId })
                : await stripe.charges.list({ payment_intent: paymentIntentId, limit: 1 });
              const chargeId = chargeList.data[0]?.id;
              if (chargeId) {
                const charge = stripeAccountId
                  ? await stripe.charges.retrieve(chargeId, { stripeAccount: stripeAccountId })
                  : await stripe.charges.retrieve(chargeId);
                const balTxId = (charge as any).balance_transaction as string | undefined;
                if (balTxId) {
                  const balTx = stripeAccountId
                    ? await stripe.balanceTransactions.retrieve(balTxId, { stripeAccount: stripeAccountId })
                    : await stripe.balanceTransactions.retrieve(balTxId);
                  // balance transaction amounts are in the smallest currency unit
                  stripeFeeCents = typeof balTx.fee === 'number' ? balTx.fee : undefined;
                  netAmountCents = typeof balTx.net === 'number' ? balTx.net : undefined;
                  
                  console.log(`[stripe-webhook] Balance transaction ${balTxId}: fee=${stripeFeeCents}, net=${netAmountCents}`);
                }
              }
            }
          } catch (feeErr) {
            console.error('fee calc error', feeErr);
          }
          if (requestId) {
            console.log('[stripe-webhook] ===== UPDATING REQUEST IN DATABASE =====');
            console.log('[stripe-webhook] Request ID to update:', requestId);
            
            const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
            const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
            console.log('[stripe-webhook] Supabase URL present:', !!url);
            console.log('[stripe-webhook] Supabase key present:', !!key);
            
            if (url && key) {
              const admin = createClient(url, key);
              const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent as any)?.id;
              
              // Build update data - only update application_fee_cents if we have a valid value
              // This prevents overwriting the correct value when Connect is disabled
              const updateData: any = {
                status: 'paid',
                payment_status: 'paid',
                stripe_session_id: session.id,
                stripe_payment_intent_id: paymentIntentId || null,
                stripe_fee_cents: typeof stripeFeeCents === 'number' ? stripeFeeCents : null,
                net_amount_cents: typeof netAmountCents === 'number' ? netAmountCents : null,
                amount_cents: typeof amountCents === 'number' ? amountCents : undefined,
                // Set 48-hour deadline for reviewer to accept
                accept_by: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
              };
              
              // Only update application_fee_cents if we have a valid value
              // Prefer metadata value (set during checkout) over PaymentIntent value
              if (typeof applicationFeeCents === 'number') {
                updateData.application_fee_cents = applicationFeeCents;
              } else if (applicationFeeCentsFromMetadata) {
                // Fallback to metadata if PaymentIntent doesn't have it
                updateData.application_fee_cents = applicationFeeCentsFromMetadata;
              }
              // If neither is available, don't update application_fee_cents (preserve existing DB value)
              
              console.log('[stripe-webhook] Update data:', updateData);
              
              const { data, error } = await admin
                .from('requests')
                .update(updateData)
                .eq('id', requestId)
                .select();
                
              if (error) {
                console.error('[stripe-webhook] Database update error:', error);
              } else {
                console.log('[stripe-webhook] Database update successful:', data);
                
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

              // Backfill customer email and ensure profile exists for the user
              try {
                const { data: reqRow } = await admin.from('requests').select('user_id').eq('id', requestId).maybeSingle();
                const userId = (reqRow as any)?.user_id as string | undefined;
                if (userId) {
                const updates: any = { id: userId };
                if (customerEmail) updates.email = customerEmail;
                await admin.from('profiles').upsert(updates, { onConflict: 'id' });
                }
              } catch {}

              // Move any temp uploads belonging to this session into permanent user/request folder
              try {
                if (uploadSessionId) {
                  const bucket = process.env.NEXT_PUBLIC_SUPABASE_REQUEST_MEDIA_BUCKET || 'request-media';
                  const { data: files } = await (admin.storage as any).from(bucket).list(`temp-uploads/${uploadSessionId}`, { limit: 100, offset: 0, sortBy: { column: 'name', order: 'asc' }, search: '' });
                  if (Array.isArray(files) && files.length > 0) {
                    // Determine user_id to build permanent path
                    let userId: string | undefined = undefined;
                    try {
                      const { data: reqRow } = await admin.from('requests').select('user_id').eq('id', requestId).maybeSingle();
                      userId = (reqRow as any)?.user_id as string | undefined;
                    } catch {}
                    const targetBase = userId ? `users/${userId}/requests/${requestId}` : `requests/${requestId}`;

                    // Recursively move files from temp-uploads/uploadSessionId/** to permanent path
                    const moveRecursive = async (prefix: string, destBase: string) => {
                      const { data: entries } = await (admin.storage as any).from(bucket).list(prefix);
                      for (const entry of entries || []) {
                        if (entry.id) {
                          // file
                          const fromPath = `${prefix}/${entry.name}`;
                          const toPath = `${destBase}/${entry.name}`;
                          await (admin.storage as any).from(bucket).move(fromPath, toPath);
                        } else {
                          // folder
                          await moveRecursive(`${prefix}/${entry.name}`, `${destBase}/${entry.name}`);
                        }
                      }
                    };

                    await moveRecursive(`temp-uploads/${uploadSessionId}`, targetBase);
                    // Optionally delete the temp folder (move removes originals)
                  }
                }
              } catch (mvErr) {
                console.error('move temp uploads error', mvErr);
              }

              // Move avatar from avatars temp path to a permanent user path and update profile.avatar_url
              try {
                if (uploadSessionId) {
                  const avatarsBucket = process.env.NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET || 'avatars';
                  // Find avatar file under avatars/temp-uploads/<session>/avatar/ or /selfie/ (legacy)
                  const { data: avatarEntries } = await (admin.storage as any).from(avatarsBucket).list(`temp-uploads/${uploadSessionId}/avatar`);
                  const { data: selfieEntries } = await (admin.storage as any).from(avatarsBucket).list(`temp-uploads/${uploadSessionId}/selfie`);
                  const entries = [...(avatarEntries || []), ...(selfieEntries || [])];
                  if (Array.isArray(entries) && entries.length > 0) {
                    // Determine user_id from request
                    let userIdForAvatar: string | undefined = undefined;
                    try {
                      const { data: reqRow } = await admin.from('requests').select('user_id').eq('id', requestId).maybeSingle();
                      userIdForAvatar = (reqRow as any)?.user_id as string | undefined;
                    } catch {}
                    const first = entries.find((e: any) => e?.id) || entries[0];
                    const fromPath = first.name.includes('/avatar/') ? 
                      `temp-uploads/${uploadSessionId}/avatar/${first.name}` : 
                      `temp-uploads/${uploadSessionId}/selfie/${first.name}`;
                    const toPath = userIdForAvatar ? `users/${userIdForAvatar}/avatar/${first.name}` : `requests/${requestId}/avatar/${first.name}`;
                    await (admin.storage as any).from(avatarsBucket).move(fromPath, toPath);
                    // Update profile.avatar_url to object path (bucket-relative)
                    if (userIdForAvatar) {
                      await admin.from('profiles').update({ avatar_url: toPath }).eq('id', userIdForAvatar);
                    }
                  }
                }
              } catch (avatarErr) {
                console.error('avatar move/update error', avatarErr);
              }
            }
          }
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
        // TODO: handle async payment success
        break;
      case 'checkout.session.async_payment_failed':
        // TODO: handle async payment failure
        break;
      case 'charge.refunded':
      case 'charge.refund.updated':
        // TODO: mark review request as refunded
        break;
      default:
        break;
    }
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Webhook error' }), { status: 400 });
  }
}


