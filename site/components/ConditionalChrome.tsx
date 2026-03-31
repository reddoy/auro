'use client';

import { usePathname } from 'next/navigation';
import ConditionalNav from './ConditionalNav';

type Props = {
  children: React.ReactNode;
};

/**
 * Marketing layout (nav + footer) for the public site; full-bleed shell only for `/app/*` (web app migration).
 */
export default function ConditionalChrome({ children }: Props) {
  const pathname = usePathname();
  const isWebApp = pathname === '/app' || pathname?.startsWith('/app/');

  if (isWebApp) {
    return <>{children}</>;
  }

  return (
    <>
      <header className="nav">
        <div className="container">
          <div className="nav-content">
            <a href="/" className="brand mobile-brand-centered" aria-label="Auro Home">
              <img
                src="/auro_aura_logo.png"
                alt="Auro logo"
                width={40}
                height={40}
                style={{ borderRadius: 12 }}
              />
              <span className="brand__name">Auro</span>
            </a>
            <nav className="nav-cta-section">
              <ConditionalNav />
            </nav>
          </div>
        </div>
      </header>
      <main style={{ padding: 0 }}>{children}</main>
      <footer>
        <div className="container footer__inner">
          <div className="text-center sm:text-left">
            <a
              href="https://coolhandstudios.xyz"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--text-2)', textDecoration: 'none' }}
            >
              © {new Date().getFullYear()} Cool Hand Studios LLC
            </a>
            <span style={{ color: 'var(--text-2)' }}> · All rights reserved.</span>
          </div>
          <div className="footer__links">
            <a href="/">Home</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/contact">Contact</a>
            <a href="/support">Support</a>
          </div>
        </div>
      </footer>
    </>
  );
}
