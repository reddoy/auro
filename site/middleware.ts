import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { isClosedPage } from './lib/shutdown';

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

  if (isClosedPage(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url, 307);
  }

  // Stripe can still send webhooks for old payments, so those stay open.
  if (
    pathname.startsWith('/api/') &&
    !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
    pathname !== '/api/stripe/webhook'
  ) {
    return NextResponse.json({ error: 'Auro has shut down.' }, { status: 503 });
  }

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

  // Legacy request URLs now route to live request flow while preserving reviewer slug.
  if (pathname.startsWith('/reviewers/') && pathname.endsWith('/request')) {
    const parts = pathname.split('/').filter(Boolean);
    const slug = parts.length >= 3 ? parts[1] : '';
    const url = req.nextUrl.clone();
    url.pathname = '/request';
    url.search = '';
    if (slug) url.searchParams.set('creatorSlug', slug);
    return NextResponse.redirect(url, 307);
  }
  if (pathname.startsWith('/creators/') && pathname.endsWith('/request')) {
    const parts = pathname.split('/').filter(Boolean);
    const slug = parts.length >= 3 ? parts[1] : '';
    const url = req.nextUrl.clone();
    url.pathname = '/request';
    url.search = '';
    if (slug) url.searchParams.set('creatorSlug', slug);
    return NextResponse.redirect(url, 307);
  }
  if (pathname.startsWith('/c/') && pathname.endsWith('/request')) {
    const parts = pathname.split('/').filter(Boolean);
    const slug = parts.length >= 3 ? parts[1] : '';
    const url = req.nextUrl.clone();
    url.pathname = '/request';
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

