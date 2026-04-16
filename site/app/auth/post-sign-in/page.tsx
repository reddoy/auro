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
        if (!cancelled) setState('reviewee');
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
          if (!cancelled) setState('reviewee');
          return;
        }
        const data = await res.json();
        const reviewerApproval = String(data?.reviewerApproval || '').toLowerCase();

        if (reviewerApproval === 'approved') {
          if (!cancelled) setState('reviewer_approved');
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

        if (!cancelled) setState('reviewee');
      } catch {
        if (!cancelled) setState('reviewee');
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
            <h1 className="text-2xl font-semibold">You have been accepted as a reviewer</h1>
            <p className="mt-3 text-white/75">
              We are almost launched. I will notify you as soon as we go live. Thank you for signing
              up, and congrats on becoming a reviewer. We are happy to have you in the community.
            </p>
            <div className="mt-6 space-y-3">
              <Link href="/" className={primaryButtonClass} style={{ backgroundColor: '#F26955' }}>
                Back to home
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
              <img
                src="/rohan%20headshot%20backyard-min.jpg"
                alt="RJ, founder of Auro"
                width={88}
                height={88}
                className="mb-5 h-[88px] w-[88px] rounded-full object-cover ring-2 ring-white/10"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/rohan-headshot.jpg';
                }}
              />
              <h1 className="text-2xl font-semibold">You are on the list</h1>
              <p className="mt-3 text-white/75">
                Thanks for signing in. I will notify you once reviewers are open for business.
              </p>
              <div className="mt-6 w-full space-y-3">
                <Link href="/" className={primaryButtonClass} style={{ backgroundColor: '#F26955' }}>
                  Back to home
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
