import type { SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { processRefund } from '@/lib/refund-server';

function serverOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'https://appauro.com';
}

function mapRequestRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    influencerId: row.influencer_id ?? row.influencerId,
    userId: row.user_id ?? row.userId,
    createdAt: row.created_at ?? row.createdAt,
    created_at: row.created_at ?? row.createdAt,
    status: row.status,
    photos: row.photos || [],
    notes: row.notes ?? null,
    review: row.review ?? null,
    consent_social: row.consent_social ?? undefined,
    archived_at:
      row.archived_at ??
      ((row as { archived_by_influencer?: boolean }).archived_by_influencer
        ? (row.created_at as string) || null
        : null),
    amount_cents: row.amount_cents ?? null,
    application_fee_cents: row.application_fee_cents ?? null,
    stripe_fee_cents: row.stripe_fee_cents ?? null,
    net_amount_cents: row.net_amount_cents ?? null,
    auro_fee_bps: row.auro_fee_bps ?? null,
    payment_distributed: row.payment_distributed ?? null,
    payment_distributed_at: row.payment_distributed_at ?? null,
    stripe_transfer_id: row.stripe_transfer_id ?? null,
    reviewer_amount_cents: row.reviewer_amount_cents ?? null,
    payment_distribution_error: row.payment_distribution_error ?? null,
    completed_at: row.completed_at ?? row.completedAt ?? null,
    payment_status: row.payment_status ?? row.paymentStatus ?? null,
    review_viewed_at: row.review_viewed_at ?? row.reviewViewedAt ?? null,
  };
}

const REQUEST_SELECT =
  'id,influencer_id,created_at,status,photos,review,user_id,notes,consent_social,archived_by_influencer,archived_at,amount_cents,application_fee_cents,stripe_fee_cents,net_amount_cents,auro_fee_bps,payment_distributed,payment_distributed_at,stripe_transfer_id,reviewer_amount_cents,payment_distribution_error,payment_status,review_viewed_at';

export async function serverAcceptReviewRequest(
  admin: SupabaseClient,
  actorUserId: string,
  requestId: string
) {
  const { data: row, error: readErr } = await admin
    .from('requests')
    .select('id,status,influencer_id')
    .eq('id', requestId)
    .maybeSingle();
  if (readErr) throw readErr;
  if (!row) throw new Error('Request not found');
  if ((row as { influencer_id: string }).influencer_id !== actorUserId) {
    throw new Error('Forbidden');
  }

  const status = (row as { status: string }).status;
  if (status === 'in_progress') {
    const { data: full, error: refetchErr } = await admin
      .from('requests')
      .select(REQUEST_SELECT)
      .eq('id', requestId)
      .maybeSingle();
    if (refetchErr) throw refetchErr;
    if (!full) throw new Error('Request not found');
    return mapRequestRow(full as Record<string, unknown>);
  }

  if (status !== 'paid') {
    if (status === 'rejected') {
      throw new Error('This request was declined and cannot be accepted');
    }
    if (status === 'completed') {
      throw new Error('This request is already completed');
    }
    if (status === 'refunded' || status === 'timeout') {
      throw new Error('This request is no longer available to accept');
    }
    throw new Error(
      `Cannot accept while the request is "${status}". If you already accepted, refresh the page.`
    );
  }
  const now = new Date();
  const updateData = {
    status: 'in_progress',
    accept_by: now.toISOString(),
    deliver_by: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(),
  };
  const { data, error } = await admin
    .from('requests')
    .update(updateData)
    .eq('id', requestId)
    .select(REQUEST_SELECT)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const refetched = await admin.from('requests').select(REQUEST_SELECT).eq('id', requestId).maybeSingle();
    if (!refetched.data) throw new Error('Request not found after update');
    return mapRequestRow(refetched.data as Record<string, unknown>);
  }
  return mapRequestRow(data as Record<string, unknown>);
}

