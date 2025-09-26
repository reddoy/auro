'use client';

import { usePathname } from 'next/navigation';

export default function ConditionalNav() {
  const pathname = usePathname();
  
  // Hide the "Become a Founding Reviewer" button when on the apply page or its sub-pages
  const isOnApplyPage = pathname?.startsWith('/reviewers/apply') || pathname?.startsWith('/reviewers/thanks');
  
  if (isOnApplyPage) {
    return null;
  }
  
  return (
    <div className="nav-cta-group">
      <a className="cta-nav" href="/reviewers/apply">
        Become Founding Reviewer
      </a>
    </div>
  );
}
