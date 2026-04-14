'use client';

import { cn } from '@/lib/utils';

/**
 * Soft entrance when content becomes ready (replaces abrupt pop-in).
 * Respects `prefers-reduced-motion`.
 */
export function AppMountReveal({
  ready,
  children,
  className,
}: {
  ready: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'motion-safe:transition-[opacity,transform] motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]',
        ready
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-2 opacity-0 motion-reduce:translate-y-0',
        'motion-reduce:transition-opacity motion-reduce:duration-300',
        className
      )}
    >
      {children}
    </div>
  );
}

export default AppMountReveal;
