'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import LandingCTAs from '../LandingCTAs';

function isFooterNearViewport(footer: Element): boolean {
  const { top } = footer.getBoundingClientRect();
  return top < window.innerHeight - 48;
}

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

    const syncVisibility = () => {
      setBarVisible(!isFooterNearViewport(footer));
    };

    syncVisibility();

    const observer = new IntersectionObserver(
      ([entry]) => {
        setBarVisible(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '0px 0px -48px 0px' }
    );

    observer.observe(footer);

    const scrollTargets: Array<EventTarget | null> = [
      window,
      document,
      document.documentElement,
      document.body,
    ];

    scrollTargets.forEach((target) => {
      target?.addEventListener('scroll', syncVisibility, { passive: true });
    });
    window.addEventListener('resize', syncVisibility);
    window.addEventListener('load', syncVisibility);

    const recheckTimers = [0, 400, 1200].map((delay) => window.setTimeout(syncVisibility, delay));
    const resizeObserver = new ResizeObserver(syncVisibility);
    resizeObserver.observe(document.body);

    return () => {
      observer.disconnect();
      scrollTargets.forEach((target) => {
        target?.removeEventListener('scroll', syncVisibility);
      });
      window.removeEventListener('resize', syncVisibility);
      window.removeEventListener('load', syncVisibility);
      recheckTimers.forEach((timer) => window.clearTimeout(timer));
      resizeObserver.disconnect();
    };
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={`landing-sticky-cta${barVisible ? '' : ' landing-sticky-cta--dismissed'}`}
      role="region"
      aria-label="Quick actions"
      aria-hidden={!barVisible}
    >
      <LandingCTAs variant="hero" tone="mobileHero" />
    </div>,
    document.body
  );
}
