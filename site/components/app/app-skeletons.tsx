'use client';

import { cn } from '@/lib/utils';

function ShimmerBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl bg-white/[0.08] motion-safe:animate-pulse motion-reduce:animate-none',
        className
      )}
    />
  );
}

/** Inbox list + header chrome */
export function InboxPageSkeleton() {
  return (
    <div className="px-4 pb-6 pt-5" aria-busy aria-label="Loading inbox">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="space-y-2">
          <ShimmerBlock className="h-3 w-16" />
          <ShimmerBlock className="h-7 w-48" />
          <ShimmerBlock className="h-4 w-full max-w-sm" />
        </div>
        <ShimmerBlock className="h-14 w-full rounded-2xl" />
        <ShimmerBlock className="h-14 w-full rounded-2xl" />
        <div className="space-y-3 pt-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-4 rounded-2xl border border-white/[0.06] p-4">
              <ShimmerBlock className="h-14 w-14 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2 pt-1">
                <ShimmerBlock className="h-4 w-2/3 max-w-[200px]" />
                <ShimmerBlock className="h-3 w-24" />
                <ShimmerBlock className="mt-3 h-6 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Home dashboard */
export function HomeDashboardSkeleton() {
  return (
    <div className="px-4 pb-8 pt-5" aria-busy aria-label="Loading home">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="space-y-2">
          <ShimmerBlock className="h-3 w-14" />
          <ShimmerBlock className="h-7 w-56" />
          <ShimmerBlock className="h-4 w-full" />
        </div>
        <ShimmerBlock className="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-3 gap-2">
          <ShimmerBlock className="h-24 rounded-2xl sm:h-28" />
          <ShimmerBlock className="h-24 rounded-2xl sm:h-28" />
          <ShimmerBlock className="h-24 rounded-2xl sm:h-28" />
        </div>
        <ShimmerBlock className="h-12 w-full rounded-2xl" />
        <div className="space-y-2">
          <ShimmerBlock className="h-16 w-full rounded-2xl" />
          <ShimmerBlock className="h-16 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

/** Request detail hero row */
export function RequestDetailSkeleton() {
  return (
    <div className="px-4 pb-8 pt-6" aria-busy aria-label="Loading request">
      <ShimmerBlock className="mb-4 h-4 w-28" />
      <div className="mx-auto max-w-lg">
        <div className="flex gap-4">
          <ShimmerBlock className="h-14 w-14 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2 pt-1">
            <ShimmerBlock className="h-6 w-40" />
            <ShimmerBlock className="h-3 w-48" />
            <ShimmerBlock className="mt-2 h-6 w-24 rounded-full" />
          </div>
        </div>
        <ShimmerBlock className="mt-8 h-32 w-full rounded-2xl" />
      </div>
    </div>
  );
}

/** Account settings */
export function AccountPageSkeleton() {
  return (
    <div className="px-4 pb-10 pt-5" aria-busy aria-label="Loading account">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="space-y-2">
          <ShimmerBlock className="h-3 w-20" />
          <ShimmerBlock className="h-7 w-48" />
          <ShimmerBlock className="h-4 w-64" />
        </div>
        <ShimmerBlock className="h-64 w-full rounded-2xl" />
        <ShimmerBlock className="h-12 w-full rounded-2xl" />
        <ShimmerBlock className="h-12 w-full rounded-2xl" />
      </div>
    </div>
  );
}

/** App layout gate (minimal chrome) */
export function AppChromeSkeleton() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-8">
      <div className="flex items-center gap-3">
        <ShimmerBlock className="h-10 w-10 rounded-lg" />
        <ShimmerBlock className="h-6 w-20" />
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <ShimmerBlock className="h-3 w-full rounded" />
        <ShimmerBlock className="h-3 w-4/5 rounded" />
        <ShimmerBlock className="h-3 w-3/5 rounded" />
      </div>
    </div>
  );
}
