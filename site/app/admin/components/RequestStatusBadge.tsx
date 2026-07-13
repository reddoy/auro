'use client';

import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-400/12 text-amber-100 ring-amber-300/25',
  paid: 'bg-sky-400/12 text-sky-100 ring-sky-300/25',
  accepted: 'bg-blue-400/12 text-blue-100 ring-blue-300/25',
  in_progress: 'bg-violet-400/12 text-violet-100 ring-violet-300/25',
  completed: 'bg-emerald-400/12 text-emerald-100 ring-emerald-300/20',
  rejected: 'bg-red-400/12 text-red-100 ring-red-300/25',
  timeout: 'bg-orange-400/12 text-orange-100 ring-orange-300/25',
  refunded: 'bg-white/[0.06] text-white/70 ring-white/10',
};

export default function RequestStatusBadge({
  status,
  className,
}: {
  status: string | null | undefined;
  className?: string;
}) {
  const key = (status || 'unknown').toLowerCase();
  const label = key.replace(/_/g, ' ');
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1',
        STATUS_STYLES[key] || 'bg-white/[0.06] text-white/70 ring-white/10',
        className
      )}
    >
      {label}
    </span>
  );
}
