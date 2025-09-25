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
    <a className="cta-nav" href="/reviewers/apply">
      Become a Founding Reviewer
    </a>
  );
}
