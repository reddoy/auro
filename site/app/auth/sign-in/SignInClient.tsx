'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import AuthStep from '@/app/request/components/AuthStep';
import { supabase } from '@/lib/supabase';

function safeReturnPath(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/waitlist';
  if (raw === '/app' || raw.startsWith('/app/')) return '/waitlist';
  if ((raw === '/request' || raw.startsWith('/request/')) && !raw.includes('internal=1')) {
    return '/waitlist';
  }
  return raw;
}

function SignInInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = useMemo(
    () => safeReturnPath(searchParams.get('redirect_to')),
    [searchParams]
  );

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (!supabase?.auth) return;

    const syncFromSession = async (session: Session | null) => {
      const u = session?.user;
      const real =
        !!u && (u as { app_metadata?: { provider?: string } }).app_metadata?.provider !== 'anon';
      if (!real || !u?.id) {
        setIsAuthenticated(false);
        return;
      }
      const { data: row, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', u.id)
        .maybeSingle();
      if (error) {
        console.warn('[SignInClient] profile check failed:', error);
        setIsAuthenticated(false);
        return;
      }
      if (!row) {
        try {
          const ensureRes = await fetch('/api/auth/ensure-profile', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              userId: u.id,
              email: u.email,
              fullName: u.user_metadata?.full_name || u.user_metadata?.name,
              avatarUrl: u.user_metadata?.avatar_url || u.user_metadata?.picture,
            }),
          });
          if (ensureRes.ok) {
            const { data: retry } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', u.id)
              .maybeSingle();
            if (retry) {
              setIsAuthenticated(true);
              return;
            }
          }
        } catch (ensureError) {
          console.warn('[SignInClient] ensure-profile failed:', ensureError);
        }
        await supabase.auth.signOut();
        setIsAuthenticated(false);
        return;
      }
      setIsAuthenticated(true);
    };

    const sync = async () => {
      const { data } = await supabase.auth.getSession();
      await syncFromSession(data.session ?? null);
    };

    void sync();

    const { data: sub } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      void syncFromSession(session);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background text-white flex flex-col">
      <div
        className="flex flex-1 flex-col justify-center px-4 py-10 sm:py-12"
        style={{ minHeight: 'calc(100dvh - var(--nav-h, 60px) - 140px)' }}
      >
        <div className="request-content px-4 max-w-6xl mx-auto py-8 w-full">
        <AuthStep
          isAuthenticated={isAuthenticated}
          onNext={() => router.replace(returnTo)}
          onBack={() => router.push('/')}
          supabase={supabase}
          oauthReturnPath={returnTo}
          continueCtaLabel="Continue"
          initialAuthTab="signin"
        />
        </div>
      </div>
    </div>
  );
}

export default function SignInClient() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#1A0B2E] text-white/70">
          Loading…
        </div>
      }
    >
      <SignInInner />
    </Suspense>
  );
}
