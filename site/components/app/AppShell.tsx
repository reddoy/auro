'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const nav = [
  { href: '/app/requests', label: 'My reviews' },
  { href: '/request', label: 'New request' },
  { href: '/app/profile', label: 'Profile' },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/app') {
    return <>{children}</>;
  }
  const isActive = (href: string) =>
    href === '/app/requests'
      ? pathname === href || pathname?.startsWith('/app/requests/')
      : pathname === href || pathname?.startsWith(href + '/');

  return (
    <div className="flex min-h-[100dvh] flex-col pb-[calc(72px+env(safe-area-inset-bottom,0px))]">
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
          {nav.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center justify-center rounded-xl py-2 text-center text-xs font-semibold transition-colors ${
                isActive(href) ? 'text-white' : 'text-white/60 hover:text-white/90'
              }`}
            >
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
