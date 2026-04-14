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
  const stripeConnected = !!profile?.stripe_connect_account_id?.trim();

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

          {reviewerish ? (
            <section
              className="glass mt-4 rounded-2xl border border-white/[0.12] px-4 py-4"
              aria-label="Stripe Connect"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
                Stripe payouts
              </p>
              <p className="mt-2 text-sm text-white/80">
                {stripeConnected ? (
                  <>
                    <span className="font-medium text-emerald-400/95">Connected</span>
                    <span className="text-white/55"> — you can receive payouts for completed reviews.</span>
                  </>
                ) : (
                  <>
                    <span className="font-medium text-amber-300/95">Not connected</span>
                    <span className="text-white/55">
                      {' '}
                      — finish Stripe from your reviewer application flow to get paid.
                    </span>
                  </>
                )}
              </p>
              {!stripeConnected ? (
                <Link
                  href="/reviewers/apply"
                  className="mt-3 inline-flex text-sm font-semibold text-primary"
                >
                  Open reviewer setup →
                </Link>
              ) : null}
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
              href="/waitlist"
              className="block w-full rounded-2xl border border-white/[0.14] bg-white/[0.04] py-3.5 text-center text-[15px] font-semibold text-white transition hover:border-white/25 hover:bg-white/[0.07] active:scale-[0.99] motion-reduce:transform-none"
            >
              Join review waitlist
            </Link>

            <Link
              href="/reviewers/apply"
              className="block w-full rounded-2xl border border-white/[0.14] bg-white/[0.04] py-3.5 text-center text-[15px] font-semibold text-white transition hover:border-white/25 hover:bg-white/[0.07] active:scale-[0.99] motion-reduce:transform-none"
            >
              Reviewer application
            </Link>

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
