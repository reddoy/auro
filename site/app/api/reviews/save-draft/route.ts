import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const requestId = typeof body.requestId === 'string' ? body.requestId : '';
    const videoUrl = typeof body.videoUrl === 'string' && body.videoUrl.length > 0 ? body.videoUrl : null;
    if (!requestId || !videoUrl) {
      return new Response(JSON.stringify({ error: 'requestId and videoUrl are required' }), { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!url || !key) {
      return new Response(JSON.stringify({ error: 'Server not configured' }), { status: 500 });
    }
    const admin = createClient(url, key);

    const auth = req.headers.get('authorization') || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const actorId = userData.user.id;
    const { data: row, error: readErr } = await admin
      .from('requests')
      .select('id,influencer_id,status,review')
      .eq('id', requestId)
      .maybeSingle();
    if (readErr || !row) return new Response(JSON.stringify({ error: 'Request not found' }), { status: 404 });
    if (row.influencer_id !== actorId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }
    if (row.status !== 'in_progress') {
      return new Response(JSON.stringify({ error: 'Drafts are only allowed in progress' }), { status: 400 });
    }

    const currentReview = (row.review as Record<string, unknown> | null) ?? {};
    const currentMedia = (currentReview.media as Record<string, unknown> | undefined) ?? {};
    const mergedReview = {
      ...currentReview,
      media: {
        ...currentMedia,
        videoUrl,
      },
      draft_video_uploaded_at: new Date().toISOString(),
    };

    const { data: updated, error: updErr } = await admin
      .from('requests')
      .update({ review: mergedReview })
      .eq('id', requestId)
      .select('id,status,review')
      .single();
    if (updErr) return new Response(JSON.stringify({ error: updErr.message }), { status: 500 });

    return new Response(JSON.stringify({ ok: true, request: updated }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Unknown error' }), { status: 500 });
  }
}
