import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

function buildCorsHeaders(req: NextRequest): Headers {
  const origin = req.headers.get('origin') || '*';
  const requestedHeaders = req.headers.get('access-control-request-headers');
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Vary', 'Origin');
  headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  headers.set('Access-Control-Allow-Headers', requestedHeaders || 'content-type, authorization, accept');
  headers.set('Access-Control-Max-Age', '86400');
  return headers;
}

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname || '';
  const isInternalRequestFlow = req.nextUrl.searchParams.get('internal') === '1';

  // Handle redirects from old /reviewers/[slug] URLs to new /[username] URLs
  if (
    pathname.startsWith('/reviewers/') &&
    pathname !== '/reviewers' &&
    pathname !== '/reviewers/apply' &&
    pathname !== '/reviewers/thanks' &&
    !pathname.endsWith('/request')
  ) {
    const slug = pathname.replace('/reviewers/', '');
    const url = req.nextUrl.clone();
    url.pathname = `/${slug}`;
    return NextResponse.redirect(url, 301);
  }

  // Pause consumer app access while issues are being fixed.
  // Keep reviewer onboarding routes available.
  if (pathname === '/app' || pathname.startsWith('/app/')) {
    const url = req.nextUrl.clone();
    url.pathname = '/waitlist';
    url.search = '';
    url.searchParams.set('from', 'app');
    return NextResponse.redirect(url, 307);
  }

  // Keep the old request flow reachable only through explicit internal links.
  if ((pathname === '/request' || pathname.startsWith('/request/')) && !isInternalRequestFlow) {
    const url = req.nextUrl.clone();
    url.pathname = '/waitlist';
    url.search = '';
    return NextResponse.redirect(url, 307);
  }

  // Legacy request URLs should now route to waitlist while preserving reviewer slug.
  if (pathname.startsWith('/reviewers/') && pathname.endsWith('/request')) {
    const parts = pathname.split('/').filter(Boolean);
    const slug = parts.length >= 3 ? parts[1] : '';
    const url = req.nextUrl.clone();
    url.pathname = '/waitlist';
    url.search = '';
    if (slug) url.searchParams.set('creatorSlug', slug);
    return NextResponse.redirect(url, 307);
  }
  if (pathname.startsWith('/creators/') && pathname.endsWith('/request')) {
    const parts = pathname.split('/').filter(Boolean);
    const slug = parts.length >= 3 ? parts[1] : '';
    const url = req.nextUrl.clone();
    url.pathname = '/waitlist';
    url.search = '';
    if (slug) url.searchParams.set('creatorSlug', slug);
    return NextResponse.redirect(url, 307);
  }
  if (pathname.startsWith('/c/') && pathname.endsWith('/request')) {
    const parts = pathname.split('/').filter(Boolean);
    const slug = parts.length >= 3 ? parts[1] : '';
    const url = req.nextUrl.clone();
    url.pathname = '/waitlist';
    url.search = '';
    if (slug) url.searchParams.set('creatorSlug', slug);
    return NextResponse.redirect(url, 307);
  }

  let response: NextResponse;

  if (pathname.startsWith('/api/storage/')) {
    const cors = buildCorsHeaders(req);

    if (req.method === 'OPTIONS') {
      response = new NextResponse(null, { status: 204, headers: cors });
      return response;
    }

    response = NextResponse.next();
    cors.forEach((value, key) => response.headers.set(key, value));
  } else {
    response = NextResponse.next();
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

