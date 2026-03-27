import { NextResponse } from 'next/server';

// Legacy endpoint retained for compatibility with old clients.
// Auro is now web/mobile-web only, so IAP verification is no longer supported.
export async function POST() {
  return NextResponse.json(
    {
      error: 'In-app purchases have been retired. Please use web checkout.',
      code: 'IAP_DEPRECATED',
    },
    { status: 410 }
  );
}
