import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    console.log('🚀 [CHECKOUT] Starting checkout session creation...');
    
    const body = await req.json();
    const { creatorId, creatorSlug, reviewPayload, requestId, uploadSessionId, fallbackUserId, fallbackEmail, fallbackFullName } = body || {};
    
    console.log('📋 [CHECKOUT] Request data:', {
      creatorId,
      creatorSlug,
      fallbackUserId,
      fallbackEmail,
      fallbackFullName,
      uploadSessionId,
      hasReviewPayload: !!reviewPayload
    });
    
    if (!creatorId && !creatorSlug) {
      console.error('❌ [CHECKOUT] Missing creatorId or creatorSlug');
      return new Response(JSON.stringify({ error: 'Missing creatorId or creatorSlug' }), { status: 400 });
    }

    // Check if user is trying to buy from themselves (prevent self-purchase)
    if (fallbackUserId) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON || '';
      if (url && key) {
        const admin = createClient(url, key);
        
        // Get the reviewer's ID we're trying to buy from
        let targetReviewerId = creatorId;
        if (!targetReviewerId && creatorSlug) {
          const { data: profile } = await admin
            .from('profiles')
            .select('id')
            .eq('username', creatorSlug)
            .eq('is_reviewer', 'approved')
            .maybeSingle();
          targetReviewerId = (profile as any)?.id;
        }
        
        // Check if the current user is a reviewer trying to buy from themselves
        if (targetReviewerId === fallbackUserId) {
          const { data: userProfile } = await admin
            .from('profiles')
            .select('is_reviewer')
            .eq('id', fallbackUserId)
            .maybeSingle();
          
          if ((userProfile as any)?.is_reviewer === 'approved') {
            return new Response(JSON.stringify({ 
              error: 'Reviewers cannot purchase reviews for their own account. Please select a different reviewer.' 
            }), { status: 400 });
          }
        }
      }
    }

    const secret = process.env.STRIPE_SECRET_KEY || '';
    if (!secret) {
      console.error('❌ [CHECKOUT] Missing STRIPE_SECRET_KEY');
      return new Response(JSON.stringify({ error: 'Missing STRIPE_SECRET_KEY' }), { status: 500 });
    }
    console.log('✅ [CHECKOUT] Stripe secret key found');
    const stripe = new Stripe(secret);
    // Optionally resolve creatorId from slug
    let resolvedCreatorId = creatorId as string | undefined;
    if (!resolvedCreatorId && creatorSlug) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON || '';
      if (url && key) {
        const admin = createClient(url, key);
        const { data } = await admin
          .from('profiles')
          .select('id')
          .eq('username', creatorSlug)
          .maybeSingle();
        resolvedCreatorId = (data as any)?.id as string | undefined;
      }
    }

    // Require a valid reviewer id
    if (!resolvedCreatorId) {
      console.error('❌ [CHECKOUT] Reviewer not found');
      return new Response(JSON.stringify({ error: 'Reviewer not found. Please select a valid reviewer.' }), { status: 400 });
    }
    
    console.log('✅ [CHECKOUT] Resolved creator ID:', resolvedCreatorId);

    // Determine price (in cents) from creators_public or profiles.hourly_rate
    // hourly_rate is what the customer pays, not what the reviewer gets
    let priceCents = 1000; // default $10 fallback
    let connectAccountId: string | undefined = undefined;
    // Standard fee: 20% for all reviewers (2000 basis points)
    const auroFeeBps = 2000;
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON || '';
      if (url && key) {
        const admin = createClient(url, key);
        // Try profiles table by slug first, and fetch connect account id
        if (creatorSlug) {
          const { data: profile } = await admin
            .from('profiles')
            .select('id, hourly_rate, stripe_connect_account_id')
            .eq('username', creatorSlug)
            .eq('is_reviewer', 'approved')
            .maybeSingle();
          if (profile) {
            const hr = Number((profile as any)?.hourly_rate);
            if (!isNaN(hr) && hr > 0) {
              priceCents = Math.round(hr * 100); // Convert dollars to cents
            }
            connectAccountId = (profile as any)?.stripe_connect_account_id || undefined;
          }
        }
        // If still default, try profiles by profile_id
        if (priceCents === 1000 && resolvedCreatorId) {
          const { data: profile2 } = await admin
            .from('profiles')
            .select('hourly_rate, stripe_connect_account_id')
            .eq('id', resolvedCreatorId)
            .eq('is_reviewer', 'approved')
            .maybeSingle();
          if (profile2) {
            const hr2 = Number((profile2 as any)?.hourly_rate);
            if (!isNaN(hr2) && hr2 > 0) {
              priceCents = Math.round(hr2 * 100); // Convert dollars to cents
            }
            connectAccountId = (profile2 as any)?.stripe_connect_account_id || undefined;
          }
        }
        // If connect account not found yet, try profiles table by profile id
        if (!connectAccountId && resolvedCreatorId) {
          try {
            const { data: profile } = await admin
              .from('profiles')
              .select('stripe_connect_account_id')
              .eq('id', resolvedCreatorId)
              .eq('is_reviewer', 'approved')
              .maybeSingle();
            connectAccountId = (profile as any)?.stripe_connect_account_id || undefined;
          } catch {}
        }
      }
    } catch {}

    // Allow anonymous users to create requests - they will authenticate during the flow
    // if (!fallbackUserId) {
    //   return new Response(JSON.stringify({ error: 'You must be signed in to request a review. Please sign in and try again.' }), { status: 401 });
    // }

    // Prevent self-reviews (requester and reviewer cannot be the same)
    if (fallbackUserId && resolvedCreatorId && String(fallbackUserId) === String(resolvedCreatorId)) {
      return new Response(JSON.stringify({ error: 'You cannot request a review from yourself. Please choose a different reviewer.' }), { status: 400 });
    }

    // Ensure resolvedCreatorId is a valid reviewer with completed profile
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON || '';
      if (url && key) {
        const admin = createClient(url, key);
        const { data: reviewerRow } = await admin
          .from('profiles')
          .select('id, is_reviewer, hourly_rate')
          .eq('id', resolvedCreatorId)
          .maybeSingle();
        
        if (!reviewerRow) {
          return new Response(JSON.stringify({ error: 'Reviewer not found.' }), { status: 404 });
        }
        
        if ((reviewerRow as any)?.is_reviewer !== 'approved') {
          return new Response(JSON.stringify({ error: 'Selected user is not an approved reviewer. Please choose another reviewer.' }), { status: 400 });
        }
        
        // Check if reviewer has completed their profile (has a rate set)
        const hourlyRate = (reviewerRow as any)?.hourly_rate;
        if (!hourlyRate || hourlyRate <= 0) {
          return new Response(JSON.stringify({ error: 'This reviewer has not completed their profile yet. They need to set their review price before accepting requests.' }), { status: 400 });
        }
      }
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Failed to validate reviewer profile. Please try again.' }), { status: 500 });
    }

    // CRITICAL: Input validation and sanitization
    if (creatorId && typeof creatorId !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid creatorId format' }), { status: 400 });
    }
    if (creatorSlug && typeof creatorSlug !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid creatorSlug format' }), { status: 400 });
    }
    if (requestId && (typeof requestId !== 'string' || requestId.length < 10)) {
      return new Response(JSON.stringify({ error: 'Invalid requestId format' }), { status: 400 });
    }
    
    // Sanitize inputs
    const sanitizedCreatorSlug = creatorSlug ? creatorSlug.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50) : undefined;
    const sanitizedUploadSessionId = uploadSessionId ? uploadSessionId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100) : undefined;

    // Create a request record on the server if not provided by client
    let ensuredRequestId: string | undefined = requestId as string | undefined;
    try {
      if (!ensuredRequestId) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON || '';
        if (url && key) {
          const admin = createClient(url, key);
          // Ensure user profile exists and set basic fields
          try {
            const userId = fallbackUserId as string | undefined;
            if (userId) {
              const fullName = (reviewPayload?.fullName || (reviewPayload?.consent?.fullName) || fallbackFullName) as string | undefined;
              const updates: any = { id: userId };
              if (fallbackEmail) updates.email = fallbackEmail;
              if (fullName) updates.full_name = fullName;
              // Profile picture will be used from the user's existing profile
              // No need to set avatar_url here as it should already exist in the profile
              await admin.from('profiles').upsert(updates, { onConflict: 'id' });
            }
          } catch {}
          const allPhotos = [
            ...((reviewPayload?.photos?.outfits as string[]) || []),
            ...((reviewPayload?.photos?.roomTourPhotos as string[]) || []),
            ...((reviewPayload?.photos?.datingProfileScreenshots as string[]) || []),
          ];
          const notes = {
            message: reviewPayload?.message,
            media: reviewPayload?.photos,
            consent: reviewPayload?.consent,
            // No longer using selfieUrl - profile picture will be used instead
          };
          const insertPayload: any = {
            user_id: fallbackUserId || null,
            influencer_id: resolvedCreatorId || null,
            photos: allPhotos,
            notes: JSON.stringify(notes),
            status: 'pending',
            // Persist consent flag explicitly for app logic
            consent_social: !!(reviewPayload?.consent?.shareOnSocial),
          };
          let inserted: any = null;
          let insertError: any = null;
          try {
            const res = await admin
              .from('requests')
              .insert([insertPayload])
              .select('id')
              .single();
            inserted = res.data; insertError = res.error;
          } catch (e: any) {
            insertError = e;
          }
          if (insertError && String(insertError?.message || '').includes("consent_social")) {
            // Retry without consent_social for older schemas
            try {
              const retryPayload = { ...insertPayload } as any;
              delete retryPayload.consent_social;
              const res2 = await admin
                .from('requests')
                .insert([retryPayload])
                .select('id')
                .single();
              inserted = res2.data; insertError = res2.error;
            } catch (e2: any) {
              insertError = e2;
            }
          }
          if (insertError) throw insertError;
          ensuredRequestId = (inserted as any)?.id as string | undefined;
          
          // Send notification to reviewer about new request
          // IMPORTANT: Only send to the reviewer (influencer_id), NOT the reviewee (user_id)
          if (ensuredRequestId) {
            try {
              // Fetch the request to get the actual influencer_id (reviewer) from the database
              const { data: requestData } = await admin
                .from('requests')
                .select('influencer_id, user_id')
                .eq('id', ensuredRequestId)
                .maybeSingle();
              
              const reviewerId = (requestData as any)?.influencer_id as string | undefined;
              const revieweeId = (requestData as any)?.user_id as string | undefined;
              
              // Multiple safety checks: ensure we have a reviewer ID, it's not the same as the reviewee,
              // and the reviewer is actually an approved reviewer
              if (reviewerId && revieweeId && reviewerId !== revieweeId && reviewerId.trim() !== revieweeId.trim()) {
                // Get reviewer's profile to verify they are an approved reviewer and get push token
                const { data: reviewerProfile } = await admin
                  .from('profiles')
                  .select('push_token, is_reviewer, id')
                  .eq('id', reviewerId)
                  .maybeSingle();
                
                // Double-check: verify this profile is actually the reviewer (not reviewee) and is approved
                if (reviewerProfile && reviewerProfile.id === reviewerId && reviewerProfile.id !== revieweeId && reviewerProfile.is_reviewer === 'approved') {
                  if (reviewerProfile.push_token) {
                    console.log('[create-session] Sending notification to reviewer', {
                      reviewerId,
                      revieweeId,
                      requestId: ensuredRequestId,
                      hasPushToken: !!reviewerProfile.push_token,
                    });
                    
                    // Send push notification via Expo API to the REVIEWER only
                    await fetch('https://exp.host/--/api/v2/push/send', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Accept-Encoding': 'gzip, deflate',
                      },
                      body: JSON.stringify({
                        to: reviewerProfile.push_token,
                        sound: 'default',
                        title: 'New Review Request! 🎉',
                        body: 'Someone just requested a review from you!',
                        data: {
                          type: 'new_request',
                          requestId: ensuredRequestId,
                        },
                        priority: 'high',
                      }),
                    }).catch(err => console.error('Failed to send new request notification:', err));
                  } else {
                    console.log('[create-session] Reviewer has no push token, skipping notification', {
                      reviewerId,
                      requestId: ensuredRequestId,
                    });
                  }
                } else {
                  console.warn('[create-session] Skipping notification: reviewer validation failed', {
                    reviewerId,
                    revieweeId,
                    reviewerProfileId: reviewerProfile?.id,
                    isReviewer: reviewerProfile?.is_reviewer,
                    requestId: ensuredRequestId,
                  });
                }
              } else {
                console.warn('[create-session] Skipping notification: invalid reviewer ID or reviewer is same as reviewee', {
                  reviewerId,
                  revieweeId,
                  requestId: ensuredRequestId,
                });
              }
            } catch (notifError) {
              // Don't fail the request creation if notification fails
              console.error('Error sending notification:', notifError);
            }
          }
        }
      }
    } catch (e) {
      return new Response(JSON.stringify({ error: `Failed to create request: ${(e as any)?.message || 'unknown'}` }), { status: 400 });
    }

    // Compute application fee from auroFeeBps based on customer price
    // SIMPLE MODEL: Customer pays X, Reviewer gets 80%, Auro absorbs Stripe fee
    // Standard fee: 20% for all reviewers (2000 basis points)
    const applicationFeeCents = Math.floor((priceCents * auroFeeBps) / 10000);
    
    // Ensure application fee doesn't exceed the total amount
    const finalApplicationFeeCents = Math.min(applicationFeeCents, priceCents - 50); // Leave at least 50 cents for the creator

    // If we have a connected account, create a Direct Charge (session created on connected account)
    // so Stripe fees are charged to the connected account and the platform collects the application fee.
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: fallbackEmail || undefined,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'Auro Review Request' },
            unit_amount: priceCents,
          },
          quantity: 1,
        },
      ],
      // Payment held in escrow until review completion
      // No immediate transfer - funds will be distributed when review is completed
      payment_intent_data: undefined,
      metadata: {
        request_id: ensuredRequestId || '',
        creator_id: resolvedCreatorId || '',
        creator_slug: sanitizedCreatorSlug || '',
        upload_session_id: sanitizedUploadSessionId || '',
        auro_fee_cents: finalApplicationFeeCents.toString(),
        auro_fee_bps: auroFeeBps.toString(), // Always 2000 (20%) for all reviewers
      },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://appauro.com'}/checkout/success?rid={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://appauro.com'}/checkout/cancel`,
    };

    // Destination charges: opt-in via STRIPE_CONNECT_DESTINATION_CHARGES=true and a Connect-ready account.
    let useConnectDestination = process.env.STRIPE_CONNECT_DESTINATION_CHARGES === 'true';
    let connectReady = false;
    if (useConnectDestination && connectAccountId) {
      try {
        const acct = await stripe.accounts.retrieve(connectAccountId);
        connectReady = !!(acct.charges_enabled && acct.details_submitted);
        if (!connectReady) {
          console.warn('[create-session] Connect account not ready (charges_enabled/details_submitted):', connectAccountId);
        }
      } catch (acctErr) {
        console.warn('[create-session] Could not verify Connect account; using platform checkout', acctErr);
        useConnectDestination = false;
      }
    }
    if (useConnectDestination && connectAccountId && connectReady) {
      sessionParams.payment_intent_data = {
        transfer_data: {
          destination: connectAccountId as string,
        },
        application_fee_amount: finalApplicationFeeCents,
      };
      console.log('[create-session] Using destination charge with Connect account:', connectAccountId);
    } else {
      console.log(
        '[create-session] Using platform checkout (set STRIPE_CONNECT_DESTINATION_CHARGES=true and complete Connect onboarding to enable destination charges)'
      );
    }
    
    console.log('[create-session] ===== CREATING STRIPE CHECKOUT SESSION =====');
    console.log('[create-session] Session params:', JSON.stringify(sessionParams, null, 2));
    
    const session = await stripe.checkout.sessions.create(sessionParams);
    
    console.log('[create-session] Session created successfully');
    console.log('[create-session] Session ID:', session.id);
    console.log('[create-session] Session URL:', session.url);
    console.log('[create-session] Request ID:', ensuredRequestId);
    console.log('[create-session] Session details:', {
      id: session.id,
      payment_status: session.payment_status,
      amount_total: session.amount_total,
      currency: session.currency,
      mode: session.mode,
      payment_intent: session.payment_intent,
      customer_email: session.customer_email,
      success_url: session.success_url,
      cancel_url: session.cancel_url
    });
    
    // Log the Stripe secret key type to verify we're using test keys
    console.log('[create-session] Stripe key type:', secret.startsWith('sk_test_') ? 'TEST' : 'LIVE');
    console.log('[create-session] Stripe key prefix:', secret.substring(0, 20) + '...');
    
    // Get the account ID from the Stripe key to see which account we're using
    try {
      const account = await stripe.accounts.retrieve();
      console.log('[create-session] Stripe account ID:', account.id);
      console.log('[create-session] Stripe account type:', account.type);
      console.log('[create-session] Stripe account country:', account.country);
    } catch (accountError) {
      console.log('[create-session] Could not retrieve account info:', accountError);
    }

    // Store computed financial fields on the request for later UI
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON || '';
      if (url && key && ensuredRequestId) {
        const admin = createClient(url, key);
        await admin
          .from('requests')
          .update({
            amount_cents: priceCents, // Customer pays this
            application_fee_cents: finalApplicationFeeCents,
            auro_fee_bps: auroFeeBps, // Always 2000 (20%) for all reviewers
            stripe_connect_account_id: connectAccountId || null,
          })
          .eq('id', ensuredRequestId);
      }
    } catch {}

    return new Response(JSON.stringify({ url: session.url, reviewRequestId: session.id }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Failed to create session' }), { status: 400 });
  }
}


