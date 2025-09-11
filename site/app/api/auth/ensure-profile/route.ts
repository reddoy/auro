import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, email, fullName, avatarUrl } = body || {};
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId' }), { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!url || !key) {
      return new Response(JSON.stringify({ error: 'Server missing SUPABASE_SERVICE_ROLE_KEY' }), { status: 500 });
    }

    const admin = createClient(url, key);

    const updates: any = { id: userId, updated_at: new Date().toISOString() };
    if (email) updates.email = email;
    if (fullName) updates.full_name = fullName;
    if (avatarUrl) updates.avatar_url = avatarUrl;

    // Backfill username if missing: use email local-part when available
    try {
      const { data: existing } = await admin.from('profiles').select('id, username').eq('id', userId).maybeSingle();
      if (!existing || !existing.username) {
        let derivedUsername: string | undefined = undefined;
        if (email && typeof email === 'string') {
          derivedUsername = (email.split('@')[0] || '').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 24) || undefined;
        }
        if (derivedUsername) updates.username = derivedUsername;
      }
    } catch {}

    const { error } = await admin.from('profiles').upsert(updates, { onConflict: 'id' });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Unknown error' }), { status: 500 });
  }
}