export async function serverDenyReviewRequest(admin: SupabaseClient, actorUserId: string, requestId: string) {
  const { data: row, error: readErr } = await admin
    .from('requests')
    .select('id,status,influencer_id,user_id')
    .eq('id', requestId)
    .maybeSingle();
  if (readErr) throw readErr;
  if (!row) throw new Error('Request not found');
  if ((row as { influencer_id: string }).influencer_id !== actorUserId) {
    throw new Error('Forbidden');
  }
  if ((row as { status: string }).status !== 'paid') {
    throw new Error('Cannot deny until payment is completed');
  }

  const { data: updated, error: updErr } = await admin
    .from('requests')
    .update({ status: 'rejected' })
    .eq('id', requestId)
    .select(REQUEST_SELECT)
    .maybeSingle();
  if (updErr) throw updErr;

  // Refund the reviewee directly (no internal HTTP hop, no secret dependency).
  // The reviewer was never paid, so the platform balance funds the refund.
  const stripeKey = process.env.STRIPE_SECRET_KEY || '';
  if (stripeKey) {
    try {
      const stripe = new Stripe(stripeKey);
      const result = await processRefund(admin, stripe, {
        requestId,
        reason: 'requested_by_customer',
        partial: false,
      });
      if (!result.ok) {
        console.error('[serverDenyReviewRequest] refund failed', {
          requestId,
          error: result.error,
          errorType: result.errorType,
        });
      }
    } catch (e) {
      console.error('[serverDenyReviewRequest] refund error', e);
    }
  } else {
    console.error(
      '[serverDenyReviewRequest] STRIPE_SECRET_KEY missing; cannot auto-refund. Request marked rejected but reviewee refund must be issued manually.'
    );
  }

  // Notify the reviewee that their request was declined and refund is processing.
  const recipientId = (row as { user_id?: string }).user_id;
  if (recipientId && recipientId !== actorUserId) {
    try {
      await fetch(`${serverOrigin()}/api/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: recipientId,
          title: 'Request declined',
          body: 'Your reviewer declined this request. Your refund is processing and should appear on your card within a few business days.',
          data: { type: 'review_declined', requestId },
        }),
      }).catch((err) => console.error('[serverDenyReviewRequest] notification failed', err));
    } catch (e) {
      console.error('[serverDenyReviewRequest] notification error', e);
    }
  }

  if (!updated) {
    const refetched = await admin.from('requests').select(REQUEST_SELECT).eq('id', requestId).maybeSingle();
    if (!refetched.data) throw new Error('Request not found after update');
    return mapRequestRow(refetched.data as Record<string, unknown>);
  }
  return mapRequestRow(updated as Record<string, unknown>);
}

export async function serverSubmitReviewRequest(
  admin: SupabaseClient,
  actorUserId: string,
  params: {
    requestId: string;
    videoUrl: string;
  }
) {
  const { requestId, videoUrl } = params;

  if (!requestId || typeof requestId !== 'string' || requestId.length < 10) {
    throw new Error('Invalid request ID');
  }
  if (!videoUrl || typeof videoUrl !== 'string') {
    throw new Error('Video review is required');
  }

  const { data: existingRequest, error: exErr } = await admin
    .from('requests')
    .select('id,status,review,influencer_id,user_id')
    .eq('id', requestId)
    .maybeSingle();
  if (exErr) throw exErr;
  if (!existingRequest) throw new Error('Request not found');
  if ((existingRequest as { influencer_id: string }).influencer_id !== actorUserId) {
    throw new Error('Forbidden');
  }
  if (
    (existingRequest as { status: string }).status === 'completed' &&
    (existingRequest as { review: unknown }).review
  ) {
    const refetched = await admin.from('requests').select(REQUEST_SELECT).eq('id', requestId).maybeSingle();
    if (!refetched.data) throw new Error('Request not found');
    return mapRequestRow(refetched.data as Record<string, unknown>);
  }
  if (
    (existingRequest as { status: string }).status !== 'in_progress' &&
    (existingRequest as { status: string }).status !== 'paid'
  ) {
    throw new Error(`Cannot submit review for request with status: ${(existingRequest as { status: string }).status}`);
  }

  // Preserve any pre-existing review fields (e.g. draft metadata) and overwrite media.
  const priorReview = (existingRequest as { review: Record<string, unknown> | null }).review || {};
  const reviewPayload = {
    ...priorReview,
    media: { videoUrl, imageUrl: null },
    submittedAt: new Date().toISOString(),
  };

  const { data, error } = await admin
    .from('requests')
    .update({ review: reviewPayload, status: 'completed' })
    .eq('id', requestId)
    .in('status', ['in_progress', 'paid'])
    .select(REQUEST_SELECT)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    const refetched = await admin.from('requests').select(REQUEST_SELECT).eq('id', requestId).maybeSingle();
    if (!refetched.data) throw new Error('Request not found');
    return mapRequestRow(refetched.data as Record<string, unknown>);
  }

  const row = data as { influencer_id?: string; user_id?: string };

  // Notify the reviewee that their video review is ready to watch.
  if (row.user_id && row.user_id !== row.influencer_id) {
    try {
      await fetch(`${serverOrigin()}/api/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: row.user_id,
          title: 'Your review is ready',
          body: 'Your reviewer just submitted your video review. Tap to watch it.',
          data: { type: 'review_completed', requestId },
        }),
      }).catch((err) => console.error('[serverSubmitReviewRequest] notification failed', err));
    } catch (e) {
      console.error('[serverSubmitReviewRequest] notification error', e);
    }
  }

  try {
    const res = await fetch(`${serverOrigin()}/api/payments/distribute-reviewer-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId }),
    });
    const payoutBody = await res.json().catch(() => ({} as Record<string, unknown>));
    if (!res.ok) {
      console.error('[serverSubmitReviewRequest] distribute failed', {
        status: res.status,
        requestId,
        payoutBody,
      });
    } else if ((payoutBody as { held?: boolean }).held) {
      console.warn('[serverSubmitReviewRequest] payout held', {
        requestId,
        errorType: (payoutBody as { errorType?: string }).errorType || 'NO_CONNECT_ACCOUNT',
      });
    }
  } catch (e) {
    console.error('[serverSubmitReviewRequest] distribute fetch error', e);
  }

  return mapRequestRow(data as Record<string, unknown>);
}
