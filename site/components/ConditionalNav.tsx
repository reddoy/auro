'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LandingCTAs from './LandingCTAs';

const signInLinkStyle: React.CSSProperties = {
  color: 'white',
  textDecoration: 'none',
  fontWeight: 500,
  fontSize: '15px',
  transition: 'opacity 0.2s ease',
  cursor: 'pointer',
  opacity: 0.9,
};

export default function ConditionalNav() {
  const pathname = usePathname();

  const isOnApplyPage =
    pathname?.startsWith('/reviewers/apply') || pathname?.startsWith('/reviewers/thanks');
  const isOnRequestFlow =
    pathname === '/request' ||
    pathname?.startsWith('/request/') ||
    false;

  return (
    <div
      className="conditional-nav"
      style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap', justifyContent: 'flex-end' }}
    >
      <Link
        href="/auth/sign-in"
        className="nav-signin-link relative z-[1]"
        style={signInLinkStyle}
        onMouseOver={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.opacity = '0.9';
        }}
      >
        Sign In
      </Link>

      <div className="nav-ribbon-ctas" aria-label="Primary actions">
        <LandingCTAs
          variant="nav"
          showBecomeReviewer={!isOnApplyPage}
          showGetReviewed={!isOnRequestFlow}
        />
      </div>
    </div>
  );
}
