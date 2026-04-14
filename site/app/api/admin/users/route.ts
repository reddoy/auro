import { requireAdmin } from '@/lib/admin-server';

export const dynamic = 'force-dynamic';

const LIST_FIELDS =
  'id, email, username, first_name, last_name, avatar_url, is_reviewer, is_admin, created_at';

/**
 * GET ?limit=100&offset=0 — all profiles (newest first)
 */
export async function GET(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok) {
    return new Response(JSON.stringify(gate.body), {
      status: gate.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 100, 1), 500);
  const offset = Math.max(Number(searchParams.get('offset')) || 0, 0);

  const { data, error, count } = await gate.admin
    .from('profiles')
    .select(LIST_FIELDS, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[admin/users]', error);
    return new Response(JSON.stringify({ error: 'Failed to load users' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({
      profiles: data || [],
      count: count ?? (data?.length ?? 0),
      limit,
      offset,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
