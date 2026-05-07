'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { archiveRequest, unarchiveRequest } from '@/lib/api';
import type { DbRequestSummary } from '@/types';
import StatusBadge from '@/components/app/StatusBadge';
import AppMountReveal from '@/components/app/AppMountReveal';
import { InboxPageSkeleton } from '@/components/app/app-skeletons';
import { APP_INBOX_QUERY_KEY, useAppInboxQuery } from '@/hooks/useAppInboxQuery';
import { useAppToast } from '@/components/app/AppToastProvider';

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

function isInboxTab(v: string | null): v is 'active' | 'pending' | 'in_progress' | 'completed' {
  return v === 'active' || v === 'pending' || v === 'in_progress' || v === 'completed';
}

function emptyInboxCopy(
  tab: 'active' | 'pending' | 'in_progress' | 'completed',
  isReviewer: boolean
): { title: string; body: string; showRequestCta: boolean } {
  if (tab === 'pending') {
    return {
      title: 'No pending requests',
      body: 'Paid requests waiting for your accept or decline decision show up here.',
      showRequestCta: false,
    };
  }
  if (tab === 'in_progress') {
    return {
      title: 'No reviews in progress',
      body: 'Accepted requests move here while you prepare and upload your review video.',
      showRequestCta: false,
    };
  }
  if (tab === 'completed') {
    return {
      title: 'No completed reviews yet',
      body: 'When a review is finished, it shows up here so you can revisit feedback anytime.',
      showRequestCta: true,
    };
  }
  return {
    title: 'Nothing active right now',
    body: isReviewer
      ? 'When someone books you—or you request a review—it will appear here.'
      : 'When you request a review, it will appear here while it moves through payment and delivery.',
    showRequestCta: true,
  };
}

