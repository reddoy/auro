'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AppQueryProvider from './AppQueryProvider';
import AppShell from './AppShell';
import AppToastProvider from './AppToastProvider';
import { AppChromeSkeleton } from './app-skeletons';

function isPublicAppPath(pathname: string | null): boolean {
  if (!pathname) return false;
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
        const next = encodeURIComponent(pathname || '/app');
        router.replace(`/auth/sign-in?redirect_to=${next}`);
        return;
      }
      setReady(true);
    };

    void run();
  }, [publicPath, pathname, router]);

  if (!ready) {
    return <AppChromeSkeleton />;
  }

  return (
    <AppQueryProvider>
      <AppToastProvider>
        <AppShell>{children}</AppShell>
      </AppToastProvider>
    </AppQueryProvider>
  );
}
