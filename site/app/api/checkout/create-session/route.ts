import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { creatorId, creatorSlug, reviewPayload, requestId, uploadSessionId, fallbackUserId, fallbackEmail, fallbackFullName } = body || {};
    if (!creatorId && !creatorSlug) {
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
            .eq('is_reviewer', true)
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
          
          if ((userProfile as any)?.is_reviewer) {
            return new Response(JSON.stringify({ 
              error: 'Reviewers cannot purchase reviews for their own account. Please select a different reviewer.' 
            }), { status: 400 });
          }
        }
      }
    }

    const secret = process.env.STRIPE_SECRET_KEY || '';
    if (!secret) {
      return new Response(JSON.stringify({ error: 'Missing STRIPE_SECRET_KEY' }), { status: 500 });
    }
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
      return new Response(JSON.stringify({ error: 'Reviewer not found. Please select a valid reviewer.' }), { status: 400 });
    }

    // Determine price (in cents) from creators_public or profiles.hourly_rate
    let priceCents = 1000; // default $10 fallback
    let connectAccountId: string | undefined = undefined;
    let auroFeeBps: number | undefined = undefined; // 15% founders (1500 bps) for first 100 creators; otherwise 20% (2000 bps)
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON || '';
      if (url && key) {
        const admin = createClient(url, key);
        // Try profiles table by slug first, and fetch connect account id
        if (creatorSlug) {
          const { data: profile } = await admin
            .from('profiles')
            .select('id, hourly_rate, stripe_connect_account_id, created_at')
            .eq('username', creatorSlug)
            .eq('is_reviewer', true)
            .maybeSingle();
          if (profile) {
            const hr = Number((profile as any)?.hourly_rate);
            if (!isNaN(hr) && hr > 0) {
              priceCents = Math.round(hr * 100); // Convert dollars to cents
            }
            connectAccountId = (profile as any)?.stripe_connect_account_id || undefined;
            // Compute founders discount eligibility: first 100 reviewers by created_at
            try {
              if ((profile as any)?.created_at) {
                const createdAt = (profile as any).created_at;
                const { count } = await admin
                  .from('profiles')
                  .select('id', { count: 'exact', head: true })
                  .eq('is_reviewer', true)
                  .lte('created_at', createdAt);
                auroFeeBps = typeof count === 'number' && count <= 100 ? 1500 : 2000;
              }
            } catch {}
          }
        }
        // If still default, try profiles by profile_id
        if (priceCents === 1000 && resolvedCreatorId) {
          const { data: profile2 } = await admin
            .from('profiles')
            .select('hourly_rate, stripe_connect_account_id, created_at')
            .eq('id', resolvedCreatorId)
            .eq('is_reviewer', true)
            .maybeSingle();
          if (profile2) {
            const hr2 = Number((profile2 as any)?.hourly_rate);
            if (!isNaN(hr2) && hr2 > 0) {
              priceCents = Math.round(hr2 * 100); // Convert dollars to cents
            }
            connectAccountId = (profile2 as any)?.stripe_connect_account_id || undefined;
            // Fallback founders eligibility if we did not compute above
            try {
              if (!auroFeeBps && (profile2 as any)?.created_at) {
                const createdAt = (profile2 as any).created_at;
                const { count } = await admin
                  .from('profiles')
                  .select('id', { count: 'exact', head: true })
                  .eq('is_reviewer', true)
                  .lte('created_at', createdAt);
                auroFeeBps = typeof count === 'number' && count <= 100 ? 1500 : 2000;
              }
            } catch {}
          }
        }
        // If connect account not found yet, try profiles table by profile id
        if (!connectAccountId && resolvedCreatorId) {
          try {
            const { data: profile } = await admin
              .from('profiles')
              .select('stripe_connect_account_id, created_at')
              .eq('id', resolvedCreatorId)
              .eq('is_reviewer', true)
              .maybeSingle();
            connectAccountId = (profile as any)?.stripe_connect_account_id || undefined;
            if (!auroFeeBps && profile && (profile as any)?.created_at) {
              const { count } = await admin
                .from('profiles')
                .select('id', { count: 'exact', head: true })
                .eq('is_reviewer', true)
                .lte('created_at', (profile as any).created_at);
              auroFeeBps = typeof count === 'number' && count <= 100 ? 1500 : 2000;
            }
          } catch {}
        }
        // Default auro fee bps to 2000 if not computed
        if (!auroFeeBps) {
          auroFeeBps = 2000;
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
        
        if (!(reviewerRow as any)?.is_reviewer) {
          return new Response(JSON.stringify({ error: 'Selected user is not a reviewer. Please choose another reviewer.' }), { status: 400 });
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
        }
      }
    } catch (e) {
      return new Response(JSON.stringify({ error: `Failed to create request: ${(e as any)?.message || 'unknown'}` }), { status: 400 });
    }

    // Compute application fee from auroFeeBps
    const applicationFeeCents = Math.floor((priceCents * (auroFeeBps || 2000)) / 10000);
    
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
        creator_slug: creatorSlug || '',
        upload_session_id: uploadSessionId || '',
        auro_fee_cents: finalApplicationFeeCents.toString(),
        auro_fee_bps: (auroFeeBps || 2000).toString(),
      },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.appauro.com'}/checkout/success?rid={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.appauro.com'}/checkout/cancel`,
    };

    // For now, create session without Connect to avoid platform requirement
    // TODO: Set up proper Stripe Connect platform in dashboard
    console.log('[create-session] ===== CREATING STRIPE CHECKOUT SESSION =====');
    console.log('[create-session] Session params:', JSON.stringify(sessionParams, null, 2));
    
    const session = await stripe.checkout.sessions.create(sessionParams);
    
    console.log('[create-session] Session created successfully');
    console.log('[create-session] Session ID:', session.id);
    console.log('[create-session] Session URL:', session.url);
    console.log('[create-session] Request ID:', ensuredRequestId);

    // Store computed financial fields on the request for later UI
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON || '';
      if (url && key && ensuredRequestId) {
        const admin = createClient(url, key);
        await admin
          .from('requests')
          .update({
            amount_cents: priceCents,
            application_fee_cents: finalApplicationFeeCents,
            auro_fee_bps: auroFeeBps || 2000,
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


