import type { SupabaseClient } from '@supabase/supabase-js';
import { INTERNAL_AURO_HEADER, getInternalJobSecret } from '@/lib/internal-fetch-secret';

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
  if ((row as { status: string }).status !== 'paid') {
    throw new Error('Cannot accept until payment is completed');
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
    .select('id,status,influencer_id')
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

  const secret = getInternalJobSecret();
  if (secret) {
    try {
      const res = await fetch(`${serverOrigin()}/api/payments/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [INTERNAL_AURO_HEADER]: secret,
        },
        body: JSON.stringify({
          requestId,
          reason: 'requested_by_customer',
          partial: false,
        }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        console.error('[serverDenyReviewRequest] refund failed', res.status, t);
      }
    } catch (e) {
      console.error('[serverDenyReviewRequest] refund fetch error', e);
    }
  } else {
    console.warn('[serverDenyReviewRequest] CRON_SECRET unset; skipping automatic refund call');
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
    review: {
      ratings: { overall: number; [key: string]: unknown };
      feedback: { [key: string]: unknown };
    };
    videoUrl?: string | null;
    imageUrl?: string | null;
  }
) {
  const { requestId, review, videoUrl, imageUrl } = params;

  if (!requestId || typeof requestId !== 'string' || requestId.length < 10) {
    throw new Error('Invalid request ID');
  }
  if (!review?.ratings || typeof review.ratings.overall !== 'number' || review.ratings.overall < 1 || review.ratings.overall > 10) {
    throw new Error('Overall rating must be between 1 and 10');
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

  const withMedia = {
    ...review,
    media: { videoUrl: videoUrl ?? null, imageUrl: imageUrl ?? null },
  };

  const { data, error } = await admin
    .from('requests')
    .update({ review: withMedia, status: 'completed' })
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

  if (row.influencer_id && row.influencer_id !== row.user_id) {
    try {
      await fetch(`${serverOrigin()}/api/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: row.influencer_id,
          title: 'Review Submitted! ✅',
          body: 'Your review has been submitted! The reviewee can now see your feedback.',
          data: { type: 'review_submitted', requestId },
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
