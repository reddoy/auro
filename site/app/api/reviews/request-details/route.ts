import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { requestId } = await req.json();
    if (!requestId) {
      return new Response(JSON.stringify({ error: 'Missing requestId' }), { status: 400 });
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON || '';
    if (!url || !key) return new Response(JSON.stringify({ error: 'Supabase not configured' }), { status: 500 });
    const admin = createClient(url, key);
    const auth = req.headers.get('authorization') || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    const { data: authData, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !authData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { data: reqRow, error: reqErr } = await admin
      .from('requests')
      .select('id, user_id, influencer_id, status, notes, photos, created_at, payment_status')
      .eq('id', requestId)
      .maybeSingle();
    if (reqErr || !reqRow) return new Response(JSON.stringify({ error: reqErr?.message || 'Request not found' }), { status: 404 });
    const actorId = authData.user.id;
    if (reqRow.user_id !== actorId && reqRow.influencer_id !== actorId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    const userId = (reqRow as any).user_id as string | undefined;
    const influencerId = (reqRow as any).influencer_id as string | undefined;

    const [reviewee, reviewer] = await Promise.all([
      userId ? admin.from('profiles').select('id, first_name, last_name, username, avatar_url').eq('id', userId).maybeSingle() : Promise.resolve({ data: null } as any),
      influencerId ? admin.from('profiles').select('id, first_name, last_name, username, avatar_url').eq('id', influencerId).maybeSingle() : Promise.resolve({ data: null } as any),
    ]);

    // Construct full_name from first_name and last_name for backward compatibility
    const revieweeData = reviewee?.data ? {
      ...reviewee.data,
      full_name: [reviewee.data.first_name, reviewee.data.last_name].filter(Boolean).join(' ') || null,
    } : null;

    const reviewerData = reviewer?.data ? {
      ...reviewer.data,
      full_name: [reviewer.data.first_name, reviewer.data.last_name].filter(Boolean).join(' ') || null,
    } : null;

    const payload = {
      id: (reqRow as any).id,
      status: (reqRow as any).status,
      payment_status: (reqRow as any).payment_status,
      created_at: (reqRow as any).created_at,
      photos: (reqRow as any).photos,
      notes: (reqRow as any).notes,
      reviewee: revieweeData,
      reviewer: reviewerData,
    };

    return new Response(JSON.stringify(payload), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Unknown error' }), { status: 500 });
  }
}


