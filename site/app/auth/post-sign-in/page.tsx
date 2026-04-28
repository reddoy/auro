'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type PostSignInState = 'loading' | 'reviewer_approved' | 'reviewer_pending' | 'reviewer_rejected' | 'reviewee';

export default function PostSignInPage() {
  const router = useRouter();
  const [state, setState] = useState<PostSignInState>('loading');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!supabase?.auth) {
        if (!cancelled) router.replace('/app');
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.replace('/auth/sign-in');
        return;
      }

      try {
        const res = await fetch('/api/reviewers/signup-status', {
          headers: { authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) {
          if (!cancelled) router.replace('/app');
          return;
        }
        const data = await res.json();
        const reviewerApproval = String(data?.reviewerApproval || '').toLowerCase();

        if (reviewerApproval === 'approved') {
          router.replace('/app');
          return;
        }
        if (reviewerApproval === 'pending') {
          if (!cancelled) setState('reviewer_pending');
          return;
        }
        if (reviewerApproval === 'rejected' || reviewerApproval === 'denied') {
          if (!cancelled) setState('reviewer_rejected');
          return;
        }

        if (!cancelled) router.replace('/app');
      } catch {
        if (!cancelled) router.replace('/app');
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const cardClass =
    'w-full max-w-lg rounded-2xl border border-white/10 bg-[#24123B] p-8 text-center shadow-[0_12px_32px_rgba(0,0,0,0.3)]';
  const primaryButtonClass =
    'inline-flex w-full items-center justify-center rounded-2xl px-5 py-3 font-semibold text-white';
  const secondaryButtonClass =
    'inline-flex w-full items-center justify-center rounded-2xl border border-white/20 bg-white/[0.04] px-5 py-3 font-semibold text-white';

  return (
    <div className="min-h-screen bg-[#1A0B2E] px-4 py-8 text-white">
      <div className="mx-auto flex min-h-[80vh] max-w-3xl items-center justify-center">
        {state === 'loading' ? (
          <div className={cardClass}>
            <div className="mx-auto mb-4 h-6 w-6 animate-spin rounded-full border-2 border-[#F26955] border-t-transparent" />
            <p className="text-white/70">Loading your account status…</p>
          </div>
        ) : null}

        {state === 'reviewer_approved' ? (
          <section className={cardClass}>
            <h1 className="text-2xl font-semibold">Welcome back, reviewer</h1>
            <p className="mt-3 text-white/75">
              You&apos;re approved and ready to go. Head to your dashboard to manage requests, copy
              your profile link, and get started.
            </p>
            <div className="mt-6 space-y-3">
              <Link href="/app" className={primaryButtonClass} style={{ backgroundColor: '#F26955' }}>
                Go to my dashboard
              </Link>
            </div>
          </section>
        ) : null}

        {state === 'reviewer_pending' ? (
          <section className={cardClass}>
            <h1 className="text-2xl font-semibold">Your reviewer application is still under review</h1>
            <p className="mt-3 text-white/75">
              Thank you for your patience. We are still reviewing your application and we will email
              you as soon as a decision is made.
            </p>
            <div className="mt-6 space-y-3">
              <Link href="/" className={primaryButtonClass} style={{ backgroundColor: '#F26955' }}>
                Back to home
              </Link>
            </div>
          </section>
        ) : null}

        {state === 'reviewer_rejected' ? (
          <section className={cardClass}>
            <h1 className="text-2xl font-semibold">Application update</h1>
            <p className="mt-3 text-white/75">
              At this time, we are not able to move forward with your reviewer application. This
              decision is based on current fit and platform needs, and does not prevent you from
              applying again in the future.
            </p>
            <div className="mt-6 space-y-3">
              <Link href="/" className={primaryButtonClass} style={{ backgroundColor: '#F26955' }}>
                Back to home
              </Link>
            </div>
          </section>
        ) : null}

        {state === 'reviewee' ? (
          <section className={cardClass}>
            <div className="flex flex-col items-center">
              <h1 className="text-2xl font-semibold">You&apos;re in</h1>
              <p className="mt-3 text-white/75">
                Your account is ready. Browse reviewers, submit a request, and get honest feedback
                on your dating profile.
              </p>
              <div className="mt-6 w-full space-y-3">
                <Link href="/app" className={primaryButtonClass} style={{ backgroundColor: '#F26955' }}>
                  Go to my dashboard
                </Link>
                <Link href="/reviewers/apply" className={secondaryButtonClass}>
                  Interested in becoming a reviewer? Apply now
                </Link>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
