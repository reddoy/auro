import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) {
    throw new Error('Server misconfigured: missing Supabase URL or service role key');
  }
  return createClient(url, key);
}

export function parseBearerToken(req: Request): string | null {
  const auth = req.headers.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  return token || null;
}

export type AdminSession = { userId: string; email: string | null };

/**
 * Admin if JWT is valid and (email/user id in env allowlist OR profiles.is_admin).
 */
export async function verifyAdminAccess(
  admin: SupabaseClient,
  accessToken: string
): Promise<AdminSession | null> {
  const { data: u, error: authError } = await admin.auth.getUser(accessToken);
  if (authError || !u?.user?.id) {
    return null;
  }

  const userId = u.user.id;
  const emailLower = (u.user.email || '').trim().toLowerCase() || null;

  const masterAdminEmails = (process.env.MASTER_ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const masterAdminUserIds = (process.env.MASTER_ADMIN_USER_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  if (emailLower && masterAdminEmails.includes(emailLower)) {
    return { userId, email: u.user.email || null };
  }
  if (masterAdminUserIds.includes(userId)) {
    return { userId, email: u.user.email || null };
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    console.error('[verifyAdminAccess] profile read failed:', profileError);
    return null;
  }

  if (profile?.is_admin === true) {
    return { userId, email: u.user.email || null };
  }

  return null;
}

export async function requireAdmin(req: Request): Promise<
  | { ok: true; admin: SupabaseClient; session: AdminSession }
  | { ok: false; status: number; body: Record<string, string> }
> {
  try {
    const token = parseBearerToken(req);
    if (!token) {
      return { ok: false, status: 401, body: { error: 'Authentication required' } };
    }
    const admin = getSupabaseAdmin();
    const session = await verifyAdminAccess(admin, token);
    if (!session) {
      return { ok: false, status: 403, body: { error: 'Access denied' } };
    }
    return { ok: true, admin, session };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error';
    return { ok: false, status: 500, body: { error: message } };
  }
}
