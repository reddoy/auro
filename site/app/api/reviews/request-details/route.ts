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

    const { data: reqRow, error: reqErr } = await admin
      .from('requests')
      .select('id, user_id, influencer_id, status, notes, photos, created_at, payment_status')
      .eq('id', requestId)
      .maybeSingle();
    if (reqErr || !reqRow) return new Response(JSON.stringify({ error: reqErr?.message || 'Request not found' }), { status: 404 });

    const userId = (reqRow as any).user_id as string | undefined;
    const influencerId = (reqRow as any).influencer_id as string | undefined;

    const [reviewee, reviewer] = await Promise.all([
      userId ? admin.from('profiles').select('id, full_name, username, avatar_url').eq('id', userId).maybeSingle() : Promise.resolve({ data: null } as any),
      influencerId ? admin.from('profiles').select('id, full_name, username, avatar_url').eq('id', influencerId).maybeSingle() : Promise.resolve({ data: null } as any),
    ]);

    const payload = {
      id: (reqRow as any).id,
      status: (reqRow as any).status,
      payment_status: (reqRow as any).payment_status,
      created_at: (reqRow as any).created_at,
      photos: (reqRow as any).photos,
      notes: (reqRow as any).notes,
      reviewee: reviewee?.data || null,
      reviewer: reviewer?.data || null,
    };

    return new Response(JSON.stringify(payload), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Unknown error' }), { status: 500 });
  }
}


