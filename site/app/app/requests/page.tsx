import { Suspense } from 'react';
import RequestsPageClient from './requests-client';

export const dynamic = 'force-dynamic';

function RequestsFallback() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4">
      <div
        className="h-9 w-9 animate-spin rounded-full border-2 border-primary/25 border-t-primary motion-reduce:animate-none"
        aria-hidden
      />
      <p className="text-sm text-white/60">Loading inbox…</p>
    </div>
  );
}

export default function AppRequestsPage() {
  return (
    <Suspense fallback={<RequestsFallback />}>
      <RequestsPageClient />
    </Suspense>
  );
}
