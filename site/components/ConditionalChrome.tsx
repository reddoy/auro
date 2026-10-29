'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import ConditionalNav from './ConditionalNav';
import BrandMark from './BrandMark';

type Props = {
  children: React.ReactNode;
};

/**
 * Marketing layout (nav + footer) for the public site; full-bleed shell only for `/app/*` (web app migration).
 */
export default function ConditionalChrome({ children }: Props) {
  const pathname = usePathname();
  const isWebApp = pathname === '/app' || pathname?.startsWith('/app/');
  const isRequestFunnel =
    pathname === '/request' || pathname?.startsWith('/request/');
  const isReviewerApplyFunnel =
    pathname === '/reviewers/apply' ||
    pathname?.startsWith('/reviewers/apply/');
  const isAuthFlow = pathname?.startsWith('/auth');
  const isMarketingHome = pathname === '/';

  useEffect(() => {
    if (!isMarketingHome || isWebApp || isRequestFunnel || isReviewerApplyFunnel || isAuthFlow) return;
    document.body.classList.add('marketing-home');
    return () => document.body.classList.remove('marketing-home');
  }, [isMarketingHome, isWebApp, isRequestFunnel, isReviewerApplyFunnel, isAuthFlow]);

  if (isWebApp || isRequestFunnel || isReviewerApplyFunnel || isAuthFlow) {
    return <>{children}</>;
  }

  return (
    <>
      <header className={`nav${isMarketingHome ? ' nav--home' : ''}`}>
        <div className="container">
          <div className="nav-content">
            <BrandMark
              size={isMarketingHome ? 'lg' : 'md'}
              className="mobile-brand-centered"
            />
            <nav className="nav-cta-section hidden md:flex">
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
              href="https://coolhand.vercel.app"
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
