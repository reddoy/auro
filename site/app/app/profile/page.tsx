'use client';

import WebAvatarUploader from '@/components/WebAvatarUploader';
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [p, authRes] = await Promise.all([getCurrentProfileWeb(), supabase?.auth.getUser()]);
        setProfile(p);
        setUserEmail(authRes?.data?.user?.email ?? null);
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
    profile?.username ||
    'Account';

  const persistAvatarPath = useCallback(async (path: string | null) => {
    if (!supabase) return false;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      setToast('Sign in again to update your photo');
      window.setTimeout(() => setToast(null), 3200);
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
      setToast(e instanceof Error ? e.message : 'Could not save photo');
      window.setTimeout(() => setToast(null), 3200);
      return false;
    } finally {
      setSavingAvatar(false);
    }
  }, []);

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

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
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

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4">
        <div
          className="h-9 w-9 animate-spin rounded-full border-2 border-primary/25 border-t-primary"
          aria-hidden
        />
        <p className="text-sm text-white/60">Loading account…</p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-10 pt-5">
      {toast ? (
        <div
          className="fixed left-1/2 z-[60] max-w-[min(92vw,24rem)] -translate-x-1/2 rounded-full border border-white/15 bg-[#1a0f2e]/95 px-4 py-2.5 text-center text-sm text-white shadow-lg backdrop-blur-md"
          style={{ bottom: 'calc(88px + env(safe-area-inset-bottom, 0px))' }}
          role="status"
        >
          {toast}
        </div>
      ) : null}
      <div className="mx-auto max-w-lg">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">Account</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-white">Your profile</h1>
        <p className="mt-1 text-sm text-white/60">Photo, link, and sign-in</p>

        <section
          className="glass mt-6 rounded-2xl border border-white/[0.12] p-6"
          aria-label="Profile photo"
        >
          <div className="flex flex-col items-center gap-1">
            <div className={savingAvatar ? 'pointer-events-none opacity-70' : ''}>
              <WebAvatarUploader
                currentAvatarUrl={profileAvatarViewUrl(profile?.avatar_url)}
                onAvatarChange={handleAvatarChange}
                size={112}
                ownerFirstName={profile?.first_name ?? null}
                ownerLastName={profile?.last_name ?? null}
                ownerId={profile?.id ?? null}
                ownerEmail={userEmail}
              />
            </div>
            <p className="mt-4 text-center text-lg font-semibold text-white">{displayName}</p>
            {profile?.username ? (
              <p className="text-center text-sm text-white/55">@{profile.username}</p>
            ) : null}
            {savingAvatar ? (
              <p className="mt-2 text-center text-xs text-white/50">Saving…</p>
            ) : null}
          </div>
        </section>

        <div className="mt-8 space-y-3">
          {(profile?.is_reviewer === 'approved' || profile?.is_reviewer === 'pending') && (
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
      </div>
    </div>
  );
}
