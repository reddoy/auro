'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import {
  getRequestsByReviewer,
  getRequestsByUser,
  getUserProfile,
} from '@/lib/api';
import { getDisplayAvatarUrl } from '@/lib/avatar';
import { supabase } from '@/lib/supabase';
import type { DbRequestSummary } from '@/types';

function isActiveRequest(r: DbRequestSummary): boolean {
  return (
    (r.status === 'pending' ||
      r.status === 'accepted' ||
      r.status === 'paid' ||
      r.status === 'in_progress' ||
      r.status === 'rejected') &&
    !r.archived_at
  );
}

function summarizeRequests(requests: DbRequestSummary[]) {
  const active = requests.filter(isActiveRequest).length;
  const completed = requests.filter((r) => r.status === 'completed' && !r.archived_at).length;
  const archived = requests.filter((r) => !!r.archived_at).length;
  return { active, completed, archived };
}

function greetingForHour(d: Date): string {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function AppHomeClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isReviewer, setIsReviewer] = useState(false);
  const [stats, setStats] = useState({ active: 0, completed: 0, archived: 0 });

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (!supabase) {
      router.replace('/app/intro');
      return;
    }
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr || !sessionData.session) {
      router.replace('/app/intro');
      return;
    }

    if (mode === 'refresh') setRefreshing(true);
    try {
      const profile = await getUserProfile();
      if (!profile?.id) {
        router.replace('/app/intro');
        return;
      }

      const reviewerStatus = (profile as { is_reviewer?: string | null }).is_reviewer;
      const reviewerMode = reviewerStatus === 'approved' || reviewerStatus === 'pending';
      setIsReviewer(reviewerMode);
      setUserId(profile.id);
      setUsername(profile.username ?? null);

      const display = (profile.name || profile.username || '').trim();
      setFirstName(display || null);

      const rawAvatar = profile.avatarUrl ?? null;
      if (rawAvatar) {
        const u = await getDisplayAvatarUrl(rawAvatar);
        setAvatarUrl(u || null);
      } else {
        setAvatarUrl(null);
      }

      let reqs: DbRequestSummary[] = [];
      if (reviewerMode) {
        const [a, b] = await Promise.all([
          getRequestsByReviewer(profile.id),
          getRequestsByUser(profile.id),
        ]);
        const map = new Map<string, DbRequestSummary>();
        [...a, ...b].forEach((r) => map.set(r.id, r));
        reqs = Array.from(map.values());
      } else {
        reqs = await getRequestsByUser(profile.id);
      }
      setStats(summarizeRequests(reqs));
    } catch (e) {
      console.error('[app home]', e);
      showToast('Could not load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router, showToast]);

  useEffect(() => {
    void load('initial');
  }, [load]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') void load('refresh');
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [load]);

  const greeting = useMemo(() => greetingForHour(new Date()), []);

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

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
        <div
          className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary/25 border-t-primary"
          aria-hidden
        />
        <p className="text-sm text-white/65">Loading your hub…</p>
      </div>
    );
  }

  const initial = (firstName || username || '?').trim().charAt(0).toUpperCase() || '?';

  return (
    <div className="px-4 pb-8 pt-5">
      {toast ? (
        <div
          className="fixed left-1/2 z-[60] max-w-[min(92vw,24rem)] -translate-x-1/2 rounded-full border border-white/15 bg-[#1a0f2e]/95 px-4 py-2.5 text-center text-sm text-white shadow-lg backdrop-blur-md"
          style={{ bottom: 'calc(88px + env(safe-area-inset-bottom, 0px))' }}
          role="status"
        >
          {toast}
        </div>
      ) : null}

      <div className="mx-auto max-w-lg space-y-6">
        <header className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">Home</p>
          <h1 className="text-xl font-semibold tracking-tight text-white">
            {greeting}
            {firstName ? `, ${firstName.split(' ')[0]}` : ''}
          </h1>
          <p className="text-sm text-white/60">Pick up reviews, request feedback, or manage your account.</p>
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

        <section aria-labelledby="overview-heading">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 id="overview-heading" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
              Overview
            </h2>
            <button
              type="button"
              onClick={() => void load('refresh')}
              disabled={refreshing}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/70 transition hover:border-white/20 hover:text-white disabled:opacity-40"
            >
              {refreshing ? '…' : 'Refresh'}
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Link
              href="/app/requests"
              className="glass flex flex-col rounded-2xl border border-white/[0.1] p-3 transition hover:border-white/[0.18] hover:bg-white/[0.04] active:scale-[0.98] motion-reduce:transform-none sm:p-4"
            >
              <span className="text-2xl font-semibold tabular-nums text-white sm:text-3xl">{stats.active}</span>
              <span className="mt-1 text-[11px] font-medium leading-tight text-white/55 sm:text-xs">Active</span>
            </Link>
            <Link
              href="/app/requests"
              className="glass flex flex-col rounded-2xl border border-white/[0.1] p-3 transition hover:border-white/[0.18] hover:bg-white/[0.04] active:scale-[0.98] motion-reduce:transform-none sm:p-4"
            >
              <span className="text-2xl font-semibold tabular-nums text-white sm:text-3xl">{stats.completed}</span>
              <span className="mt-1 text-[11px] font-medium leading-tight text-white/55 sm:text-xs">Done</span>
            </Link>
            <Link
              href="/app/requests"
              className="glass flex flex-col rounded-2xl border border-white/[0.1] p-3 transition hover:border-white/[0.18] hover:bg-white/[0.04] active:scale-[0.98] motion-reduce:transform-none sm:p-4"
            >
              <span className="text-2xl font-semibold tabular-nums text-white/70 sm:text-3xl">{stats.archived}</span>
              <span className="mt-1 text-[11px] font-medium leading-tight text-white/50 sm:text-xs">Archived</span>
            </Link>
          </div>
          <Link
            href="/app/requests"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-[15px] font-semibold text-primary-foreground shadow-[0_10px_28px_-6px_hsl(var(--primary)/0.55)] transition hover:bg-primary/92 active:scale-[0.99] motion-reduce:transform-none"
          >
            <ClipboardList className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
            Open my reviews
            <ArrowRight className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
          </Link>
        </section>

        <section aria-labelledby="actions-heading">
          <h2 id="actions-heading" className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
            Quick actions
          </h2>
          <div className="space-y-2">
            <Link
              href="/request"
              className="flex items-center gap-3 rounded-2xl border border-white/[0.12] bg-white/[0.04] px-4 py-3.5 transition hover:border-white/20 hover:bg-white/[0.07]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Sparkles className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-white">Request a review</span>
                <span className="block text-xs text-white/55">Photos, prompts, honest notes</span>
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
                        {typeof window !== 'undefined' ? window.location.host : 'appauro.com'}
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
    </div>
  );
}
