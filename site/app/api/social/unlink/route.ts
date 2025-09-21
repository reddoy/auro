import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const provider = String(body?.provider || '').toLowerCase();
    if (!provider || !['tiktok','instagram'].includes(provider)) {
      return new Response(JSON.stringify({ error: 'Invalid provider' }), { status: 400 });
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!url || !serviceKey) return new Response(JSON.stringify({ error: 'Server not configured' }), { status: 500 });
    const admin = createClient(url, serviceKey);
    const auth = req.headers.get('authorization') || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    const { data: userRes, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userRes?.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    const userId = userRes.user.id;
    const { error } = await admin.from('social_accounts').delete().eq('user_id', userId).eq('provider', provider);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Unknown error' }), { status: 500 });
  }
}


