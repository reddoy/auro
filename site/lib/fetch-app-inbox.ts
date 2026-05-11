import {
  getProfileById,
  getRequestsByReviewer,
  getRequestsByUser,
  getReviewerById,
  getUserProfile,
  signOutIfProfileRowMissing,
} from '@/lib/api';
import { getDisplayAvatarUrl } from '@/lib/avatar';
import { supabase } from '@/lib/supabase';
import type { DbRequestSummary, DbReviewerSummary, DbUserProfile } from '@/types';

export type AppInboxUserMap = Record<
  string,
  { id: string; displayName: string; avatarUrl?: string | null }
>;

export type AppInboxData = {
  profile: DbUserProfile & { is_reviewer?: string | null };
  isReviewer: boolean;
  requests: DbRequestSummary[];
  revMap: Record<string, DbReviewerSummary>;
  userMap: AppInboxUserMap;
  avatarResolved: Record<string, string>;
  /** Resolved display URL for the signed-in user's avatar (for Home). */
  userAvatarDisplayUrl: string | null;
  /** request_ids the signed-in user has already rated their reviewer for. */
  ratedRequestIds: Record<string, true>;
};

async function resolveAvatarBatch(
  entries: { id: string; raw: string | null | undefined }[],
  mergeKey: (id: string, url: string) => void
) {
  await Promise.all(
    entries.map(async ({ id, raw }) => {
      const cleaned = (raw || '').trim().replace(/^@+/, '');
      if (!cleaned) return;
      try {
        const url = await getDisplayAvatarUrl(cleaned);
        if (url) mergeKey(id, url);
      } catch {
        mergeKey(id, cleaned);
      }
    })
  );
}

/**
 * Loads inbox bundle for the signed-in user (requests + reviewer maps + avatar URLs).
 * Throws `Error('SIGNED_OUT')` after signing out when session/profile is invalid.
 */
