import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY || '';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  const stripe = new Stripe(secret);
  const body = await req.text();
  const sig = (req.headers.get('stripe-signature') || '') as string;
  try {
    const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    console.log('[stripe-webhook] event', event.type);
    switch (event.type) {
      case 'checkout.session.completed':
        try {
          const session = event.data.object as Stripe.Checkout.Session;
          const metadata = (session.metadata || {}) as Record<string, string>;
          const requestId = metadata.request_id;
          const uploadSessionId = metadata.upload_session_id;
          const customerEmail = (session.customer_details as any)?.email || (session as any)?.customer_email || '';
          if (requestId) {
            const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
            const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
            if (url && key) {
              const admin = createClient(url, key);
              const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent as any)?.id;
              await admin
                .from('requests')
                .update({ status: 'paid', payment_status: 'paid', stripe_session_id: session.id, stripe_payment_intent_id: paymentIntentId || null })
                .eq('id', requestId);

              // Backfill customer email and ensure profile exists for the user
              try {
                const { data: reqRow } = await admin.from('requests').select('user_id').eq('id', requestId).maybeSingle();
                const userId = (reqRow as any)?.user_id as string | undefined;
                if (userId) {
                const updates: any = { id: userId, updated_at: new Date().toISOString() };
                // if (customerEmail) updates.email = customerEmail;  // Email column doesn't exist
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

              // Move selfie from avatars temp path to a permanent user path and update profile.avatar_url
              try {
                if (uploadSessionId) {
                  const avatarsBucket = process.env.NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET || 'avatars';
                  // Find selfie file under avatars/temp-uploads/<session>/selfie/
                  const { data: selfieEntries } = await (admin.storage as any).from(avatarsBucket).list(`temp-uploads/${uploadSessionId}/selfie`);
                  if (Array.isArray(selfieEntries) && selfieEntries.length > 0) {
                    // Determine user_id from request
                    let userIdForAvatar: string | undefined = undefined;
                    try {
                      const { data: reqRow } = await admin.from('requests').select('user_id').eq('id', requestId).maybeSingle();
                      userIdForAvatar = (reqRow as any)?.user_id as string | undefined;
                    } catch {}
                    const first = selfieEntries.find((e: any) => e?.id) || selfieEntries[0];
                    const fromPath = `temp-uploads/${uploadSessionId}/selfie/${first.name}`;
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
          console.error('webhook update error', e);
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


