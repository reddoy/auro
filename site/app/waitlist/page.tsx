'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import RevieweeWaitlist from '@/components/RevieweeWaitlist';
import { supabase } from '@/lib/supabase';

type ReviewerGate = 'loading' | 'guest' | 'reviewer_pending' | 'reviewer_approved';

function WaitlistInner() {
  const searchParams = useSearchParams();
  const fromApp = searchParams.get('from') === 'app';
  const creatorSlug = searchParams.get('creatorSlug');

  const [gate, setGate] = useState<ReviewerGate>('loading');
  const [publicUsername, setPublicUsername] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!supabase?.auth) {
        if (!cancelled) setGate('guest');
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        if (!cancelled) setGate('guest');
        return;
      }

      try {
        const res = await fetch('/api/reviewers/signup-status', {
          headers: { authorization: `Bearer ${session.access_token}` },
        });

        if (!res.ok) {
          if (!cancelled) setGate('guest');
          return;
        }

        const data = (await res.json()) as {
          reviewerApproval?: string | null;
          profile?: { username?: string | null };
        };

        const approval = data.reviewerApproval;
        const username = data.profile?.username?.trim() || null;
        if (!cancelled) setPublicUsername(username);

        if (approval === 'pending') {
          if (!cancelled) setGate('reviewer_pending');
        } else if (approval === 'approved') {
          if (!cancelled) setGate('reviewer_approved');
        } else {
          if (!cancelled) setGate('guest');
        }
      } catch {
        if (!cancelled) setGate('guest');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const showRevieweeForm = gate === 'guest';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c0325] via-background to-[#12081f] text-white">
      <main className="mx-auto w-full max-w-2xl px-4 py-10 md:py-14">
        {gate === 'loading' ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-12 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" aria-hidden />
            <p className="text-sm text-white/55">Loading your account…</p>
          </div>
        ) : null}

        {gate === 'reviewer_pending' ? (
          <section className="rounded-2xl border border-emerald-500/25 bg-emerald-950/20 p-6 shadow-lg shadow-black/20 backdrop-blur-md md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300/90">Reviewer application</p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-white md:text-3xl">We have your application</h1>
            <p className="mt-4 text-base leading-relaxed text-white/80 md:text-lg">
              You are signed in as someone applying to review on Auro. The page below is mainly for guys who want to book a
              review—we are ramping up review requests for everyone, and your reviewer account still needs a final thumbs-up
              from our team.
            </p>
            <p className="mt-3 text-base leading-relaxed text-white/75">
              We will email you when your reviewer status updates. No need to join the review-request waitlist unless you also
              want a text when paid bookings are available for everyone.
            </p>
            {fromApp ? (
              <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70">
                The in-app dashboard is rolling out in phases while we scale. Thanks for bearing with us.
              </p>
            ) : null}
            {creatorSlug ? (
              <p className="mt-3 text-sm text-white/65">
                You followed <span className="font-semibold text-white/90">@{creatorSlug}</span>—we kept that for when bookings
                are live.
              </p>
            ) : null}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/reviewers/apply"
                className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Open reviewer setup
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
              >
                Back to home
              </Link>
            </div>
          </section>
        ) : null}

        {gate === 'reviewer_approved' ? (
          <section className="rounded-2xl border border-primary/30 bg-primary/10 p-6 shadow-lg shadow-black/20 backdrop-blur-md md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/95">You are a reviewer</p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-white md:text-3xl">Thanks for being on the team</h1>
            <p className="mt-4 text-base leading-relaxed text-white/80 md:text-lg">
              We are ramping up paid review requests for everyone. You will hear from us when the next wave of bookings is ready;
              in the meantime you can keep your profile and payout details up to date.
            </p>
            {publicUsername ? (
              <p className="mt-3 text-sm text-white/70">
                Public page:{' '}
                <Link href={`/${publicUsername}`} className="font-semibold text-primary underline-offset-4 hover:underline">
                  @{publicUsername}
                </Link>
              </p>
            ) : null}
            {fromApp ? (
              <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70">
                The in-app dashboard is rolling out in phases while we scale.
              </p>
            ) : null}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/reviewers/apply"
                className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Reviewer setup &amp; Stripe
              </Link>
              {publicUsername ? (
                <Link
                  href={`/${publicUsername}`}
                  className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
                >
                  View public profile
                </Link>
              ) : null}
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
              >
                Back to home
              </Link>
            </div>
          </section>
        ) : null}

        {gate === 'guest' ? (
          <article className="overflow-hidden rounded-3xl border border-white/[0.1] bg-white/[0.04] shadow-[0_24px_80px_-24px_rgba(0,0,0,0.65)] backdrop-blur-xl">
            <div className="border-b border-white/[0.06] px-6 py-8 md:px-10 md:py-10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/95">Waitlist</p>
              <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight md:text-4xl">Be first when reviews open</h1>
              <p className="mt-4 max-w-prose text-pretty text-base leading-relaxed text-white/72 md:text-lg">
                We are onboarding reviewers and opening paid requests in waves. Add your number for a short SMS when spots
                open—nothing salesy, easy opt-out.
              </p>
              {fromApp ? (
                <p className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-relaxed text-white/68">
                  You tried the in-app flow—we are rolling the dashboard out in phases. This waitlist is the fastest way to hear
                  when bookings are live for everyone.
                </p>
              ) : null}
              {creatorSlug ? (
                <p className="mt-4 text-sm text-white/65">
                  You came from{' '}
                  <span className="font-semibold text-white/90">@{creatorSlug}</span>
                  —we kept that for when requests open.
                </p>
              ) : null}
            </div>

            {showRevieweeForm ? (
              <div className="px-6 py-8 md:px-10 md:py-9">
                <RevieweeWaitlist
                  appearance="flat"
                  hideHeading
                  source="waitlist_page"
                  title="Phone signup"
                  subtitle="Add your US number. We will send one concise text when review spots open—no drip campaign."
                />
              </div>
            ) : null}

            <footer className="flex flex-col gap-3 border-t border-white/[0.06] bg-black/10 px-6 py-5 md:flex-row md:items-center md:justify-between md:px-10">
              <p className="text-sm text-white/55">
                Prefer to review instead?{' '}
                <Link href="/reviewers/apply" className="font-semibold text-primary underline-offset-4 hover:underline">
                  Apply as a reviewer
                </Link>
              </p>
              <Link
                href="/"
                className="text-sm font-medium text-white/60 transition hover:text-white md:shrink-0"
              >
                ← Back to home
              </Link>
            </footer>
          </article>
        ) : null}
      </main>
    </div>
  );
}

export default function WaitlistPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#0c0325] via-background to-[#12081f] text-white/60">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          <p className="text-sm">Loading…</p>
        </div>
      }
    >
      <WaitlistInner />
    </Suspense>
  );
}
