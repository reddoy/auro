'use client';

import { usePathname } from 'next/navigation';

export default function ConditionalNav() {
  const pathname = usePathname();
  
  // Hide the apply button when on the apply flow pages
  const isOnApplyPage = pathname?.startsWith('/reviewers/apply') || pathname?.startsWith('/reviewers/thanks');
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
      {/* Sign In - Always visible */}
      <a 
        href="https://app.appauro.com" 
        style={{
          color: 'white',
          textDecoration: 'none',
          fontWeight: '500',
          fontSize: '15px',
          transition: 'opacity 0.2s ease',
          cursor: 'pointer',
          opacity: 0.9
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.opacity = '0.9';
        }}
      >
        Sign In
      </a>
      
      {/* Become Reviewer button - hidden on apply page */}
      {!isOnApplyPage && (
        <a className="cta-nav-integrated" href="/reviewers/apply">
          <div className="cta-text-section">
            <span className="cta-main-text">Become a Reviewer</span>
            <span className="cta-sub-text">80% to reviewer • 20% platform fee</span>
          </div>
        </a>
      )}
    </div>
  );
}
