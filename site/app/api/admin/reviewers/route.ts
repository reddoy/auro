import { requireAdmin } from '@/lib/admin-server';

export const dynamic = 'force-dynamic';

const PROFILE_FIELDS =
  'id, email, username, first_name, last_name, bio, skills, hourly_rate, avatar_url, links, is_reviewer, created_at, stripe_connect_account_id, is_admin';

/**
 * GET ?status=pending|approved|rejected|applicants
 * applicants = any profile with a reviewer application (non-null is_reviewer)
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
  const status = searchParams.get('status') || 'pending';

  let q = gate.admin.from('profiles').select(PROFILE_FIELDS).order('created_at', { ascending: false }).limit(300);

  if (status === 'pending') {
    q = q.eq('is_reviewer', 'pending');
  } else if (status === 'approved') {
    q = q.eq('is_reviewer', 'approved');
  } else if (status === 'rejected') {
    q = q.eq('is_reviewer', 'rejected');
  } else if (status === 'applicants') {
    q = q.not('is_reviewer', 'is', null);
  } else {
    return new Response(JSON.stringify({ error: 'Invalid status. Use pending, approved, rejected, or applicants.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data, error } = await q;

  if (error) {
    console.error('[admin/reviewers]', error);
    return new Response(JSON.stringify({ error: 'Failed to load profiles' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ profiles: data || [] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
