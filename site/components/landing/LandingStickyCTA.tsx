'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import LandingCTAs from '../LandingCTAs';

export default function LandingStickyCTA() {
  const [mounted, setMounted] = useState(false);
  const [barVisible, setBarVisible] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const footer = document.querySelector('footer');
    if (!footer) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setBarVisible(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '0px 0px -48px 0px' }
    );

    observer.observe(footer);
    return () => observer.disconnect();
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={`landing-sticky-cta lg:hidden${barVisible ? '' : ' landing-sticky-cta--dismissed'}`}
      role="region"
      aria-label="Quick actions"
      aria-hidden={!barVisible}
    >
      <LandingCTAs variant="hero" tone="mobileHero" />
    </div>,
    document.body
  );
}
