'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import AuthStep from '@/app/request/components/AuthStep';
import { supabase } from '@/lib/supabase';

function safeReturnPath(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/app';
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

    const sync = async () => {
      const { data } = await supabase.auth.getSession();
      const u = data.session?.user;
      const real = !!u && (u as { app_metadata?: { provider?: string } }).app_metadata?.provider !== 'anon';
      setIsAuthenticated(real);
    };

    void sync();

    const { data: sub } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      const u = session?.user;
      const real = !!u && (u as { app_metadata?: { provider?: string } }).app_metadata?.provider !== 'anon';
      setIsAuthenticated(real);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background text-white">
      <div className="request-content px-4 max-w-6xl mx-auto py-8">
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
