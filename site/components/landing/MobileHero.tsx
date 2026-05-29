'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { CheckCircle, Users, MessageSquare, CalendarCheck } from 'lucide-react';
import LandingCTAs from '../LandingCTAs';

function revealProps(visible: boolean, delayMs: number, extraClass = '') {
  const base = `mobile-text-reveal${visible ? ' is-visible' : ''}`;
  return {
    className: extraClass ? `${base} ${extraClass}` : base,
    style: { ['--reveal-delay' as string]: `${delayMs}ms` } as CSSProperties,
  };
}

export default function MobileHero() {
  const [revealed, setRevealed] = useState(false);
  const mobileVideoRef = useRef<HTMLVideoElement>(null);
  const mobileOverlayRef = useRef<HTMLAnchorElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const [showStickyCta, setShowStickyCta] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const video = mobileVideoRef.current;
    const overlay = mobileOverlayRef.current;
    if (!video || !overlay) return;

    const handleVideoEnd = () => {
      overlay.style.opacity = '1';
      overlay.style.pointerEvents = 'auto';
      setTimeout(() => {
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
        video.currentTime = 0;
        video.play();
      }, 5000);
    };

    const handleVideoClick = (e: MouseEvent) => {
      if (e.target === video) {
        video.muted = !video.muted;
      }
    };

    video.addEventListener('ended', handleVideoEnd);
    video.addEventListener('click', handleVideoClick);
    return () => {
      video.removeEventListener('ended', handleVideoEnd);
      video.removeEventListener('click', handleVideoClick);
    };
  }, []);

  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyCta(!entry.isIntersecting),
      { threshold: 0, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div className="mobile-hero-shell container relative z-10 mx-auto px-4 pb-14 pt-6 sm:pt-8 lg:hidden">
        <div className="mobile-hero-ambient pointer-events-none" aria-hidden>
          <div className="mobile-hero-bg absolute inset-0" />
          <div
            className="mobile-floating-orb mobile-floating-orb--a"
            style={{ width: 120, height: 120, top: '8%', left: '-12%' }}
          />
          <div
            className="mobile-floating-orb mobile-floating-orb--b"
            style={{ width: 80, height: 80, top: '22%', right: '-8%' }}
          />
          <div className="mobile-hero-vignette absolute inset-0" />
        </div>

        <div className="mobile-hero-content relative z-10 flex w-full flex-col items-center space-y-5 text-center">
          {/* Phone first — product-led */}
          <div {...revealProps(revealed, 80, 'w-full')}>
            <div className="mobile-iphone-container mobile-iphone-container--hero">
              <div className="mobile-iphone-glow" />
              <div className="mobile-iphone-shadow" />
              <div className="mobile-iphone-frame mobile-iphone-frame--hero">
                <video
                  ref={mobileVideoRef}
                  className="mobile-iphone-video"
                  src="/katie_demo.mov"
                  autoPlay
                  playsInline
                  muted
                  aria-label="Demo video showing how a sample review works"
                />
                <a
                  ref={mobileOverlayRef}
                  href="/reviewers/apply"
                  className="mobile-iphone-overlay"
                  aria-label="Watch a sample review in the product demo"
                >
                  <div className="overlay-content">
                    <h3>Watch a full example review</h3>
                    <p>Real feedback on photos and prompts</p>
                  </div>
                </a>
              </div>
            </div>
          </div>

          <div {...revealProps(revealed, 180, 'w-full space-y-4 px-1')}>
            <h1 className="mobile-heading-responsive max-w-lg hyphens-none text-balance font-bold leading-tight tracking-[-0.02em] text-white">
              <span className="[text-wrap:balance]">
                Get dating profile feedback{' '}
                <span className="bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                  from real women
                </span>
              </span>
            </h1>

            <p className="mx-auto max-w-md text-pretty text-base font-medium leading-relaxed text-white/85 sm:text-lg">
              Honest feedback from women you&apos;d actually want to date—not coaches, not vague advice.
            </p>
          </div>

          <div
            {...revealProps(revealed, 260, 'mobile-hero-benefits w-full max-w-md px-1')}
            aria-label="Key benefits"
          >
            <div className="mobile-hero-benefit">
              <div className="mobile-hero-benefit-icon" aria-hidden>
                <Users className="h-6 w-6 text-primary" />
              </div>
              <span>
                Real
                <br />
                reviewers
              </span>
            </div>
            <div className="mobile-hero-benefit">
              <div className="mobile-hero-benefit-icon" aria-hidden>
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <span>
                Photo +
                <br />
                prompt notes
              </span>
            </div>
            <div className="mobile-hero-benefit">
              <div className="mobile-hero-benefit-icon" aria-hidden>
                <CalendarCheck className="h-6 w-6 text-primary" />
              </div>
              <span>
                Book
                <br />
                direct
              </span>
            </div>
          </div>

          <div
            ref={ctaRef}
            {...revealProps(revealed, 340, 'flex w-full max-w-[320px] flex-col items-stretch px-2')}
          >
            <LandingCTAs variant="hero" tone="mobileHero" />
          </div>

          <div {...revealProps(revealed, 420, 'mobile-stats w-full max-w-md py-3')}>
            <div className="flex items-center justify-center gap-2 text-sm text-white/90">
              <CheckCircle className="h-4 w-4 shrink-0 text-green-500" aria-hidden />
              <span>Reviewers keep 80% per completed review</span>
            </div>
          </div>
        </div>
      </div>

      {showStickyCta && (
        <div className="mobile-hero-sticky-cta lg:hidden" role="region" aria-label="Quick actions">
          <Link
            href="/request"
            className="mobile-hero-sticky-primary mobile-touch-feedback"
          >
            Get Reviewed
          </Link>
          <Link href="/reviewers/apply" className="mobile-hero-sticky-secondary">
            Become a reviewer
          </Link>
        </div>
      )}
    </>
  );
}
