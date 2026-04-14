'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AppBackToInbox({ className }: { className?: string }) {
  return (
    <div className={cn('mb-4', className)}>
      <Link
        href="/app/requests?tab=active"
        className="inline-flex items-center gap-1 rounded-lg py-1 pr-2 text-sm font-medium text-white/75 outline-none ring-primary/40 transition hover:text-white focus-visible:ring-2"
      >
        <ChevronLeft className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
        <span>Back to inbox</span>
      </Link>
      <p className="mt-0.5 pl-5 text-[11px] font-medium uppercase tracking-[0.12em] text-white/35">My reviews</p>
    </div>
  );
}