export async function fetchAppInboxData(): Promise<AppInboxData> {
  if (!supabase) {
    throw new Error('SIGNED_OUT');
  }

  const orphaned = await signOutIfProfileRowMissing();
  if (orphaned) {
    throw new Error('SIGNED_OUT');
  }

  const profile = await getUserProfile();
  if (!profile?.id) {
    await supabase.auth.signOut();
    throw new Error('SIGNED_OUT');
  }

  const reviewerStatus = (profile as { is_reviewer?: string | null }).is_reviewer;
  const isReviewer = reviewerStatus === 'approved' || reviewerStatus === 'pending';

  let reqs: DbRequestSummary[] = [];
  if (isReviewer) {
    const [reviewerReqs, revieweeReqs] = await Promise.all([
      getRequestsByReviewer(profile.id),
      getRequestsByUser(profile.id),
    ]);
    const reqMap = new Map<string, DbRequestSummary>();
    [...reviewerReqs, ...revieweeReqs].forEach((req) => reqMap.set(req.id, req));
    reqs = Array.from(reqMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } else {
    reqs = await getRequestsByUser(profile.id);
  }

  const nextResolved: Record<string, string> = {};
  let revMap: Record<string, DbReviewerSummary> = {};
  let userMap: AppInboxUserMap = {};

  if (isReviewer) {
    const reviewerReqUserIds = Array.from(
      new Set(reqs.filter((r) => r.influencerId === profile.id).map((r) => r.userId).filter(Boolean))
    ) as string[];
    const revieweeReqReviewerIds = Array.from(
      new Set(reqs.filter((r) => r.userId === profile.id).map((r) => r.influencerId).filter(Boolean))
    );
    const [users, reviewers] = await Promise.all([
      Promise.all(reviewerReqUserIds.map((uid) => getProfileById(uid))),
      Promise.all(revieweeReqReviewerIds.map((id) => getReviewerById(String(id)))),
    ]);
    users.forEach((u) => {
      if (u) userMap[u.id] = u;
    });
    reviewers.forEach((rev) => {
      if (rev) revMap[rev.id] = rev;
    });
    await resolveAvatarBatch(
      users.filter(Boolean).map((u) => ({ id: u!.id, raw: u!.avatarUrl })),
      (id, url) => {
        nextResolved[`u:${id}`] = url;
      }
    );
    await resolveAvatarBatch(
      reviewers.filter(Boolean).map((r) => ({ id: r!.id, raw: r!.avatarUrl })),
      (id, url) => {
        nextResolved[`r:${id}`] = url;
      }
    );
  } else {
    const uniqueIds = Array.from(new Set(reqs.map((r) => r.influencerId).filter(Boolean)));
    const reviewers = await Promise.all(uniqueIds.map((id) => getReviewerById(String(id))));
    reviewers.forEach((rev) => {
      if (rev) revMap[rev.id] = rev;
    });
    userMap = {};
    await resolveAvatarBatch(
      reviewers.filter(Boolean).map((r) => ({ id: r!.id, raw: r!.avatarUrl })),
      (id, url) => {
        nextResolved[`r:${id}`] = url;
      }
    );
  }

  let userAvatarDisplayUrl: string | null = null;
  const raw = profile.avatarUrl ?? null;
  if (raw) {
    userAvatarDisplayUrl = (await getDisplayAvatarUrl(raw)) || null;
  }

  // Batch-load reviewer-review rows for completed requests where the signed-in
  // user is the reviewee, so the inbox can show a 'Rate your reviewer' pill.
  const ratedRequestIds: Record<string, true> = {};
  const completedRevieweeRequestIds = reqs
    .filter((r) => r.userId === profile.id && r.status === 'completed' && !r.archived_at)
    .map((r) => r.id);
  if (completedRevieweeRequestIds.length > 0 && supabase) {
    try {
      const { data: rated } = await supabase
        .from('reviewer_reviews')
        .select('request_id')
        .in('request_id', completedRevieweeRequestIds);
      (rated || []).forEach((row: { request_id: string }) => {
        ratedRequestIds[row.request_id] = true;
      });
    } catch {
      // non-blocking — pill simply won't render on first paint
    }
  }

  return {
    profile: profile as DbUserProfile & { is_reviewer?: string | null },
    isReviewer,
    requests: reqs,
    revMap,
    userMap,
    avatarResolved: nextResolved,
    userAvatarDisplayUrl,
    ratedRequestIds,
  };
}

export function summarizeRequestBuckets(requests: DbRequestSummary[]) {
  const active = requests.filter(
    (r) =>
      (r.status === 'pending' ||
        r.status === 'accepted' ||
        r.status === 'paid' ||
        r.status === 'in_progress' ||
        r.status === 'rejected') &&
      !r.archived_at
  ).length;
  const completed = requests.filter((r) => r.status === 'completed' && !r.archived_at).length;
  const archived = requests.filter((r) => !!r.archived_at).length;
  return { active, completed, archived };
}

export type NeedsAttentionItem = {
  id: string;
  href: string;
  title: string;
  subtitle: string;
  badge: string;
};

export function computeNeedsAttention(data: AppInboxData): NeedsAttentionItem[] {
  const uid = data.profile.id;
  const { requests, revMap, userMap } = data;

  const displayFor = (r: DbRequestSummary): string => {
    const asRev = r.influencerId === uid;
    if (asRev) {
      const u = r.userId ? userMap[r.userId] : undefined;
      return u?.displayName || 'Requester';
    }
    const rev = revMap[r.influencerId];
    return rev?.displayName || 'Reviewer';
  };

  const subtitleFor = (r: DbRequestSummary, asReviewer: boolean): string => {
    if (r.status === 'paid' && asReviewer) return 'Accept or decline to continue';
    if ((r.status === 'pending' || r.status === 'accepted') && !asReviewer)
      return 'Finish checkout from your email';
    if (r.status === 'in_progress') return asReviewer ? 'Submit your review when ready' : 'Your reviewer is working on this';
    return 'Needs your attention';
  };

  const badgeFor = (r: DbRequestSummary): string => {
    if (r.status === 'paid') return 'Paid';
    if (r.status === 'in_progress') return 'In progress';
    if (r.status === 'pending') return 'Pending';
    if (r.status === 'accepted') return 'Accepted';
    return r.status;
  };

  return requests
    .filter((r) => {
      if (r.archived_at) return false;
      const asReviewer = r.influencerId === uid;
      if (asReviewer && r.status === 'paid') return true;
      if (asReviewer && r.status === 'in_progress') return true;
      if (!asReviewer && (r.status === 'pending' || r.status === 'accepted')) return true;
      if (!asReviewer && r.status === 'in_progress') return true;
      return false;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8)
    .map((r) => {
      const asReviewer = r.influencerId === uid;
      const href = asReviewer ? `/app/requests/reviewer/${r.id}` : `/app/requests/review/${r.id}`;
      return {
        id: r.id,
        href,
        title: displayFor(r),
        subtitle: subtitleFor(r, asReviewer),
        badge: badgeFor(r),
      };
    });
}
