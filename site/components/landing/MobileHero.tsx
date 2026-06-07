'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
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
    <div className="mobile-hero-shell container relative z-10 mx-auto px-4 pb-8 pt-6 sm:pt-8 lg:hidden">
      <div className="mobile-hero-content relative z-10 flex w-full flex-col items-center space-y-4 text-center">
        <div {...revealProps(revealed, 80, 'w-full space-y-4 px-1')}>
          <h1 className="mobile-heading-responsive max-w-lg hyphens-none font-bold leading-tight tracking-[-0.02em] text-white">
            <span>
              Get dating profile feedback
              <br />
              <HeroAccentPhrase />
            </span>
          </h1>

          <p className="mx-auto max-w-md text-base font-medium leading-relaxed text-white/85 [text-wrap:balance] hyphens-none sm:text-lg">
            Honest notes from women you&apos;d actually want&nbsp;to&nbsp;date.
          </p>
        </div>

        <div {...revealProps(revealed, 180, 'w-full')}>
          <div className="mobile-iphone-container mobile-iphone-container--hero">
            <div className="landing-phone-shadow" />
            <div className="mobile-iphone-frame mobile-iphone-frame--hero">
              <video
                ref={mobileVideoRef}
                className="mobile-iphone-video"
                src="/katie_henry_review.mov"
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
      </div>
    </div>
  );
}
