/**
 * Shared secret for server-to-server calls between Next.js routes (same as cron manual runs).
 * Set CRON_SECRET in Vercel; callers send header x-auro-internal: <CRON_SECRET>.
 */
export const INTERNAL_AURO_HEADER = 'x-auro-internal';

export function getInternalJobSecret(): string {
  return (process.env.CRON_SECRET || process.env.INTERNAL_JOB_SECRET || '').trim();
}

export function isTrustedInternalRequest(req: Request): boolean {
  const expected = getInternalJobSecret();
  if (!expected) return false;
  const got = (req.headers.get(INTERNAL_AURO_HEADER) || '').trim();
  return got === expected;
}
