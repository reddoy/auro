'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import {
  LANDING_CTA_MOBILE_HERO_PRIMARY,
  LANDING_CTA_MOBILE_HERO_SECONDARY,
  LANDING_CTA_NAV_PRIMARY,
  LANDING_CTA_NAV_SECONDARY,
  LANDING_CTA_PRIMARY,
  LANDING_CTA_SECONDARY,
} from './landing-cta-styles';

type Variant = 'hero' | 'nav';
type Tone = 'default' | 'mobileHero';

type Props = {
  variant?: Variant;
  tone?: Tone;
  showBecomeReviewer?: boolean;
  showGetReviewed?: boolean;
  className?: string;
};

export default function LandingCTAs({
  variant = 'hero',
  tone = 'default',
  showBecomeReviewer = true,
  showGetReviewed = true,
  className = '',
}: Props) {
  const isNav = variant === 'nav';
  const isMobileHero = !isNav && tone === 'mobileHero';
  const primaryClass = isNav
    ? LANDING_CTA_NAV_PRIMARY
    : isMobileHero
      ? LANDING_CTA_MOBILE_HERO_PRIMARY
      : LANDING_CTA_PRIMARY;
  const secondaryClass = isNav
    ? LANDING_CTA_NAV_SECONDARY
    : isMobileHero
      ? LANDING_CTA_MOBILE_HERO_SECONDARY
      : LANDING_CTA_SECONDARY;
  const size = isNav ? 'default' : 'xl';
  const layout = isNav
    ? 'flex flex-row flex-wrap items-center justify-end gap-2'
    : isMobileHero
      ? 'mx-auto flex w-full max-w-[320px] flex-col items-stretch gap-3'
      : 'mx-auto flex w-full max-w-xs flex-col items-stretch gap-3 lg:mx-0 lg:max-w-[280px]';

  return (
    <div className={`landing-ctas ${layout} ${className}`.trim()} role="group" aria-label="Primary actions">
      {showBecomeReviewer && (
        <Button size={size} variant="gradient" className={primaryClass} asChild>
          <Link
            href="/reviewers/apply"
            className="relative z-[1] flex items-center justify-center gap-2 pointer-events-auto"
            aria-label="Apply to become a reviewer"
          >
            <span>Become a Reviewer</span>
            {!isNav && (
              <ArrowRight
                className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1"
                aria-hidden
              />
            )}
          </Link>
        </Button>
      )}
      {showGetReviewed && (
        <Button size={size} variant="outline" className={secondaryClass} asChild>
          <Link
            href="/request"
            className="relative z-[1] flex items-center justify-center gap-2 pointer-events-auto"
            aria-label="Request a profile review"
          >
            <span>Get Reviewed</span>
            {!isNav && (
              <ArrowRight
                className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1"
                aria-hidden
              />
            )}
          </Link>
        </Button>
      )}
    </div>
  );
}