export default function RequestsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const queryClient = useQueryClient();
  const { showToast } = useAppToast();

  const { data, isPending, isFetching, error, refetch } = useAppInboxQuery();

  const [filter, setFilter] = useState<'active' | 'pending' | 'in_progress' | 'completed'>('active');

  useEffect(() => {
    if (isInboxTab(tabFromUrl)) {
      setFilter(tabFromUrl);
    }
  }, [tabFromUrl]);

  useEffect(() => {
    if (!error) return;
    const msg = error instanceof Error ? error.message : '';
    if (msg === 'SIGNED_OUT') {
      router.replace(`/auth/sign-in?redirect_to=${encodeURIComponent('/app/requests')}`);
    }
  }, [error, router]);

  const setFilterAndUrl = useCallback(
    (key: 'active' | 'pending' | 'in_progress' | 'completed') => {
      setFilter(key);
      router.replace(`/app/requests?tab=${key}`, { scroll: false });
    },
    [router]
  );

  const userProfile = data
    ? { id: data.profile.id, username: data.profile.username ?? undefined }
    : null;
  const isReviewer = data?.isReviewer ?? false;
  const requests = data?.requests ?? [];
  const revMap = data?.revMap ?? {};
  const userMap = data?.userMap ?? {};
  const avatarResolved = data?.avatarResolved ?? {};

  const filtered = requests.filter((r) => {
    if (filter === 'completed') return r.status === 'completed' && !r.archived_at;
    if (isReviewer && filter === 'pending') return r.influencerId === userProfile?.id && r.status === 'paid' && !r.archived_at;
    if (isReviewer && filter === 'in_progress')
      return r.influencerId === userProfile?.id && r.status === 'in_progress' && !r.archived_at;
    return (
      (r.status === 'pending' ||
        r.status === 'paid' ||
        r.status === 'in_progress' ||
        r.status === 'rejected') &&
      !r.archived_at
    );
  });

  const activeCount = requests.filter(
    (r) =>
      (r.status === 'pending' ||
        r.status === 'paid' ||
        r.status === 'in_progress' ||
        r.status === 'rejected') &&
      !r.archived_at
  ).length;
  const completedCount = requests.filter((r) => r.status === 'completed' && !r.archived_at).length;
  const pendingCount = requests.filter(
    (r) => r.influencerId === userProfile?.id && r.status === 'paid' && !r.archived_at
  ).length;
  const inProgressCount = requests.filter(
    (r) => r.influencerId === userProfile?.id && r.status === 'in_progress' && !r.archived_at
  ).length;

  const openRequest = (item: DbRequestSummary) => {
    if (!userProfile?.id) return;
    const userIsReviewer = item.influencerId === userProfile.id;
    if (userIsReviewer) {
      router.push(`/app/requests/reviewer/${item.id}`);
    } else {
      router.push(`/app/requests/review/${item.id}`);
    }
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

  const onArchiveToggle = async (item: DbRequestSummary, archive: boolean) => {
    try {
      if (archive) {
        await archiveRequest(item.id);
      } else {
        await unarchiveRequest(item.id);
      }
      await queryClient.invalidateQueries({ queryKey: APP_INBOX_QUERY_KEY });
    } catch (e) {
      console.error('[archive]', e);
      showToast('Could not update — try again');
    }
  };

  if (isPending && !data) {
    return <InboxPageSkeleton />;
  }

  if (error && !(error instanceof Error && error.message === 'SIGNED_OUT')) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm text-white/75">Could not load your inbox.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="rounded-full border border-white/15 bg-white/[0.06] px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.1]"
        >
          Try again
        </button>
      </div>
    );
  }

  const empty = emptyInboxCopy(filter, isReviewer);
  const tabOptions: Array<[typeof filter, string, number]> = isReviewer
    ? [
        ['pending', 'Pending', pendingCount],
        ['in_progress', 'In progress', inProgressCount],
        ['completed', 'Completed', completedCount],
      ]
    : [
        ['active', 'Active', activeCount],
        ['completed', 'Done', completedCount],
      ];

  return (
    <div className="px-4 pb-6 pt-5">
      <AppMountReveal ready={!!data}>
        <div className="mx-auto max-w-lg">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">Inbox</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-white">
            {isReviewer ? 'Reviewer queue' : 'My requests'}
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-white/60">
            {isReviewer ? 'Requests you give and receive' : 'Your review requests'}
          </p>

          {isReviewer && (
            <button
              type="button"
              onClick={() => void copyProfileLink()}
              className="relative mt-5 w-full overflow-hidden rounded-2xl bg-primary py-3.5 text-center text-[15px] font-semibold text-primary-foreground shadow-[0_10px_28px_-6px_hsl(var(--primary)/0.55)] transition hover:bg-primary/92 active:scale-[0.99] motion-reduce:transform-none"
            >
              Copy profile link
            </button>
          )}

          <div className="mt-6 rounded-2xl border border-white/[0.1] bg-white/[0.03] p-1">
            <div className="flex gap-0.5">
              {tabOptions.map(([key, label, count]) => {
                const on = filter === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilterAndUrl(key)}
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
              onClick={() => void refetch()}
              disabled={isFetching}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white disabled:pointer-events-none disabled:opacity-45"
            >
              {isFetching ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className="mx-auto mt-6 max-w-lg space-y-3">
          {filtered.length === 0 ? (
            <div className="glass rounded-2xl border border-white/[0.12] p-10 text-center">
              <p className="text-[15px] font-medium text-white/85">{empty.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-white/50">{empty.body}</p>
              {empty.showRequestCta ? (
                <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <Link
                    href="/reviewers"
                    className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_8px_22px_-6px_hsl(var(--primary)/0.5)] transition hover:bg-primary/92"
                  >
                    Request a review
                  </Link>
                  {isReviewer ? (
                    <Link
                      href="/reviewers"
                      className="text-sm font-medium text-white/65 underline-offset-4 transition hover:text-white/90 hover:underline"
                    >
                      Browse reviewers
                    </Link>
                  ) : null}
                </div>
              ) : null}
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
                            userIsReviewer && item.status === 'paid' ? 'Pending acceptance' : undefined
                          }
                        />
                      </div>
                      {item.status === 'completed' && item.review?.ratings?.overall != null && (
                        <p className="mt-3 text-sm text-primary">
                          Overall {(item.review as { ratings: { overall: number } }).ratings.overall}/10
                          {item.review?.media?.videoUrl ? ' · Video attached' : ''}
                        </p>
                      )}
                      {(item.status === 'pending' || item.status === 'paid') && (
                        <p className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">
                          {userIsReviewer
                            ? item.status === 'paid'
                              ? 'Payment received. Accept or decline to continue.'
                              : 'Waiting for requester payment.'
                            : item.status === 'paid'
                              ? 'Payment confirmed. Reviewer can now accept your request.'
                              : 'Finish payment from your email to continue.'}
                        </p>
                      )}
                      {userIsReviewer && item.status === 'in_progress' && (
                        <p className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">
                          {(item.review as { media?: { videoUrl?: string | null } } | null)?.media?.videoUrl
                            ? 'Draft video uploaded. Finalize and submit when ready.'
                            : 'Not started yet. Upload your draft or final video to continue.'}
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
                                void onArchiveToggle(item, true);
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
                                void onArchiveToggle(item, false);
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
      </AppMountReveal>
    </div>
  );
}
