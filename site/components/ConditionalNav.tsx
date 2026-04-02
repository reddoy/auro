'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
  const isOnRequestFlow = pathname === '/request' || pathname?.startsWith('/request/');

  return (
    <div className="conditional-nav" style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      <Link
        href="/auth/magic-link"
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

      {!isOnApplyPage && (
        <Link className="cta-nav-integrated" href="/reviewers/apply">
          <div className="cta-text-section">
            <span className="cta-main-text">Become a Reviewer</span>
          </div>
        </Link>
      )}

      {!isOnRequestFlow && (
        <Link className="cta-nav cta-nav--get-reviewed" href="/request">
          Get Reviewed
        </Link>
      )}
    </div>
  );
}
