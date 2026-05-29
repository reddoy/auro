import { createClient } from '@supabase/supabase-js';
import { requireAuthenticatedUser } from '@/lib/require-authenticated-user';
import { notifyUser } from '@/lib/notifications/notify-user';

export async function POST(req: Request) {
  const gate = await requireAuthenticatedUser(req);
  if (!gate.ok) {
    return new Response(JSON.stringify(gate.body), {
      status: gate.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { requestId?: string; rating?: number; comment?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const requestId = typeof body.requestId === 'string' ? body.requestId.trim() : '';
  const rating = typeof body.rating === 'number' ? body.rating : Number(body.rating);
  const comment = typeof body.comment === 'string' ? body.comment.trim() : undefined;

  if (!requestId || !rating || rating < 1 || rating > 5) {
    return new Response(JSON.stringify({ error: 'requestId and rating (1-5) are required' }), { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500 });
  }
  const admin = createClient(url, key);

  const { data: request, error: reqErr } = await admin
    .from('requests')
    .select('id, status, user_id, influencer_id, review')
    .eq('id', requestId)
    .maybeSingle();

  if (reqErr || !request) {
    return new Response(JSON.stringify({ error: 'Request not found' }), { status: 404 });
  }
  if (request.user_id !== gate.user.userId) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }
  if (request.status !== 'completed' || !request.review) {
    return new Response(JSON.stringify({ error: 'Request must be completed with a review first' }), {
      status: 400,
    });
  }
  if (!request.influencer_id) {
    return new Response(JSON.stringify({ error: 'Reviewer not found' }), { status: 400 });
  }

  const { data: existing } = await admin
    .from('reviewer_reviews')
    .select('id')
    .eq('request_id', requestId)
    .maybeSingle();

  if (existing) {
    return new Response(JSON.stringify({ error: 'Review has already been submitted' }), { status: 409 });
  }

  const { data: inserted, error: insertErr } = await admin
    .from('reviewer_reviews')
    .insert({
      request_id: requestId,
      reviewer_id: request.influencer_id,
      reviewee_id: gate.user.userId,
      rating,
      comment: comment ?? null,
    })
    .select('id, rating, comment')
    .single();

  if (insertErr) {
    console.error('[submit-reviewer-rating]', insertErr);
    return new Response(JSON.stringify({ error: 'Failed to save rating' }), { status: 500 });
  }

  const commentSnippet =
    comment && comment.length > 80 ? `${comment.slice(0, 77)}...` : comment || '';

  notifyUser(admin, {
    userId: request.influencer_id,
    type: 'reviewer_rating_received',
    entityId: inserted.id,
    data: {
      requestId,
      rating,
      commentSnippet,
    },
  }).catch((err) => console.error('[submit-reviewer-rating] notify failed', err));

  return new Response(JSON.stringify({ ok: true, review: inserted }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
