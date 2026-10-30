'use client';

import { ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { trackCtaClick } from '@/lib/analytics';
import { SHUTDOWN_STORY_URL } from '@/lib/shutdown';
import {
  LANDING_CTA_MOBILE_HERO_PRIMARY,
  LANDING_CTA_NAV_PRIMARY,
  LANDING_CTA_PRIMARY,
} from './landing-cta-styles';

type Variant = 'hero' | 'nav';
type Tone = 'default' | 'mobileHero';

type Props = {
  variant?: Variant;
  tone?: Tone;
  className?: string;
};

export default function LandingCTAs({
  variant = 'hero',
  tone = 'default',
  className = '',
}: Props) {
  const isNav = variant === 'nav';
  const isMobileHero = !isNav && tone === 'mobileHero';
  const location = isNav ? 'nav' : isMobileHero ? 'mobile_sticky' : 'hero';
  const primaryClass = isNav
    ? LANDING_CTA_NAV_PRIMARY
    : isMobileHero
      ? LANDING_CTA_MOBILE_HERO_PRIMARY
      : LANDING_CTA_PRIMARY;
  const size = isNav ? 'default' : 'xl';
  const layout = isNav
    ? 'flex flex-row flex-wrap items-center justify-end gap-2'
    : isMobileHero
      ? 'mx-auto flex w-full max-w-[320px] flex-col items-stretch gap-3'
      : 'mx-auto flex w-full max-w-xs flex-col items-stretch gap-3 lg:mx-0 lg:max-w-[280px]';

  return (
    <div className={`landing-ctas ${layout} ${className}`.trim()} role="group" aria-label="Primary actions">
      <Button size={size} variant="gradient" className={primaryClass} asChild>
        <a
          href={SHUTDOWN_STORY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="relative z-[1] flex items-center justify-center gap-2 pointer-events-auto"
          onClick={() => trackCtaClick('read_shutdown_story', location)}
        >
          <span>Read the Story</span>
          {!isNav && (
            <ArrowRight
              className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1"
              aria-hidden
            />
          )}
        </a>
      </Button>
    </div>
  );
}
