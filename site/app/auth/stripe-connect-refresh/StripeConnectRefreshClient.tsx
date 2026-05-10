'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Stripe sends users here when an Account Link onboarding session expires.
 * Immediately requests a fresh Account Link so onboarding can resume.
 */
export default function StripeConnectRefreshClient() {
  const router = useRouter();
  const [status, setStatus] = useState<'working' | 'error'>('working');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    (async () => {
      if (!supabase) {
        setStatus('error');
        setErrorMessage('Configuration error — refresh this page.');
        return;
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        router.replace(`/auth/sign-in?redirect_to=${encodeURIComponent('/auth/stripe-connect-refresh')}`);
        return;
      }

      try {
        const res = await fetch('/api/stripe/express-onboarding', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            returnUrl: `${window.location.origin}/auth/stripe-connect-success`,
          }),
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          const errPayload = data as {
            error?: string;
            stripeCode?: string | null;
            stripeRequestId?: string | null;
            stripeType?: string | null;
          };
          console.warn('[stripe/connect-refresh] express-onboarding failed', {
            status: res.status,
            ...errPayload,
          });
          const suffix = errPayload.stripeCode ? ` (${errPayload.stripeCode})` : '';
          throw new Error((errPayload.error || 'Unable to resume Stripe onboarding') + suffix);
        }

        const redirectUrl = (data as { url?: string }).url;
        if (!redirectUrl) throw new Error('Stripe link was not returned');
        window.location.assign(redirectUrl);
      } catch (e) {
        setStatus('error');
        console.warn('[stripe/connect-refresh]', e);
        setErrorMessage(e instanceof Error ? e.message : 'Unable to resume Stripe onboarding');
      }
    })();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1A0B2E] px-4">
      <div
        className="w-full max-w-md rounded-2xl p-8"
        style={{ backgroundColor: '#24123B', boxShadow: '0 12px 32px rgba(0,0,0,0.3)' }}
      >
        <div className="flex flex-col items-center text-center">
          {status === 'working' ? (
            <>
              <div
                className="mb-3 h-6 w-6 animate-spin rounded-full border-2 border-[#F26955] border-t-transparent"
                aria-hidden
              />
              <p className="text-white/85">Reconnecting you to Stripe…</p>
              <p className="mt-2 text-sm text-white/55">Refreshing your onboarding link.</p>
            </>
          ) : (
            <>
              <h1 className="text-lg font-semibold text-white">Could not resume onboarding</h1>
              {errorMessage ? (
                <p className="mt-2 text-sm text-amber-100/90" role="alert">
                  {errorMessage}
                </p>
              ) : null}
              <p className="mt-2 text-sm text-white/60">
                Open your profile and try Connect Stripe again, or sign in from the account you use as a reviewer.
              </p>
              <div className="mt-6 grid w-full gap-3">
                <Link
                  href="/app/profile"
                  className="block w-full rounded-2xl px-5 py-3 text-center text-sm font-semibold"
                  style={{ color: '#EDE8F7', backgroundColor: '#2C1746', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  Open profile
                </Link>
                <Link
                  href="/auth/sign-in"
                  className="block w-full rounded-2xl border border-white/18 px-5 py-3 text-center text-sm font-semibold text-white/86"
                  style={{ color: '#EDE8F7', backgroundColor: 'transparent' }}
                >
                  Sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
