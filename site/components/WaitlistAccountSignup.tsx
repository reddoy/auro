'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const WAITLIST_PENDING_KEY = 'auro_waitlist_pending_signup';

type PendingWaitlistSignup = {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  source: string;
  createdAt: number;
};

type Props = {
  source?: string;
};

function normalizePhone(value: string): string {
  return value.trim();
}

function hasValidPhone(value: string): boolean {
  return value.replace(/\D/g, '').length >= 10;
}

export default function WaitlistAccountSignup({ source = 'waitlist_page_signup' }: Props) {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [awaitingEmailConfirmation, setAwaitingEmailConfirmation] = useState(false);

  const fullName = useMemo(
    () => `${firstName.trim()} ${lastName.trim()}`.trim(),
    [firstName, lastName]
  );

  useEffect(() => {
    let cancelled = false;

    const completePendingGoogleSignup = async () => {
      if (!supabase?.auth) return;

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user?.id || cancelled) return;

        const raw = localStorage.getItem(WAITLIST_PENDING_KEY);
        if (!raw) return;

        const pending = JSON.parse(raw) as PendingWaitlistSignup;
        if (!pending?.phoneNumber || !pending?.firstName || !pending?.lastName) return;
        if (!hasValidPhone(pending.phoneNumber)) return;

        const resolvedFirstName =
          session.user.user_metadata?.given_name ||
          session.user.user_metadata?.first_name ||
          pending.firstName;
        const resolvedLastName =
          session.user.user_metadata?.family_name ||
          session.user.user_metadata?.last_name ||
          pending.lastName;
        const resolvedFullName = `${resolvedFirstName} ${resolvedLastName}`.trim();
        const resolvedEmail = session.user.email || null;

        await fetch('/api/auth/ensure-profile', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            userId: session.user.id,
            email: resolvedEmail,
            fullName: resolvedFullName,
          }),
        });

        await fetch('/api/waitlist', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            userId: session.user.id,
            email: resolvedEmail,
            fullName: resolvedFullName,
            phoneNumber: normalizePhone(pending.phoneNumber),
            source: pending.source || source,
          }),
        });

        localStorage.removeItem(WAITLIST_PENDING_KEY);
        if (!cancelled) {
          router.replace('/auth/thank-you?from=waitlist');
        }
      } catch (e) {
        console.warn('[WaitlistAccountSignup] Failed to complete Google waitlist signup:', e);
      }
    };

    void completePendingGoogleSignup();
    return () => {
      cancelled = true;
    };
  }, [router, source]);

  const handleEmailSignup = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter your first and last name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (!hasValidPhone(phoneNumber)) {
      setError('Please enter a valid phone number.');
      return;
    }

    setLoading(true);
    setError('');
    setAwaitingEmailConfirmation(false);

    try {
      const siteUrl = typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL || 'https://www.appauro.com';

      const redirectTo = `${siteUrl}/auth/confirm?type=signup`;
      const normalizedEmail = email.trim().toLowerCase();

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            full_name: fullName,
          },
          emailRedirectTo: redirectTo,
        },
      });

      if (signUpError) throw signUpError;
      if (!data.user) throw new Error('Unable to create account. Please try again.');

      await fetch('/api/auth/ensure-profile', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          userId: data.user.id,
          email: normalizedEmail,
          fullName,
        }),
      });

      await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          userId: data.user.id,
          email: normalizedEmail,
          fullName,
          phoneNumber: normalizePhone(phoneNumber),
          source,
        }),
      });

      if (data.session) {
        router.replace('/auth/thank-you?from=waitlist');
        return;
      }

      setAwaitingEmailConfirmation(true);
      setPassword('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Sign up failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError('Enter first and last name before continuing with Google.');
      return;
    }
    if (!hasValidPhone(phoneNumber)) {
      setError('Enter your phone number before continuing with Google.');
      return;
    }
    if (!supabase?.auth) {
      setError('Authentication service is not available. Please refresh and try again.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const payload: PendingWaitlistSignup = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: normalizePhone(phoneNumber),
        source,
        createdAt: Date.now(),
      };
      localStorage.setItem(WAITLIST_PENDING_KEY, JSON.stringify(payload));

      const oauthReturn = '/waitlist?waitlist_google=1';
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect_to=${encodeURIComponent(oauthReturn)}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (oauthError) throw oauthError;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Google sign in failed.';
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-white/[0.1] bg-white/[0.03] p-6 shadow-xl shadow-black/25 md:p-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/95">
        Join waitlist
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
        Create your account to join
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-white/75 md:text-base">
        We only need your first name, last name, email, and phone. We will notify you once
        reviewers are open for business.
      </p>

      {awaitingEmailConfirmation ? (
        <div className="mt-6 rounded-xl border border-primary/25 bg-primary/10 p-4 text-sm text-primary-foreground/95">
          Check your email for the confirmation link to finish setup. After confirming, you will land
          on the thank-you page.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              className="h-11 rounded-xl border border-white/15 bg-white/[0.06] px-4 text-sm text-white placeholder:text-white/40 focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              className="h-11 rounded-xl border border-white/15 bg-white/[0.06] px-4 text-sm text-white placeholder:text-white/40 focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
          </div>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="h-11 w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 text-sm text-white placeholder:text-white/40 focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/25"
          />

          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="Phone number"
            className="h-11 w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 text-sm text-white placeholder:text-white/40 focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/25"
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 6 characters)"
            className="h-11 w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 text-sm text-white placeholder:text-white/40 focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/25"
          />

          {error ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={handleEmailSignup}
            disabled={loading}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Creating account…' : 'Create account & join waitlist'}
          </button>

          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={loading}
            className="w-full rounded-xl border border-white/20 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Continue with Google
          </button>

          <p className="text-center text-xs text-white/55">
            Already have an account?{' '}
            <Link href="/auth/sign-in" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      )}
    </section>
  );
}
