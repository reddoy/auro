'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AppShell from './AppShell';

function isPublicAppPath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === '/app') return true;
  if (pathname === '/app/intro' || pathname.startsWith('/app/intro/')) return true;
  return false;
}

export default function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const publicPath = useMemo(() => isPublicAppPath(pathname), [pathname]);
  const [ready, setReady] = useState(publicPath);

  useEffect(() => {
    if (publicPath) {
      setReady(true);
      return;
    }

    const run = async () => {
      if (!supabase) {
        router.replace('/app/intro');
        return;
      }
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        const next = encodeURIComponent(pathname || '/app/requests');
        router.replace(`/auth/sign-in?redirect_to=${next}`);
        return;
      }
      setReady(true);
    };

    void run();
  }, [publicPath, pathname, router]);

  if (!ready) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-4">
        <div
          className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary/25 border-t-primary"
          aria-hidden
        />
        <p className="text-sm text-white/70">Loading…</p>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
