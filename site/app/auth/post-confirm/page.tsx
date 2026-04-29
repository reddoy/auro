'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ReviewerMiniFlow from './ReviewerMiniFlow';
import { supabase } from '@/lib/supabase';

type Screen = 'loading' | 'reviewee_thanks' | 'reviewer_thanks' | 'choose_role' | 'reviewer_flow';

function PostConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [screen, setScreen] = useState<Screen>('loading');

  const roleIntent = searchParams.get('role_intent');
  const postSignInHref = useMemo(() => {
    if (roleIntent === 'reviewer' || roleIntent === 'reviewee') {
      return `/auth/post-sign-in?role_intent=${encodeURIComponent(roleIntent)}`;
    }
    return '/auth/post-sign-in';
  }, [roleIntent]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!supabase?.auth) {
        router.replace('/auth/sign-in');
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
        if (res.ok) {
          const data = await res.json();
          const reviewerApproval = String(data?.reviewerApproval || '').toLowerCase();
          if (reviewerApproval === 'pending' || reviewerApproval === 'approved' || reviewerApproval === 'rejected' || reviewerApproval === 'denied') {
            router.replace('/auth/post-sign-in');
            return;
          }
        }
      } catch {
        // Continue with onboarding on transient fetch failures.
      }

      if (cancelled) return;
      if (roleIntent === 'reviewer') {
        setScreen('reviewer_thanks');
        return;
      }
      if (roleIntent === 'reviewee') {
        setScreen('reviewee_thanks');
        return;
      }
      setScreen('choose_role');
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [roleIntent, router]);

  const cardClass =
    'w-full max-w-2xl rounded-2xl border border-white/10 bg-[#24123B] p-8 text-white shadow-[0_12px_32px_rgba(0,0,0,0.3)]';
  const primaryButtonClass =
    'inline-flex w-full items-center justify-center rounded-2xl px-5 py-3 font-semibold text-white';
  const secondaryButtonClass =
    'inline-flex w-full items-center justify-center rounded-2xl border border-white/20 bg-white/[0.04] px-5 py-3 font-semibold text-white';

  return (
    <div className="min-h-screen bg-[#1A0B2E] px-4 py-8 text-white">
      <div className="mx-auto flex min-h-[80vh] max-w-4xl items-center justify-center">
        {screen === 'loading' ? (
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#24123B] p-8 text-center shadow-[0_12px_32px_rgba(0,0,0,0.3)]">
            <div className="mx-auto mb-4 h-6 w-6 animate-spin rounded-full border-2 border-[#F26955] border-t-transparent" />
            <p className="text-white/70">Preparing your account…</p>
          </div>
        ) : null}

        {screen === 'reviewee_thanks' ? (
          <section className={cardClass}>
            <h1 className="text-2xl font-semibold">Thanks for confirming your email</h1>
            <p className="mt-3 text-white/75">
              You&apos;re officially in. Welcome to Auro. Your account is ready to request your first
              review whenever you are.
            </p>
            <div className="mt-6 grid gap-3">
              <Link href="/request" className={primaryButtonClass} style={{ backgroundColor: '#F26955' }}>
                Get reviewed
              </Link>
              <Link href={postSignInHref} className={secondaryButtonClass}>
                Continue to app
              </Link>
            </div>
          </section>
        ) : null}

        {screen === 'reviewer_thanks' ? (
          <section className={cardClass}>
            <div className="grid gap-6 md:grid-cols-[112px,1fr] md:items-start">
              <div className="mx-auto h-28 w-28 overflow-hidden rounded-full border border-white/15 bg-white/5">
                <Image
                  src="/rohan%20headshot%20backyard-min.jpg"
                  alt="Auro founder message"
                  width={112}
                  height={112}
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <h1 className="text-2xl font-semibold">Thanks for signing up</h1>
                <p className="mt-3 text-white/75">
                  I&apos;m RJ, founder of Auro. I appreciate you raising your hand to be a reviewer.
                  We&apos;re building a curated, high-quality community, and your application helps us do that right.
                </p>
                <p className="mt-3 text-white/70">
                  Next, set your rate, add your profile photo, and confirm reviewer expectations.
                </p>
                <div className="mt-6 grid gap-3">
                  <button
                    type="button"
                    onClick={() => setScreen('reviewer_flow')}
                    className={primaryButtonClass}
                    style={{ backgroundColor: '#F26955' }}
                  >
                    Continue reviewer setup
                  </button>
                  <Link href="/app" className={secondaryButtonClass}>
                    I&apos;ll do this later
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {screen === 'choose_role' ? (
          <section className={cardClass}>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-white/20 bg-white/5">
                  <Image
                    src="/rohan%20headshot%20backyard-min.jpg"
                    alt="RJ founder portrait"
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/55">Founder note</p>
                  <h1 className="mt-1 text-2xl font-semibold">Thanks for confirming your email</h1>
                  <p className="mt-2 text-white/75">
                    I&apos;m RJ, founder of Auro. Thanks for signing up. Choose your path below and
                    we&apos;ll tailor your next steps right away.
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-5 text-left text-sm text-white/70">
              Quick question so we can set up your account properly: do you want to get reviewed, or
              do you want to become a reviewer?
            </p>

            <div className="mt-4 grid gap-3">
              <button
                type="button"
                onClick={() => setScreen('reviewee_thanks')}
                className="rounded-2xl border border-[#F26955]/40 bg-gradient-to-r from-[#F26955] to-[#DF5A47] px-5 py-4 text-left text-white transition hover:brightness-105"
              >
                <p className="text-base font-semibold">I want to get reviewed</p>
                <p className="mt-1 text-sm text-white/85">
                  Submit your profile and get clear, honest feedback fast.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setScreen('reviewer_thanks')}
                className="rounded-2xl border border-white/20 bg-white/[0.04] px-5 py-4 text-left text-white transition hover:bg-white/[0.07]"
              >
                <p className="text-base font-semibold">I want to be a reviewer</p>
                <p className="mt-1 text-sm text-white/75">
                  Set your rate, complete setup, and apply to join the reviewer community.
                </p>
              </button>
              <Link
                href="/auth/post-sign-in"
                className="rounded-2xl border border-white/15 bg-transparent px-5 py-3 text-center text-sm font-semibold text-white/80 transition hover:border-white/25 hover:text-white"
              >
                I&apos;m not sure yet
              </Link>
            </div>
          </section>
        ) : null}

        {screen === 'reviewer_flow' ? <ReviewerMiniFlow returnHref="/auth/post-sign-in?role_intent=reviewer" /> : null}
      </div>
    </div>
  );
}

function PostConfirmFallback() {
  return (
    <div className="min-h-screen bg-[#1A0B2E] px-4 py-8 text-white">
      <div className="mx-auto flex min-h-[80vh] max-w-4xl items-center justify-center">
        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#24123B] p-8 text-center shadow-[0_12px_32px_rgba(0,0,0,0.3)]">
          <div className="mx-auto mb-4 h-6 w-6 animate-spin rounded-full border-2 border-[#F26955] border-t-transparent" />
          <p className="text-white/70">Loading…</p>
        </div>
      </div>
    </div>
  );
}

export default function PostConfirmPage() {
  return (
    <Suspense fallback={<PostConfirmFallback />}>
      <PostConfirmContent />
    </Suspense>
  );
}
