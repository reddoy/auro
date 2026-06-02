'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import LandingCTAs from '../LandingCTAs';

export default function LandingStickyCTA() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="landing-sticky-cta lg:hidden" role="region" aria-label="Quick actions">
      <LandingCTAs variant="hero" tone="mobileHero" />
    </div>,
    document.body
  );
}
