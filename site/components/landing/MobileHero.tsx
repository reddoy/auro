'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import LandingCTAs from '../LandingCTAs';
import HeroAccentPhrase from './HeroAccentPhrase';

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

  useEffect(() => {
    const frame = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="mobile-hero-shell container relative z-10 mx-auto px-4 pb-14 pt-6 sm:pt-8 lg:hidden">
      <div className="mobile-hero-content relative z-10 flex w-full flex-col items-center space-y-5 text-center">
        <div {...revealProps(revealed, 80, 'w-full space-y-4 px-1')}>
          <h1 className="mobile-heading-responsive max-w-lg hyphens-none text-balance font-bold leading-tight tracking-[-0.02em] text-white">
            <span className="[text-wrap:balance]">
              Get dating profile feedback <HeroAccentPhrase />
            </span>
          </h1>

          <p className="mx-auto max-w-md text-pretty text-base font-medium leading-relaxed text-white/85 sm:text-lg">
            Honest notes from women you&apos;d actually want to date.
          </p>
        </div>

        <div {...revealProps(revealed, 180, 'w-full')}>
          <div className="mobile-iphone-container mobile-iphone-container--hero">
            <div className="landing-phone-shadow" />
            <div className="mobile-iphone-frame mobile-iphone-frame--hero">
              <video
                ref={mobileVideoRef}
                className="mobile-iphone-video"
                src="/katie_demo.mov"
                autoPlay
                playsInline
                muted
                loop
                onClick={() => {
                  const video = mobileVideoRef.current;
                  if (video) video.muted = !video.muted;
                }}
                aria-label="Demo video showing how a sample review works"
              />
            </div>
          </div>
        </div>

        <div {...revealProps(revealed, 260, 'flex w-full max-w-[320px] flex-col items-stretch px-2')}>
          <LandingCTAs variant="hero" tone="mobileHero" />
        </div>
      </div>
    </div>
  );
}
