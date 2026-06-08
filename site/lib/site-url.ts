/** Canonical public site origin (no trailing slash). */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || 'https://appauro.com';
  return raw.replace(/\/$/, '');
}
