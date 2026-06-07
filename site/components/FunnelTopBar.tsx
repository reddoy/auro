'use client';

import Link from 'next/link';
import { useLayoutEffect, useRef } from 'react';
import BrandMark from './BrandMark';

export type FunnelTopBarVariant = 'request' | 'reviewer-apply' | 'auth';

type Props = { variant: FunnelTopBarVariant };

const FUNNEL_HEADER_HEIGHT_VAR = '--funnel-header-height';

/**
 * Minimal funnel chrome — matches `/request`: sticky bar that works on dark funnel backgrounds.
 * Marketing ConditionalChrome is omitted for these routes via `ConditionalChrome.tsx`.
 *
 * Exposes `--funnel-header-height` on `document.documentElement` so funnel steps (e.g. reviewer toolbar)
 * can `position: sticky` flush below this bar instead of tucking underneath it.
 */
export default function FunnelTopBar({ variant }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const apply = () => {
      document.documentElement.style.setProperty(FUNNEL_HEADER_HEIGHT_VAR, `${el.getBoundingClientRect().height}px`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty(FUNNEL_HEADER_HEIGHT_VAR);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      data-funnel-top-bar
      className="funnel-top-bar sticky top-0 z-30 border-b border-white/[0.08] bg-background/90 backdrop-blur-md pt-[max(0.65rem,env(safe-area-inset-top))]"
    >
      <div className="max-w-6xl mx-auto px-4 py-3">
        {/* Mobile: logo-only row */}
        <div className="sm:hidden">
          <div className="flex items-center">
            <BrandMark size="md" />
          </div>
        </div>

        {/* Desktop: keep existing layout, but avoid odd wraps */}
        <div className="hidden sm:flex items-center justify-between gap-6">
          <BrandMark size="md" />

          <div className="flex min-w-0 items-center justify-end gap-5 text-sm">
            {variant === 'auth' ? (
              <>
                <Link
                  href="/reviewers/apply"
                  className="text-white/72 hover:text-white transition-colors underline-offset-2 hover:underline whitespace-nowrap"
                >
                  Become a Reviewer
                </Link>
                <Link
                  href="/request"
                  className="text-white/72 hover:text-white transition-colors underline-offset-2 hover:underline whitespace-nowrap"
                >
                  Get Reviewed
                </Link>
              </>
            ) : variant === 'reviewer-apply' ? (
              <Link
                href="/request"
                className="text-white/72 hover:text-white transition-colors underline-offset-2 hover:underline whitespace-nowrap"
              >
                Get Reviewed
              </Link>
            ) : (
              <Link
                href="/reviewers/apply"
                className="text-white/72 hover:text-white transition-colors underline-offset-2 hover:underline whitespace-nowrap"
              >
                Become a Reviewer
              </Link>
            )}
            {variant !== 'auth' ? (
              <Link
                href="/auth/sign-in"
                className="inline-flex items-center justify-center h-10 px-4 rounded-full bg-white/[0.06] border border-white/10 text-white font-semibold hover:bg-white/[0.1] transition whitespace-nowrap"
              >
                Sign In
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
