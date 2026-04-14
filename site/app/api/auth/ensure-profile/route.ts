import { createClient } from '@supabase/supabase-js';

function splitName(fullName?: string): { firstName?: string; lastName?: string } {
  const normalized = (fullName || '').trim().replace(/\s+/g, ' ');
  if (!normalized) return {};
  const parts = normalized.split(' ');
  return {
    firstName: parts[0] || undefined,
    lastName: parts.slice(1).join(' ') || undefined,
  };
}

async function buildUniqueUsername(admin: any, rawCandidate: string): Promise<string | undefined> {
  const base = rawCandidate.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 24);
  if (!base) return undefined;

  const { data: existingBase } = await admin
    .from('profiles')
    .select('id')
    .eq('username', base)
    .maybeSingle();
  if (!existingBase) return base;

  for (let i = 1; i <= 20; i++) {
    const suffix = String(Math.floor(Math.random() * 9000) + 1000);
    const candidate = `${base.slice(0, Math.max(1, 24 - suffix.length - 1))}_${suffix}`;
    const { data: existingCandidate } = await admin
      .from('profiles')
      .select('id')
      .eq('username', candidate)
      .maybeSingle();
    if (!existingCandidate) return candidate;
  }
  return undefined;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, email, fullName, avatarUrl } = body || {};
    
    console.log('[ensure-profile] Called with:', { userId, email, fullName, avatarUrl: !!avatarUrl });
    
    if (!userId) {
      console.log('[ensure-profile] ERROR: Missing userId');
      return new Response(JSON.stringify({ error: 'Missing userId' }), { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!url || !key) {
      console.log('[ensure-profile] ERROR: Missing env vars', { url: !!url, key: !!key });
      return new Response(JSON.stringify({ error: 'Server missing SUPABASE_SERVICE_ROLE_KEY' }), { status: 500 });
    }

    const admin = createClient(url, key);

    const updates: any = { id: userId };
    // Add columns that exist in the profiles table
    if (email) updates.email = email;
    const { firstName, lastName } = splitName(fullName);
    if (firstName) updates.first_name = firstName;
    if (lastName) updates.last_name = lastName;
    if (avatarUrl) updates.avatar_url = avatarUrl;
    // Note: no updated_at column, but created_at exists and is auto-managed

    console.log('[ensure-profile] Updates to apply:', updates);

    // Backfill username if missing: use email local-part when available
    try {
      const { data: existing } = await admin.from('profiles').select('id, username').eq('id', userId).maybeSingle();
      console.log('[ensure-profile] Existing profile:', existing);
      if (!existing || !existing.username) {
        let derivedUsername: string | undefined;
        if (email && typeof email === 'string') {
          derivedUsername = await buildUniqueUsername(admin, email.split('@')[0] || '');
        }
        if (!derivedUsername) {
          derivedUsername = await buildUniqueUsername(admin, `user_${String(userId).slice(0, 8)}`);
        }
        if (derivedUsername) {
          updates.username = derivedUsername;
          console.log('[ensure-profile] Adding derived username:', derivedUsername);
        }
      }
    } catch (usernameErr: any) {
      console.log('[ensure-profile] Username check error:', usernameErr?.message);
    }

    console.log('[ensure-profile] Final updates:', updates);
    const { data: upsertData, error } = await admin.from('profiles').upsert(updates, { onConflict: 'id' });
    
    if (error) {
      console.log('[ensure-profile] Upsert ERROR:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }
    
    console.log('[ensure-profile] SUCCESS - Profile upserted:', upsertData);
    return new Response(JSON.stringify({ ok: true, profile: upsertData }), { status: 200 });
  } catch (e: any) {
    console.log('[ensure-profile] Catch ERROR:', e?.message);
    return new Response(JSON.stringify({ error: e?.message || 'Unknown error' }), { status: 500 });
  }
}



