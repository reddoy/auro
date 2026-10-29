'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import {
  ArrowRight,
  ClipboardList,
  ExternalLink,
  HelpCircle,
  Link2,
  Sparkles,
  UserPlus,
  UserRound,
} from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { computeNeedsAttention, summarizeRequestBuckets } from '@/lib/fetch-app-inbox';
import AppMountReveal from '@/components/app/AppMountReveal';
import { HomeDashboardSkeleton } from '@/components/app/app-skeletons';
import { useAppToast } from '@/components/app/AppToastProvider';
import { useAppInboxQuery } from '@/hooks/useAppInboxQuery';

function greetingForHour(d: Date): string {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function AppHomeClient() {
  const router = useRouter();
  const { showToast } = useAppToast();
  const { data, isPending, isFetching, error, refetch } = useAppInboxQuery();

  useEffect(() => {
    if (!supabase) {
      router.replace('/app/intro');
      return;
    }
    void supabase.auth.getSession().then((res: { data: { session: Session | null } }) => {
      if (!res.data.session) router.replace('/app/intro');
    });
  }, [router]);

  useEffect(() => {
    if (!error) return;
    if (error instanceof Error && error.message === 'SIGNED_OUT') {
      router.replace(`/auth/sign-in?redirect_to=${encodeURIComponent('/auth/post-sign-in?role_intent=reviewee')}`);
    }
  }, [error, router]);

  const greeting = useMemo(() => greetingForHour(new Date()), []);

  const stats = data ? summarizeRequestBuckets(data.requests) : { active: 0, completed: 0, archived: 0 };
  const firstName = useMemo(() => {
    if (!data) return null;
    const raw = (data.profile.name || data.profile.username || '').trim();
    return raw || null;
  }, [data]);
  const username = data?.profile.username ?? null;
  const userId = data?.profile.id ?? null;
  const isReviewer = data?.isReviewer ?? false;
  const avatarUrl = data?.userAvatarDisplayUrl ?? null;
  const needsAttention = data ? computeNeedsAttention(data) : [];
  const reviewerQueue = useMemo(() => {
    if (!data || !userId) return { pending: 0, inProgress: 0, completed: 0 };
    const mine = data.requests.filter((r) => r.influencerId === userId && !r.archived_at);
    return {
      pending: mine.filter((r) => r.status === 'paid').length,
      inProgress: mine.filter((r) => r.status === 'in_progress').length,
      completed: mine.filter((r) => r.status === 'completed').length,
    };
  }, [data, userId]);

  const profileHref = username || userId ? `/${username || userId}` : null;

  const copyProfileLink = async () => {
    if (!userId) return;
    const slug = username || userId;
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Profile link copied');
    } catch {
      showToast('Copy blocked — open Account to copy');
    }
  };

  if (isPending && !data) {
    return <HomeDashboardSkeleton />;
  }

  if (error && !(error instanceof Error && error.message === 'SIGNED_OUT')) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm text-white/75">Could not load your dashboard.</p>
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

  const initial = (firstName || username || '?').trim().charAt(0).toUpperCase() || '?';

  return (
    <div className="px-4 pb-8 pt-5">
      <AppMountReveal ready={!!data}>
        <div className="mx-auto max-w-lg space-y-6">
          <header className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">Home</p>
              <h1 className="text-xl font-semibold tracking-tight text-white">
                {greeting}
                {firstName ? `, ${firstName.split(' ')[0]}` : ''}
              </h1>
              <p className="text-sm text-white/60">
                {isReviewer
                  ? 'Accept requests, deliver reviews, and manage your reviewer business.'
                  : 'Request a review in minutes and track every step.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/70 transition hover:border-white/20 hover:text-white disabled:opacity-40"
            >
              {isFetching ? '…' : 'Sync'}
            </button>
          </header>

          <section
            className="glass flex items-center gap-4 rounded-2xl border border-white/[0.12] p-4"
            aria-label="Your profile"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 text-lg font-semibold text-white/90">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-white">{firstName || 'Your account'}</p>
              {username ? (
                <p className="truncate text-sm text-white/55">@{username}</p>
              ) : (
                <p className="text-sm text-white/50">Add a username in Account</p>
              )}
            </div>
            <Link
              href="/app/profile"
              className="shrink-0 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white/90 transition hover:border-white/25 hover:bg-white/[0.1]"
            >
              Account
            </Link>
          </section>

          {needsAttention.length > 0 ? (
            <section aria-labelledby="attention-heading" className="rounded-2xl border border-primary/25 bg-primary/[0.07] p-4">
              <h2 id="attention-heading" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                Needs attention
              </h2>
              <ul className="mt-3 space-y-2">
                {needsAttention.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left transition hover:border-white/20 hover:bg-white/[0.07]"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{item.title}</p>
                        <p className="truncate text-xs text-white/55">{item.subtitle}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/80">
                        {item.badge}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section aria-labelledby="overview-heading">
            <h2 id="overview-heading" className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
              Overview
            </h2>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <Link
                href={isReviewer ? '/app/requests?tab=pending' : '/app/requests?tab=active'}
                className="glass flex flex-col rounded-2xl border border-white/[0.1] p-3 transition hover:border-white/[0.18] hover:bg-white/[0.04] active:scale-[0.98] motion-reduce:transform-none sm:p-4"
              >
                <span className="text-2xl font-semibold tabular-nums text-white sm:text-3xl">
                  {isReviewer ? reviewerQueue.pending : stats.active}
                </span>
                <span className="mt-1 text-[11px] font-medium leading-tight text-white/55 sm:text-xs">
                  {isReviewer ? 'Pending' : 'Active'}
                </span>
              </Link>
              <Link
                href={isReviewer ? '/app/requests?tab=in_progress' : '/app/requests?tab=completed'}
                className="glass flex flex-col rounded-2xl border border-white/[0.1] p-3 transition hover:border-white/[0.18] hover:bg-white/[0.04] active:scale-[0.98] motion-reduce:transform-none sm:p-4"
              >
                <span className="text-2xl font-semibold tabular-nums text-white sm:text-3xl">
                  {isReviewer ? reviewerQueue.inProgress : stats.completed}
                </span>
                <span className="mt-1 text-[11px] font-medium leading-tight text-white/55 sm:text-xs">
                  {isReviewer ? 'In progress' : 'Done'}
                </span>
              </Link>
              <Link
                href="/app/requests?tab=completed"
                className="glass flex flex-col rounded-2xl border border-white/[0.1] p-3 transition hover:border-white/[0.18] hover:bg-white/[0.04] active:scale-[0.98] motion-reduce:transform-none sm:p-4"
              >
                <span className="text-2xl font-semibold tabular-nums text-white/70 sm:text-3xl">
                  {isReviewer ? reviewerQueue.completed : stats.archived}
                </span>
                <span className="mt-1 text-[11px] font-medium leading-tight text-white/50 sm:text-xs">
                  {isReviewer ? 'Completed' : 'Archived'}
                </span>
              </Link>
            </div>
            <Link
              href={isReviewer ? '/app/requests?tab=pending' : '/reviewers'}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-[15px] font-semibold text-primary-foreground shadow-[0_10px_28px_-6px_hsl(var(--primary)/0.55)] transition hover:bg-primary/92 active:scale-[0.99] motion-reduce:transform-none"
            >
              <ClipboardList className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
              {isReviewer ? 'Open reviewer queue' : 'Get reviewed'}
              <ArrowRight className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            </Link>
          </section>

          <section aria-labelledby="actions-heading">
            <h2 id="actions-heading" className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
              Quick actions
            </h2>
            <div className="space-y-2">
              <Link
                href="/reviewers"
                className="flex items-center gap-3 rounded-2xl border border-white/[0.12] bg-white/[0.04] px-4 py-3.5 transition hover:border-white/20 hover:bg-white/[0.07]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Sparkles className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-white">Request a review</span>
                  <span className="block text-xs text-white/55">Browse reviewers and submit your profile</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-white/40" aria-hidden />
              </Link>

              <Link
                href="/reviewers"
                className="flex items-center gap-3 rounded-2xl border border-white/[0.12] bg-white/[0.04] px-4 py-3.5 transition hover:border-white/20 hover:bg-white/[0.07]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.08] text-white/90">
                  <UserRound className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-white">Browse reviewers</span>
                  <span className="block text-xs text-white/55">Find someone who fits your vibe</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-white/40" aria-hidden />
              </Link>

              {!isReviewer ? (
                <Link
                  href="/reviewers/apply"
                  className="flex items-center gap-3 rounded-2xl border border-white/[0.12] bg-white/[0.04] px-4 py-3.5 transition hover:border-white/20 hover:bg-white/[0.07]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.08] text-white/90">
                    <UserPlus className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-white">Become a reviewer</span>
                    <span className="block text-xs text-white/55">Apply and set your rate</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-white/40" aria-hidden />
                </Link>
              ) : null}

              {isReviewer && (
                <>
                  {profileHref ? (
                    <a
                      href={profileHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-2xl border border-white/[0.12] bg-white/[0.04] px-4 py-3.5 transition hover:border-white/20 hover:bg-white/[0.07]"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.08] text-white/90">
                        <ExternalLink className="h-5 w-5" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-white">View public profile</span>
                        <span className="block truncate text-xs text-white/55">
                          {typeof window !== 'undefined' ? window.location.host : 'auro-pearl.vercel.app'}
                          {profileHref}
                        </span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-white/40" aria-hidden />
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void copyProfileLink()}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.12] bg-white/[0.04] px-4 py-3.5 text-left transition hover:border-white/20 hover:bg-white/[0.07]"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <Link2 className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-white">Copy profile link</span>
                      <span className="block text-xs text-white/55">Share anywhere you promote reviews</span>
                    </span>
                  </button>
                </>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-4">
            <Link
              href="/support"
              className="flex items-center gap-3 text-sm font-medium text-white/75 transition hover:text-white"
            >
              <HelpCircle className="h-5 w-5 shrink-0 text-white/50" aria-hidden />
              Help &amp; support
              <ArrowRight className="ml-auto h-4 w-4 text-white/35" aria-hidden />
            </Link>
          </section>
        </div>
      </AppMountReveal>
    </div>
  );
}
