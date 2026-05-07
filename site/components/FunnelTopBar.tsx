'use client';

import Link from 'next/link';
import { useLayoutEffect, useRef } from 'react';

export type FunnelTopBarVariant = 'request' | 'reviewer-apply';

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
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5 shrink-0 text-white no-underline rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-label="Auro Home"
        >
          <img
            src="/auro_aura_logo.png"
            alt=""
            width={36}
            height={36}
            className="rounded-[11px]"
          />
          <span className="font-semibold text-[15px] tracking-tight">Auro</span>
        </Link>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-4 gap-y-1 text-sm">
          {variant === 'reviewer-apply' ? (
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
          <Link
            href="/auth/sign-in"
            className="font-semibold text-primary hover:brightness-110 transition-opacity whitespace-nowrap"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
