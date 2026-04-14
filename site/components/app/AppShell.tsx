'use client';

import { Home, ListChecks, UserRound } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const nav = [
  { href: '/app', label: 'Home', Icon: Home },
  { href: '/app/requests?tab=active', label: 'My reviews', Icon: ListChecks },
  { href: '/app/profile', label: 'Account', Icon: UserRound },
] as const;

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/app/intro' || pathname?.startsWith('/app/intro/')) {
    return <>{children}</>;
  }
  const isActive = (href: string) => {
    if (href === '/app') return pathname === '/app' || pathname === '/app/';
    if (href.startsWith('/app/requests'))
      return pathname === '/app/requests' || pathname?.startsWith('/app/requests/');
    return pathname === href || pathname?.startsWith(href + '/');
  };

  return (
    <div className="flex min-h-[100dvh] flex-col pb-[calc(72px+env(safe-area-inset-bottom,0px))]">
      <header
        className="sticky top-0 z-30 border-b border-white/[0.08] backdrop-blur-xl"
        style={{
          background: 'color-mix(in srgb, #0C0225 92%, transparent)',
          paddingTop: 'max(10px, env(safe-area-inset-top))',
        }}
      >
        <div className="mx-auto flex max-w-lg items-center justify-center px-4 pb-3">
          <Link
            href="/app"
            className="flex items-center gap-2.5 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0C0225] rounded-md"
            aria-label="Auro — home"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- static mark; avoid /_next/image for crisp small asset */}
            <img
              src="/auro_aura_logo.png"
              alt=""
              width={40}
              height={40}
              decoding="async"
              fetchPriority="high"
              className="h-10 w-10 shrink-0 object-contain"
              aria-hidden
            />
            <span className="text-lg font-semibold tracking-tight text-white">Auro</span>
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 px-2 pt-2"
        style={{
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
          background: '#0C0325',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.35)',
        }}
        aria-label="App navigation"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around gap-1">
          {nav.map(({ href, label, Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-1 flex-col items-center justify-center rounded-xl py-2 text-center text-xs font-semibold transition-colors ${
                  active ? 'text-white' : 'text-white/60 hover:text-white/90'
                }`}
              >
                <Icon
                  className={`mb-0.5 h-5 w-5 ${active ? 'text-primary' : 'text-white/55'}`}
                  strokeWidth={active ? 2.25 : 2}
                  aria-hidden
                />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
