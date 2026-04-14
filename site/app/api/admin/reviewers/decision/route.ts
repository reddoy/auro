import { requireAdmin } from '@/lib/admin-server';

export const dynamic = 'force-dynamic';

type Action = 'approve' | 'reject';

export async function POST(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok) {
    return new Response(JSON.stringify(gate.body), {
      status: gate.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { userId?: string; action?: Action };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
  const action = body.action;

  if (!userId || (action !== 'approve' && action !== 'reject')) {
    return new Response(JSON.stringify({ error: 'userId and action (approve|reject) are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: row, error: readErr } = await gate.admin
    .from('profiles')
    .select('id, is_reviewer')
    .eq('id', userId)
    .maybeSingle();

  if (readErr || !row) {
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (row.is_reviewer !== 'pending') {
    return new Response(
      JSON.stringify({
        error: 'Only pending reviewer applications can be approved or rejected from this screen.',
      }),
      { status: 409, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const nextStatus: 'approved' | 'rejected' = action === 'approve' ? 'approved' : 'rejected';

  const { error: updErr } = await gate.admin.from('profiles').update({ is_reviewer: nextStatus }).eq('id', userId);

  if (updErr) {
    console.error('[admin/reviewers/decision]', updErr);
    return new Response(JSON.stringify({ error: 'Update failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true, userId, is_reviewer: nextStatus }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
