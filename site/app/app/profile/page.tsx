'use client';

import WebAvatarUploader from '@/components/WebAvatarUploader';
import AppMountReveal from '@/components/app/AppMountReveal';
import { AccountPageSkeleton } from '@/components/app/app-skeletons';
import { useAppToast } from '@/components/app/AppToastProvider';
import { maskEmail } from '@/lib/mask-email';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { getCurrentProfileWeb } from '@/lib/profile-web';
import { readJsonResponseBody } from '@/lib/read-json-response-body';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';

function profileAvatarViewUrl(avatar_url: string | null | undefined): string | undefined {
  if (!avatar_url) return undefined;
  if (/^https?:\/\//i.test(avatar_url)) return avatar_url;
  return `/api/storage/signed-view?path=${encodeURIComponent(avatar_url)}&bucket=avatars`;
}

export default function AppProfilePage() {
  const router = useRouter();
  const { showToast } = useAppToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [stripeBusy, setStripeBusy] = useState(false);
  /** Live Stripe flags for approved reviewers with a Connect account id (acct exists before hosted onboarding finishes). */
  const [connectStripeSummary, setConnectStripeSummary] = useState<{
    loading: boolean;
    detailsSubmitted: boolean | null;
  } | null>(null);

  useEffect(() => {
    (async () => {
      let loaded: Profile | null = null;
      try {
        const [p, authRes] = await Promise.all([getCurrentProfileWeb(), supabase?.auth.getUser()]);
        loaded = p;
        setProfile(p);
        setUserEmail(authRes?.data?.user?.email ?? null);
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
      if (!loaded) {
        router.replace(`/auth/sign-in?redirect_to=${encodeURIComponent('/app/profile')}`);
      }
    })();
  }, [router]);

  useEffect(() => {
    if (!profile || profile.is_reviewer !== 'approved' || !profile.stripe_connect_account_id?.trim()) {
      setConnectStripeSummary(null);
      return;
    }
    let cancelled = false;
    setConnectStripeSummary({ loading: true, detailsSubmitted: null });
    (async () => {
      if (!supabase) {
        if (!cancelled) setConnectStripeSummary({ loading: false, detailsSubmitted: null });
        return;
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        if (!cancelled) setConnectStripeSummary({ loading: false, detailsSubmitted: null });
        return;
      }
      try {
        const res = await fetch('/api/stripe/connect-eligibility', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const j = (await readJsonResponseBody(res)) as {
          stripeDetailsSubmitted?: boolean;
        };
        if (cancelled) return;
        setConnectStripeSummary({
          loading: false,
          detailsSubmitted:
            typeof j.stripeDetailsSubmitted === 'boolean' ? j.stripeDetailsSubmitted : null,
        });
      } catch {
        if (!cancelled) setConnectStripeSummary({ loading: false, detailsSubmitted: null });
      }
    })();
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || cancelled) return;
      void (async () => {
        if (!supabase || !profile?.stripe_connect_account_id?.trim() || profile?.is_reviewer !== 'approved') return;
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token || cancelled) return;
        try {
          const res = await fetch('/api/stripe/connect-eligibility', {
            headers: { Authorization: `Bearer ${token}` },
          });
          const j = (await readJsonResponseBody(res)) as { stripeDetailsSubmitted?: boolean };
          if (cancelled) return;
          setConnectStripeSummary({
            loading: false,
            detailsSubmitted:
              typeof j.stripeDetailsSubmitted === 'boolean' ? j.stripeDetailsSubmitted : null,
          });
        } catch {
          /* ignore */
        }
      })();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [profile?.id, profile?.is_reviewer, profile?.stripe_connect_account_id]);

  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
    profile?.username ||
    'Account';

  const persistAvatarPath = useCallback(
    async (path: string | null) => {
      if (!supabase) return false;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        showToast('Sign in again to update your photo', 3200);
        return false;
      }
      setSavingAvatar(true);
      try {
        const res = await fetch('/api/account/avatar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ path }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error((j as { error?: string }).error || 'Could not save photo');
        }
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                avatar_url: path && path.length > 0 ? path : null,
              }
            : prev
        );
        return true;
      } catch (e) {
        console.error('[profile avatar]', e);
        showToast(e instanceof Error ? e.message : 'Could not save photo', 3200);
        return false;
      } finally {
        setSavingAvatar(false);
      }
    },
    [showToast]
  );

  const handleAvatarChange = useCallback(
    async (_displayUrl: string | null, path: string | null) => {
      await persistAvatarPath(path);
    },
    [persistAvatarPath]
  );

  const signOut = async () => {
    await supabase?.auth.signOut();
    router.replace('/app/intro');
  };

  const copyLink = async () => {
    if (!profile?.id) return;
    const slug = profile.username || profile.id;
    const url = `${window.location.origin}/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Profile link copied');
    } catch {
      showToast('Copy blocked — try again or copy from your browser');
    }
  };

  const masked = maskEmail(userEmail);
  const reviewerish = profile?.is_reviewer === 'approved' || profile?.is_reviewer === 'pending';
  const hasStripeConnectAccountId = !!profile?.stripe_connect_account_id?.trim();
  const stripeOnboardingComplete = connectStripeSummary?.detailsSubmitted === true;
  const connectStripeStatusLoading =
    profile?.is_reviewer === 'approved' && hasStripeConnectAccountId && connectStripeSummary?.loading === true;
  const reviewerStatus = profile?.is_reviewer ?? null;
  const approvedReviewerNeedsStripe =
    profile?.is_reviewer === 'approved' &&
    (!hasStripeConnectAccountId ||
      (!connectStripeStatusLoading && hasStripeConnectAccountId && !stripeOnboardingComplete));

  const openStripeRoute = useCallback(
    async (route: string, opts?: { reviewerId?: string }) => {
    if (!supabase) return;
    setStripeBusy(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        showToast('Sign in again to manage Stripe payouts', 3200);
        return;
      }

      const body: { returnUrl: string; reviewerId?: string } = {
        returnUrl: `${window.location.origin}/auth/stripe-connect-success`,
      };
      if (opts?.reviewerId) {
        body.reviewerId = opts.reviewerId;
      }

      const res = await fetch(route, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await readJsonResponseBody(res);
      if (!res.ok) {
        const j = data as { error?: string; stripeCode?: string | null; stripeRequestId?: string | null };
        console.warn('[stripe api]', { status: res.status, ...j });
        const suffix = j.stripeCode ? ` (${j.stripeCode})` : '';
        const msg =
          (typeof j.error === 'string' && j.error.length > 0 ? j.error : null) || `Server error (${res.status})`;
        throw new Error((msg || 'Unable to open Stripe') + suffix);
      }
      const redirectUrl =
        typeof data.url === 'string' && data.url.trim().length > 0 ? data.url.trim() : null;
      if (!redirectUrl) {
        const err = typeof data.error === 'string' && data.error.trim().length > 0 ? data.error.trim() : null;
        console.warn('[stripe api] 200 without url', { keys: Object.keys(data) });
        throw new Error(err || 'Stripe link was not returned — try again or contact support.');
      }
      window.location.assign(redirectUrl);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to open Stripe', 3200);
    } finally {
      setStripeBusy(false);
    }
  },
  [showToast],
);

  if (loading) {
    return <AccountPageSkeleton />;
  }

  if (!profile) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4">
        <div
          className="h-9 w-9 animate-spin rounded-full border-2 border-primary/25 border-t-primary"
          aria-hidden
        />
        <p className="text-sm text-white/60">Taking you to sign in…</p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-10 pt-5">
      <AppMountReveal ready={!!profile}>
        <div className="mx-auto max-w-lg">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">Account</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-white">Your profile</h1>
          <p className="mt-1 text-sm text-white/60">Photo, payouts, and sign-in</p>

          <section
            className="glass mt-6 rounded-2xl border border-white/[0.12] p-6"
            aria-label="Profile photo"
          >
            <div className="flex flex-col items-center gap-1">
              <div className={savingAvatar ? 'pointer-events-none opacity-70' : ''}>
                <WebAvatarUploader
                  currentAvatarUrl={profileAvatarViewUrl(profile.avatar_url)}
                  onAvatarChange={handleAvatarChange}
                  size={112}
                  ownerFirstName={profile.first_name ?? null}
                  ownerLastName={profile.last_name ?? null}
                  ownerId={profile.id}
                  ownerEmail={userEmail}
                />
              </div>
              <p className="mt-4 text-center text-lg font-semibold text-white">{displayName}</p>
              {profile.username ? (
                <p className="text-center text-sm text-white/55">@{profile.username}</p>
              ) : null}
              {savingAvatar ? (
                <p className="mt-2 text-center text-xs text-white/50">Saving…</p>
              ) : null}
            </div>
          </section>

          {masked ? (
            <section
              className="glass mt-4 rounded-2xl border border-white/[0.12] px-4 py-4"
              aria-label="Email on file"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">Email</p>
              <p className="mt-1 font-mono text-sm text-white/85">{masked}</p>
              <p className="mt-1 text-xs text-white/45">Shown masked for privacy on shared screens.</p>
            </section>
          ) : null}

          {!reviewerish ? (
            <section className="glass mt-4 rounded-2xl border border-white/[0.12] px-4 py-4" aria-label="Reviewer application">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">Become a reviewer</p>
              <p className="mt-2 text-sm text-white/75">
                Want to get paid for reviews? Apply once, set your rate, and receive requests in your reviewer queue.
              </p>
              <Link href="/reviewers/apply" className="mt-3 inline-flex text-sm font-semibold text-primary">
                Apply to review →
              </Link>
            </section>
          ) : null}

          {profile?.is_reviewer === 'pending' ? (
            <section
              className="glass mt-4 rounded-2xl border border-white/[0.12] px-4 py-4"
              aria-label="Reviewer application status"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">Stripe payouts</p>
              <p className="mt-2 text-sm leading-relaxed text-white/72">
                Your reviewer application is pending. After the team approves it, you&apos;ll connect Stripe here to
                receive payouts.
              </p>
              <p className="mt-3 text-xs text-white/46">
                Status:{' '}
                <span className="font-medium uppercase tracking-[0.03em] text-amber-100/90">pending approval</span>
              </p>
            </section>
          ) : null}

          {profile?.is_reviewer === 'approved' ? (
            <section
              className="glass mt-4 rounded-2xl border border-white/[0.12] px-4 py-4"
              aria-label="Stripe Connect"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
                  Stripe payouts
                </p>
                <span
                  className={[
                    'inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                    connectStripeStatusLoading
                      ? 'border-white/20 bg-white/[0.06] text-white/70'
                      : stripeOnboardingComplete
                        ? 'border-emerald-300/40 bg-emerald-500/10 text-emerald-200'
                        : 'border-amber-300/35 bg-amber-500/10 text-amber-100',
                  ].join(' ')}
                >
                  {connectStripeStatusLoading
                    ? 'Checking…'
                    : stripeOnboardingComplete
                      ? 'Connected'
                      : hasStripeConnectAccountId
                        ? 'Setup needed'
                        : 'Not connected'}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-white/72">
                {connectStripeStatusLoading
                  ? 'Confirming your Stripe onboarding status…'
                  : stripeOnboardingComplete
                    ? 'You can receive payouts for completed reviews.'
                    : hasStripeConnectAccountId
                      ? 'Stripe started your payout profile — finish the steps on Stripe to enable the dashboard and payouts.'
                      : 'Connect Stripe to receive payouts when reviews complete.'}
              </p>
              {!hasStripeConnectAccountId ? (
                <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      disabled={stripeBusy}
                      onClick={() => void openStripeRoute('/api/stripe/express-onboarding', { reviewerId: profile.id })}
                      className="inline-flex min-h-9 items-center justify-center rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-[0_8px_22px_-12px_hsl(var(--primary)/0.9)] transition hover:bg-primary/92 disabled:opacity-60"
                    >
                      {stripeBusy ? 'Opening Stripe...' : 'Connect Stripe'}
                    </button>
                    <Link
                      href="/reviewers/apply"
                      className="inline-flex min-h-9 items-center rounded-full border border-white/16 px-4 text-xs font-semibold text-white/86 transition hover:border-white/28 hover:text-white"
                    >
                      Reviewer settings <span aria-hidden className="ml-1.5">→</span>
                    </Link>
                  </div>
                </div>
              ) : !stripeOnboardingComplete ? (
                <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      disabled={stripeBusy || connectStripeStatusLoading}
                      onClick={() =>
                        void openStripeRoute('/api/stripe/express-onboarding', { reviewerId: profile.id })
                      }
                      className="inline-flex min-h-9 items-center justify-center rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-[0_8px_22px_-12px_hsl(var(--primary)/0.9)] transition hover:bg-primary/92 disabled:opacity-60"
                    >
                      {stripeBusy ? 'Opening Stripe...' : 'Continue Stripe setup'}
                    </button>
                    <Link
                      href="/reviewers/apply"
                      className="inline-flex min-h-9 items-center rounded-full border border-white/16 px-4 text-xs font-semibold text-white/86 transition hover:border-white/28 hover:text-white"
                    >
                      Reviewer settings <span aria-hidden className="ml-1.5">→</span>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="mt-3">
                  <button
                    type="button"
                    disabled={stripeBusy}
                    onClick={() =>
                      void openStripeRoute('/api/stripe/express-login', { reviewerId: profile.id })
                    }
                    className="inline-flex min-h-9 items-center rounded-full border border-white/20 px-4 text-xs font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.04] disabled:opacity-60"
                  >
                    {stripeBusy ? 'Opening Stripe...' : 'Manage payout account'}
                  </button>
                </div>
              )}
              <p className="mt-3 text-xs text-white/46">
                Reviewer status:{' '}
                <span className="font-medium uppercase tracking-[0.03em] text-white/82">{reviewerStatus}</span>
              </p>
            </section>
          ) : null}

          {approvedReviewerNeedsStripe ? (
            <section
              className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-4"
              aria-label="Payout setup required"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-100/80">Action required</p>
              <p className="mt-2 text-sm text-amber-50">
                {!hasStripeConnectAccountId
                  ? 'Your reviewer profile is approved, but payouts are locked until you connect Stripe.'
                  : 'Your reviewer profile is approved, but payouts stay locked until you finish every step in Stripe (identity, bank account, etc.).'}
              </p>
            </section>
          ) : null}

          {profile?.is_reviewer === 'approved' ? (
            <section className="glass mt-4 rounded-2xl border border-white/[0.12] px-4 py-4" aria-label="Reviewer earnings">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">Reviewer earnings</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-white/55">Lifetime earned</p>
                  <p className="mt-1 font-semibold text-white">
                    ${(((profile.completed_paid_total_cents || 0) as number) / 100).toFixed(2)}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-white/55">Pending payout</p>
                  <p className="mt-1 font-semibold text-white">
                    ${(((profile.pending_payout_balance_cents || 0) as number) / 100).toFixed(2)}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-white/55">Awaiting payout</p>
                  <p className="mt-1 font-semibold text-white">
                    ${(((profile.awaiting_payout_balance_cents || 0) as number) / 100).toFixed(2)}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-white/55">Current rate</p>
                  <p className="mt-1 font-semibold text-white">${Number(profile.hourly_rate || 0).toFixed(0)}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-white/50">
                Rate updates only apply to future requests. Existing requests keep the rate they were booked at.
              </p>
            </section>
          ) : null}

          <div className="mt-8 space-y-3">
            {reviewerish && (
              <button
                type="button"
                onClick={copyLink}
                className="relative w-full overflow-hidden rounded-2xl bg-primary py-3.5 text-center text-[15px] font-semibold text-primary-foreground shadow-[0_10px_28px_-6px_hsl(var(--primary)/0.55)] transition hover:bg-primary/92 active:scale-[0.99] motion-reduce:transform-none"
              >
                Copy profile link
              </button>
            )}

            <Link
              href="/request"
              className="block w-full rounded-2xl border border-white/[0.14] bg-white/[0.04] py-3.5 text-center text-[15px] font-semibold text-white transition hover:border-white/25 hover:bg-white/[0.07] active:scale-[0.99] motion-reduce:transform-none"
            >
              Request a review
            </Link>

            {!reviewerish ? (
              <Link
                href="/reviewers/apply"
                className="block w-full rounded-2xl border border-white/[0.14] bg-white/[0.04] py-3.5 text-center text-[15px] font-semibold text-white transition hover:border-white/25 hover:bg-white/[0.07] active:scale-[0.99] motion-reduce:transform-none"
              >
                Reviewer application
              </Link>
            ) : null}

            <Link
              href="/auth/sign-in"
              className="block w-full rounded-2xl border border-transparent py-3.5 text-center text-[15px] font-medium text-white/65 transition hover:text-white/90"
            >
              Sign-in options
            </Link>

            <button
              type="button"
              onClick={signOut}
              className="w-full rounded-2xl py-3.5 text-center text-[15px] font-semibold text-destructive transition hover:text-destructive/90"
            >
              Sign out
            </button>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 border-t border-white/[0.08] pt-6 text-xs font-medium text-white/50">
            <Link href="/terms" className="transition hover:text-white/80">
              Terms
            </Link>
            <Link href="/privacy" className="transition hover:text-white/80">
              Privacy
            </Link>
            <Link href="/support" className="transition hover:text-white/80">
              Support
            </Link>
          </div>
        </div>
      </AppMountReveal>
    </div>
  );
}
