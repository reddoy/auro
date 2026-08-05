import { requireAdmin } from '@/lib/admin-server';
import { extractPhone, formatDisplayName } from '@/lib/admin-display';
import { signStoragePath, signStoragePaths } from '@/lib/admin-storage';

export const dynamic = 'force-dynamic';

const PROFILE_DETAIL =
  'id, email, username, first_name, last_name, avatar_url, bio, preferences, is_reviewer, stripe_connect_account_id, created_at';

type ProfileRow = {
  id: string;
  email: string | null;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  preferences: unknown;
  is_reviewer: string | null;
  stripe_connect_account_id: string | null;
  created_at: string | null;
};

function enrichParticipant(p: ProfileRow | null) {
  if (!p) return null;
  return {
    id: p.id,
    email: p.email,
    phone: extractPhone(p.preferences),
    username: p.username,
    displayName: formatDisplayName(p),
    first_name: p.first_name,
    last_name: p.last_name,
    bio: p.bio,
    avatar_url: p.avatar_url,
    is_reviewer: p.is_reviewer,
    stripe_connect_account_id: p.stripe_connect_account_id,
    created_at: p.created_at,
    profileUrl: p.username ? `/${encodeURIComponent(p.username)}` : null,
  };
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const gate = await requireAdmin(req);
  if (!gate.ok) {
    return new Response(JSON.stringify(gate.body), {
      status: gate.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing request id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { data: row, error } = await gate.admin
      .from('requests')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !row) {
      return new Response(JSON.stringify({ error: error?.message || 'Request not found' }), {
        status: error ? 500 : 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const [revieweeRes, reviewerRes, disputeRes] = await Promise.all([
      gate.admin.from('profiles').select(PROFILE_DETAIL).eq('id', row.user_id).maybeSingle(),
      gate.admin.from('profiles').select(PROFILE_DETAIL).eq('id', row.influencer_id).maybeSingle(),
      row.dispute_id
        ? gate.admin.from('disputes').select('*').eq('id', row.dispute_id).maybeSingle()
        : gate.admin.from('disputes').select('*').eq('request_id', id).maybeSingle(),
    ]);

    const photos = (row.photos as string[] | null) || [];
    const photoUrls = await signStoragePaths(gate.admin, photos);

    const review = row.review as { media?: { videoUrl?: string | null }; submittedAt?: string } | null;
    const videoPath = review?.media?.videoUrl;
    const videoUrl = videoPath ? await signStoragePath(gate.admin, videoPath) : null;
    const reviewSubmittedAt =
      typeof review?.submittedAt === 'string' && review.submittedAt.trim().length > 0
        ? review.submittedAt
        : null;
    const completedAt = row.fulfilled_at || reviewSubmittedAt;

    const revieweeProfile = revieweeRes.data as ProfileRow | null;
    const reviewerProfile = reviewerRes.data as ProfileRow | null;

    const revieweeAvatarUrl = revieweeProfile?.avatar_url
      ? await signStoragePath(gate.admin, revieweeProfile.avatar_url)
      : null;
    const reviewerAvatarUrl = reviewerProfile?.avatar_url
      ? await signStoragePath(gate.admin, reviewerProfile.avatar_url)
      : null;

    const reviewee = enrichParticipant(revieweeProfile);
    const reviewer = enrichParticipant(reviewerProfile);

    if (reviewee && revieweeAvatarUrl) {
      (reviewee as { avatarUrl?: string | null }).avatarUrl = revieweeAvatarUrl;
    }
    if (reviewer && reviewerAvatarUrl) {
      (reviewer as { avatarUrl?: string | null }).avatarUrl = reviewerAvatarUrl;
    }

    return new Response(
      JSON.stringify({
        request: {
          id: row.id,
          status: row.status,
          payment_status: row.payment_status,
          consent_social: row.consent_social,
          notes: row.notes,
          review: row.review,
          photoUrls,
          videoUrl,
          timeline: {
            created_at: row.created_at,
            accepted_at: row.accepted_at,
            denied_at: row.denied_at,
            fulfilled_at: completedAt,
            review_submitted_at: reviewSubmittedAt,
            deliver_by: row.deliver_by,
            accept_by: row.accept_by,
            review_viewed_at: row.review_viewed_at,
            payment_distributed_at: row.payment_distributed_at,
          },
          payment: {
            amount_cents: row.amount_cents,
            application_fee_cents: row.application_fee_cents,
            reviewer_amount_cents: row.reviewer_amount_cents,
            net_amount_cents: row.net_amount_cents,
            stripe_fee_cents: row.stripe_fee_cents,
            auro_fee_bps: row.auro_fee_bps,
            payment_distributed: row.payment_distributed,
            payment_distributed_at: row.payment_distributed_at,
            payment_distribution_attempts: row.payment_distribution_attempts,
            payment_distribution_error: row.payment_distribution_error,
            payment_distribution_failed_at: row.payment_distribution_failed_at,
            stripe_session_id: row.stripe_session_id,
            stripe_payment_intent_id: row.stripe_payment_intent_id,
            stripe_transfer_id: row.stripe_transfer_id,
            stripe_refund_id: row.stripe_refund_id,
            stripe_connect_account_id: row.stripe_connect_account_id,
            refund_status: row.refund_status,
            refund_reason: row.refund_reason,
            refunded_amount_cents: row.refunded_amount_cents,
            refunded_at: row.refunded_at,
            dispute_status: row.dispute_status,
            dispute_id: row.dispute_id,
          },
          reviewee,
          reviewer,
          dispute: disputeRes.data || null,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error';
    console.error('[admin/requests/[id]]', e);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
