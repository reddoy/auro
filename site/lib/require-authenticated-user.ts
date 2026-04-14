import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function parseBearerToken(req: Request): string | null {
  const auth = req.headers.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  return token || null;
}

export type AuthenticatedUser = { userId: string; email: string | null };

/**
 * Validates Supabase JWT and returns the user id. Uses the service role client
 * only to call auth.getUser (recommended pattern for Next.js route handlers).
 */
export async function requireAuthenticatedUser(req: Request): Promise<
  | { ok: true; admin: SupabaseClient; user: AuthenticatedUser }
  | { ok: false; status: number; body: Record<string, unknown> }
> {
  const token = parseBearerToken(req);
  if (!token) {
    return { ok: false, status: 401, body: { error: 'Authentication required' } };
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) {
    return { ok: false, status: 500, body: { error: 'Server misconfigured' } };
  }
  const admin = createClient(url, key);
  const { data: u, error } = await admin.auth.getUser(token);
  if (error || !u?.user?.id) {
    return { ok: false, status: 401, body: { error: 'Invalid or expired session' } };
  }
  return {
    ok: true,
    admin,
    user: { userId: u.user.id, email: u.user.email ?? null },
  };
}
