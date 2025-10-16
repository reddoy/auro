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
  
  // Handle redirects from old /reviewers/[slug] URLs to new /[username] URLs
  if (pathname.startsWith('/reviewers/') && pathname !== '/reviewers' && pathname !== '/reviewers/apply' && pathname !== '/reviewers/thanks') {
    const slug = pathname.replace('/reviewers/', '');
    const url = req.nextUrl.clone();
    url.pathname = `/${slug}`;
    return NextResponse.redirect(url, 301); // Permanent redirect
  }
  
  // Enforce CORS only for storage API endpoints
  if (!pathname.startsWith('/api/storage/')) {
    return NextResponse.next();
  }

  const cors = buildCorsHeaders(req);

  // Short-circuit preflight
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: cors });
  }

  // Add CORS headers to downstream responses
  const res = NextResponse.next();
  cors.forEach((value, key) => res.headers.set(key, value));
  return res;
}

export const config = {
  matcher: ['/api/storage/:path*', '/reviewers/:path*'],
};


