import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const IOS_SOURCE_COOKIE = 'auro_ios_src';
const IOS_SOURCE_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

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

function maybeSetIosCookie(req: NextRequest, res: NextResponse) {
  const source = req.nextUrl.searchParams.get('src');
  if (source === 'ios') {
    res.cookies.set(IOS_SOURCE_COOKIE, '1', {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: IOS_SOURCE_TTL_SECONDS,
    });
  }
}

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname || '';

  // Handle redirects from old /reviewers/[slug] URLs to new /[username] URLs
  if (
    pathname.startsWith('/reviewers/') &&
    pathname !== '/reviewers' &&
    pathname !== '/reviewers/apply' &&
    pathname !== '/reviewers/thanks'
  ) {
    const slug = pathname.replace('/reviewers/', '');
    const url = req.nextUrl.clone();
    url.pathname = `/${slug}`;
    const redirectResponse = NextResponse.redirect(url, 301);
    maybeSetIosCookie(req, redirectResponse);
    return redirectResponse;
  }

  let response: NextResponse;

  if (pathname.startsWith('/api/storage/')) {
    const cors = buildCorsHeaders(req);

    if (req.method === 'OPTIONS') {
      response = new NextResponse(null, { status: 204, headers: cors });
      maybeSetIosCookie(req, response);
      return response;
    }

    response = NextResponse.next();
    cors.forEach((value, key) => response.headers.set(key, value));
  } else {
    response = NextResponse.next();
  }

  maybeSetIosCookie(req, response);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

