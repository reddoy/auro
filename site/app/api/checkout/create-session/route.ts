import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { creatorId, creatorSlug, reviewPayload, requestId, uploadSessionId, fallbackUserId, fallbackEmail, fallbackFullName } = body || {};
    if (!creatorId && !creatorSlug) {
      return new Response(JSON.stringify({ error: 'Missing creatorId or creatorSlug' }), { status: 400 });
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
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON || '';
      if (url && key) {
        const admin = createClient(url, key);
        // Try creators_public.price_cents by slug first
        if (creatorSlug) {
          const { data: cp } = await admin
            .from('creators_public')
            .select('price_cents')
            .eq('slug', creatorSlug)
            .maybeSingle();
          const pc = (cp as any)?.price_cents;
          if (typeof pc === 'number' && pc > 0) {
            priceCents = pc;
          }
        }
        // If still default, try creators_public by profile_id
        if (priceCents === 1000 && resolvedCreatorId) {
          const { data: cp2 } = await admin
            .from('creators_public')
            .select('price_cents')
            .eq('profile_id', resolvedCreatorId)
            .maybeSingle();
          const pc2 = (cp2 as any)?.price_cents;
          if (typeof pc2 === 'number' && pc2 > 0) {
            priceCents = pc2;
          }
        }
        // Fallback to profiles.hourly_rate (dollars) → cents
        if (priceCents === 1000) {
          if (resolvedCreatorId) {
            const { data: profById } = await admin
              .from('profiles')
              .select('hourly_rate')
              .eq('id', resolvedCreatorId)
              .maybeSingle();
            const hr = Number((profById as any)?.hourly_rate);
            if (!isNaN(hr) && hr > 0) priceCents = Math.round(hr * 100);
          } else if (creatorSlug) {
            const { data: profBySlug } = await admin
              .from('profiles')
              .select('hourly_rate')
              .eq('username', creatorSlug)
              .maybeSingle();
            const hr2 = Number((profBySlug as any)?.hourly_rate);
            if (!isNaN(hr2) && hr2 > 0) priceCents = Math.round(hr2 * 100);
          }
        }
      }
    } catch {}

    // Prevent self-reviews (requester and reviewer cannot be the same)
    if (fallbackUserId && resolvedCreatorId && String(fallbackUserId) === String(resolvedCreatorId)) {
      return new Response(JSON.stringify({ error: 'You cannot request a review from your own reviewer account.' }), { status: 400 });
    }

    // Ensure resolvedCreatorId is a valid reviewer (profiles.is_reviewer = true)
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON || '';
      if (url && key) {
        const admin = createClient(url, key);
        const { data: reviewerRow } = await admin
          .from('profiles')
          .select('id, is_reviewer')
          .eq('id', resolvedCreatorId)
          .maybeSingle();
        if (!reviewerRow || !(reviewerRow as any)?.is_reviewer) {
          return new Response(JSON.stringify({ error: 'Selected user is not a reviewer. Please choose another reviewer.' }), { status: 400 });
        }
      }
    } catch {}

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
              // Apply selfie as avatar if provided
              if (reviewPayload?.selfieUrl) {
                // Store only the object path for avatars bucket
                const raw = reviewPayload.selfieUrl as string;
                let path = raw;
                try {
                  const urlObj = new URL(raw);
                  const m = urlObj.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/);
                  if (m) {
                    const bucket = m[1];
                    const objPath = decodeURIComponent(m[2]);
                    if (bucket === (process.env.NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET || 'avatars')) {
                      path = objPath;
                    }
                  }
                } catch {}
                updates.avatar_url = path;
              }
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
            selfieUrl: reviewPayload?.selfieUrl || null,
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
          const { data: inserted, error: insertError } = await admin
            .from('requests')
            .insert([insertPayload])
            .select('id')
            .single();
          if (insertError) throw insertError;
          ensuredRequestId = (inserted as any)?.id as string | undefined;
        }
      }
    } catch (e) {
      return new Response(JSON.stringify({ error: `Failed to create request: ${(e as any)?.message || 'unknown'}` }), { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
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
      metadata: {
        request_id: ensuredRequestId || '',
        creator_id: resolvedCreatorId || '',
        creator_slug: creatorSlug || '',
        upload_session_id: uploadSessionId || '',
      },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://appauro.com'}/checkout/success?rid={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://appauro.com'}/checkout/cancel`,
    });

    return new Response(JSON.stringify({ url: session.url, reviewRequestId: session.id }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Failed to create session' }), { status: 400 });
  }
}


