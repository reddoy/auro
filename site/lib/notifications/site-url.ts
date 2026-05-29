export function getSiteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'https://www.appauro.com';
}

export function appRequestUrl(requestId: string, role: 'reviewer' | 'reviewee'): string {
  const base = getSiteOrigin();
  if (role === 'reviewer') {
    return `${base}/app/requests/reviewer/${requestId}`;
  }
  return `${base}/app/requests/review/${requestId}`;
}
