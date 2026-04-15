'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import RevieweeWaitlist from '@/components/RevieweeWaitlist';

function WaitlistInner() {
  const searchParams = useSearchParams();
  const fromApp = searchParams.get('from') === 'app';
  const creatorSlug = searchParams.get('creatorSlug');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background text-white">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-16">
        <div className="rounded-2xl border border-white/15 bg-white/[0.05] p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/90">Auro Waitlist</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">Get reviewed is in waitlist mode</h1>
          <p className="mt-3 text-base text-white/80 md:text-lg">
            We are temporarily pausing payments and new review requests while we fix a few issues.
            Join the waitlist and we will notify you as soon as requests reopen.
          </p>
          {fromApp ? (
            <p className="mt-4 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white/75">
              The in-app dashboard is temporarily unavailable during this maintenance window.
            </p>
          ) : null}
          {creatorSlug ? (
            <p className="mt-3 text-sm text-white/70">
              You came from <span className="font-semibold text-white/90">@{creatorSlug}</span>. We saved that context.
            </p>
          ) : null}
        </div>

        <RevieweeWaitlist
          source="waitlist_page"
          title="Join the waitlist for review requests"
          subtitle="We will text you as soon as review requests and payments are live again."
        />

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/reviewers/apply"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Become a Reviewer
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function WaitlistPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-card to-background text-white/70">
          Loading…
        </div>
      }
    >
      <WaitlistInner />
    </Suspense>
  );
}
