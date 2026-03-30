'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getCurrentProfileWeb } from '@/lib/profile-web';
import { resolveOnboardingDestination } from '@shared/lib/profile-routing';
import { mapExpoRouterPathToNext } from '@/lib/app-paths';

export default function AppGateClient() {
  const router = useRouter();
  const [message, setMessage] = useState('Loading…');

  useEffect(() => {
    const run = async () => {
      try {
        if (!supabase) {
          router.replace('/app/intro');
          return;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('[app gate] session error', error.message);
          router.replace('/app/intro');
          return;
        }

        if (!data.session) {
          router.replace('/app/intro');
          return;
        }

        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
          router.replace('/app/intro');
          return;
        }

        try {
          const profile = await getCurrentProfileWeb();
          const expoPath = resolveOnboardingDestination(profile);
          router.replace(mapExpoRouterPathToNext(expoPath));
        } catch (err) {
          console.warn('[app gate] profile load failed', err);
          router.replace('/app/requests');
        }
      } catch (e) {
        console.error('[app gate]', e);
        setMessage('Something went wrong. Try refreshing.');
      }
    };
    run();
  }, [router]);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        gap: 16,
      }}
    >
      <div
        className="h-10 w-10 animate-spin rounded-full border-[3px] border-[rgba(255,45,85,0.25)] border-t-[#FF2D55]"
        aria-hidden
      />
      <p style={{ color: '#C7BFD9', fontSize: 15 }}>{message}</p>
    </div>
  );
}
