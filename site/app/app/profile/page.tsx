'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCurrentProfileWeb } from '@/lib/profile-web';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';

export default function AppProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const p = await getCurrentProfileWeb();
        setProfile(p);
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
      alert('Profile link copied.');
    } catch {
      alert(url);
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-10 text-center text-white/70">Loading…</div>
    );
  }

  return (
    <div className="px-4 pb-8 pt-6">
      <div className="mx-auto max-w-lg">
        <h1 className="text-2xl font-bold text-white">Account</h1>
        <p className="mt-2 text-lg text-white/90">{displayName}</p>
        {profile?.username ? (
          <p className="text-sm text-white/70">@{profile.username}</p>
        ) : null}

        <div className="mt-8 space-y-3">
          {(profile?.is_reviewer === 'approved' || profile?.is_reviewer === 'pending') && (
            <button
              type="button"
              onClick={copyLink}
              className="w-full rounded-2xl bg-primary py-3 text-center font-bold text-primary-foreground hover:bg-primary/90"
            >
              Copy profile link
            </button>
          )}

          <Link
            href="/request"
            className="block w-full rounded-2xl border border-white/15 py-3 text-center font-semibold text-white"
          >
            Request a review
          </Link>

          <Link
            href="/reviewers/apply"
            className="block w-full rounded-2xl border border-white/15 py-3 text-center font-semibold text-white"
          >
            Reviewer application
          </Link>

          <Link
            href="/auth/sign-in"
            className="block w-full rounded-2xl border border-white/15 py-3 text-center font-semibold text-white/70"
          >
            Sign-in options
          </Link>

          <button
            type="button"
            onClick={signOut}
            className="w-full rounded-2xl py-3 text-center font-semibold text-destructive"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
