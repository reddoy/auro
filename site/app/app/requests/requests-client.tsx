'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  archiveRequest,
  getProfileById,
  getRequestsByReviewer,
  getRequestsByUser,
  getReviewerById,
  getUserProfile,
  unarchiveRequest,
} from '@/lib/api';
import { getDisplayAvatarUrl } from '@/lib/avatar';
import type { DbRequestSummary, DbReviewerSummary } from '@/types';
import StatusBadge from '@/components/app/StatusBadge';

function AvatarCircle({
  src,
  name,
  size = 56,
}: {
  src?: string | null;
  name: string;
  size?: number;
}) {
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 font-semibold text-white/90"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </div>
  );
}

export default function RequestsPageClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<DbRequestSummary[]>([]);
  const [revMap, setRevMap] = useState<Record<string, DbReviewerSummary>>({});
  const [userMap, setUserMap] = useState<
    Record<string, { id: string; displayName: string; avatarUrl?: string | null }>
  >({});
  const [avatarResolved, setAvatarResolved] = useState<Record<string, string>>({});
  const [userProfile, setUserProfile] = useState<{
    id: string;
    username?: string | null;
  } | null>(null);
  const [isReviewer, setIsReviewer] = useState(false);
  const [filter, setFilter] = useState<'active' | 'completed' | 'archived'>('active');
  const [initialLoad, setInitialLoad] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const loadingRef = useRef(loading);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  const resolveAvatars = useCallback(
    async (
      entries: { id: string; raw: string | null | undefined }[],
      mergeKey: (id: string, url: string) => void
    ) => {
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
    },
    []
  );

  const loadAll = useCallback(
    async (trigger: 'initial' | 'refresh' = 'initial') => {
      if (trigger === 'refresh') {
        if (loadingRef.current) return;
        setRefreshing(true);
      }
      try {
        const profile = await getUserProfile();
        if (!profile?.id) {
          setRequests([]);
          setUserProfile(null);
          return;
        }
        const reviewerStatus = (profile as { is_reviewer?: string | null }).is_reviewer;
        const reviewerMode =
          reviewerStatus === 'approved' || reviewerStatus === 'pending';
        setIsReviewer(reviewerMode);
        setUserProfile({
          id: profile.id,
          username: profile.username ?? undefined,
        });

        let reqs: DbRequestSummary[] = [];
        if (reviewerMode) {
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
        setRequests(reqs);

        const nextResolved: Record<string, string> = {};

        if (reviewerMode) {
          const reviewerReqUserIds = Array.from(
            new Set(
              reqs.filter((r) => r.influencerId === profile.id).map((r) => r.userId).filter(Boolean)
            )
          ) as string[];
          const revieweeReqReviewerIds = Array.from(
            new Set(
              reqs.filter((r) => r.userId === profile.id).map((r) => r.influencerId).filter(Boolean)
            )
          );
          const [users, reviewers] = await Promise.all([
            Promise.all(reviewerReqUserIds.map((uid) => getProfileById(uid))),
            Promise.all(revieweeReqReviewerIds.map((id) => getReviewerById(String(id)))),
          ]);
          const uMap: Record<string, { id: string; displayName: string; avatarUrl?: string | null }> =
            {};
          users.forEach((u) => {
            if (u) uMap[u.id] = u;
          });
          setUserMap(uMap);
          const rMap: Record<string, DbReviewerSummary> = {};
          reviewers.forEach((rev) => {
            if (rev) rMap[rev.id] = rev;
          });
          setRevMap(rMap);

          await resolveAvatars(
            users.filter(Boolean).map((u) => ({ id: u!.id, raw: u!.avatarUrl })),
            (id, url) => {
              nextResolved[`u:${id}`] = url;
            }
          );
          await resolveAvatars(
            reviewers.filter(Boolean).map((r) => ({ id: r!.id, raw: r!.avatarUrl })),
            (id, url) => {
              nextResolved[`r:${id}`] = url;
            }
          );
        } else {
          const uniqueIds = Array.from(new Set(reqs.map((r) => r.influencerId).filter(Boolean)));
          const reviewers = await Promise.all(uniqueIds.map((id) => getReviewerById(String(id))));
          const rMap: Record<string, DbReviewerSummary> = {};
          reviewers.forEach((rev) => {
            if (rev) rMap[rev.id] = rev;
          });
          setRevMap(rMap);
          setUserMap({});
          await resolveAvatars(
            reviewers.filter(Boolean).map((r) => ({ id: r!.id, raw: r!.avatarUrl })),
            (id, url) => {
              nextResolved[`r:${id}`] = url;
            }
          );
        }
        setAvatarResolved((prev) => ({ ...prev, ...nextResolved }));
      } catch (e) {
        console.error('[requests]', e);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setInitialLoad(false);
      }
    },
    [resolveAvatars]
  );

  useEffect(() => {
    loadAll('initial');
  }, [loadAll]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') loadAll('refresh');
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [loadAll]);

  const filtered = requests.filter((r) => {
    if (filter === 'archived') return !!r.archived_at;
    if (filter === 'completed') return r.status === 'completed' && !r.archived_at;
    return (
      (r.status === 'pending' ||
        r.status === 'accepted' ||
        r.status === 'paid' ||
        r.status === 'in_progress' ||
        r.status === 'rejected') &&
      !r.archived_at
    );
  });

  const activeCount = initialLoad
    ? 0
    : requests.filter(
        (r) =>
          (r.status === 'pending' ||
            r.status === 'accepted' ||
            r.status === 'paid' ||
            r.status === 'in_progress' ||
            r.status === 'rejected') &&
          !r.archived_at
      ).length;
  const completedCount = initialLoad
    ? 0
    : requests.filter((r) => r.status === 'completed' && !r.archived_at).length;
  const archivedCount = initialLoad ? 0 : requests.filter((r) => !!r.archived_at).length;

  const openRequest = (item: DbRequestSummary) => {
    if (!userProfile?.id) return;
    const userIsReviewer = item.influencerId === userProfile.id;
    if (userIsReviewer) {
      router.push(`/app/requests/reviewer/${item.id}`);
    } else {
      router.push(`/app/requests/review/${item.id}`);
    }
  };

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  };

  const copyProfileLink = async () => {
    if (!userProfile?.id) return;
    const slug = userProfile.username || userProfile.id;
    const profileUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/${slug}`;
    try {
      await navigator.clipboard.writeText(profileUrl);
      showToast('Profile link copied');
    } catch {
      showToast('Copy blocked — open Account to grab your link');
    }
  };

  return (
    <div className="px-4 pb-6 pt-5">
      {toast ? (
        <div
          className="fixed left-1/2 z-[60] max-w-[min(92vw,24rem)] -translate-x-1/2 rounded-full border border-white/15 bg-[#1a0f2e]/95 px-4 py-2.5 text-center text-sm text-white shadow-lg backdrop-blur-md motion-reduce:transition-none"
          style={{ bottom: 'calc(88px + env(safe-area-inset-bottom, 0px))' }}
          role="status"
        >
          {toast}
        </div>
      ) : null}

      <div className="mx-auto max-w-lg">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">Inbox</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-white">My reviews</h1>
        <p className="mt-1 text-sm leading-relaxed text-white/60">
          {isReviewer ? 'Requests you give and receive' : 'Your review requests'}
        </p>

        {isReviewer && (
          <button
            type="button"
            onClick={copyProfileLink}
            className="relative mt-5 w-full overflow-hidden rounded-2xl bg-primary py-3.5 text-center text-[15px] font-semibold text-primary-foreground shadow-[0_10px_28px_-6px_hsl(var(--primary)/0.55)] transition hover:bg-primary/92 active:scale-[0.99] motion-reduce:transform-none"
          >
            Copy profile link
          </button>
        )}

        <div className="mt-6 rounded-2xl border border-white/[0.1] bg-white/[0.03] p-1">
          <div className="flex gap-0.5">
            {(
              [
                ['active', 'Active', activeCount],
                ['completed', 'Done', completedCount],
                ['archived', 'Archived', archivedCount],
              ] as const
            ).map(([key, label, count]) => {
              const on = filter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`flex-1 rounded-[14px] px-1.5 py-2.5 text-center text-xs font-semibold transition sm:text-[13px] ${
                    on
                      ? 'bg-primary/20 text-white ring-1 ring-primary/35'
                      : 'text-white/55 hover:bg-white/[0.06] hover:text-white/85'
                  }`}
                >
                  {label}
                  <span className={on ? 'ml-1 text-white/80' : 'ml-1 text-white/45'}>({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => loadAll('refresh')}
            disabled={refreshing}
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white disabled:pointer-events-none disabled:opacity-45"
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-lg space-y-3">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div
              className="h-9 w-9 animate-spin rounded-full border-2 border-primary/25 border-t-primary motion-reduce:animate-none"
              aria-hidden
            />
            <p className="text-sm text-white/60">Loading requests…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass rounded-2xl border border-white/[0.12] p-10 text-center">
            <p className="text-[15px] text-white/75">No requests here yet.</p>
            <p className="mt-2 text-sm text-white/50">When you send or receive a review, it shows up here.</p>
            <Link
              href="/request"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_8px_22px_-6px_hsl(var(--primary)/0.5)] transition hover:bg-primary/92"
            >
              Start a review
            </Link>
          </div>
        ) : (
          filtered.map((item) => {
            const uid = userProfile?.id;
            const userIsReviewer = !!(uid && item.influencerId === uid);
            const reviewer = revMap[item.influencerId];
            const reviewee = item.userId ? userMap[item.userId] : undefined;
            let avatarSrc: string | undefined;
            let displayName: string;
            if (userIsReviewer) {
              displayName = reviewee?.displayName || 'User';
              avatarSrc = item.userId
                ? avatarResolved[`u:${item.userId}`] || reviewee?.avatarUrl || undefined
                : undefined;
            } else {
              displayName = reviewer?.displayName || 'Reviewer';
              avatarSrc =
                avatarResolved[`r:${item.influencerId}`] || reviewer?.avatarUrl || undefined;
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => openRequest(item)}
                className="glass w-full rounded-2xl border border-white/[0.1] p-4 text-left transition hover:border-white/[0.18] hover:bg-white/[0.05] active:scale-[0.99] motion-reduce:transform-none"
              >
                <div className="flex gap-4">
                  <AvatarCircle src={avatarSrc} name={displayName} size={56} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[17px] font-semibold tracking-tight text-white">{displayName}</p>
                    <p className="mt-0.5 text-sm text-white/55">
                      {new Date(item.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    <div className="mt-2">
                      <StatusBadge
                        status={item.status}
                        label={
                          userIsReviewer && item.status === 'paid'
                            ? 'Pending acceptance'
                            : undefined
                        }
                      />
                    </div>
                    {item.status === 'completed' && item.review?.ratings?.overall != null && (
                      <p className="mt-3 text-sm text-primary">
                        Overall {(item.review as { ratings: { overall: number } }).ratings.overall}/10
                        {item.review?.media?.videoUrl ? ' · Video attached' : ''}
                      </p>
                    )}
                    {(item.status === 'accepted' || item.status === 'pending') && (
                      <p className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">
                        {userIsReviewer
                          ? 'Waiting for the requester to finish payment (48h window).'
                          : 'Finish payment from your email — you have 48 hours.'}
                      </p>
                    )}
                    {item.status === 'completed' && (
                      <div className="mt-3 flex justify-end gap-3 text-sm">
                        {!item.archived_at ? (
                          <span
                            role="button"
                            tabIndex={0}
                            className="text-white/70 underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              archiveRequest(item.id).then(() =>
                                setRequests((prev) =>
                                  prev.map((r) =>
                                    r.id === item.id
                                      ? ({ ...r, archived_at: new Date().toISOString() } as DbRequestSummary)
                                      : r
                                  )
                                )
                              );
                            }}
                          >
                            Archive
                          </span>
                        ) : (
                          <span
                            role="button"
                            tabIndex={0}
                            className="text-white/70 underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              unarchiveRequest(item.id).then(() =>
                                setRequests((prev) =>
                                  prev.map((r) =>
                                    r.id === item.id
                                      ? ({ ...r, archived_at: null } as DbRequestSummary)
                                      : r
                                  )
                                )
                              );
                            }}
                          >
                            Unarchive
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
