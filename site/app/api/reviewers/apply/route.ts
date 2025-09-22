import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bio, focusAreas, hourlyRate, avatarUrl, avatarPath, socials, instagramHandle, tiktokHandle, phone, marketingConsent, userId: userIdFromBody } = body || {};

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!url || !key) {
      return new Response(JSON.stringify({ error: 'Server not configured' }), { status: 500 });
    }
    const admin = createClient(url, key);

    // Determine user from Authorization header if present
    const auth = req.headers.get('authorization') || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    let userId: string | null = null;
    if (token) {
      try {
        const { data: u } = await admin.auth.getUser(token);
        userId = (u?.user?.id as string) || null;
      } catch {}
    }
    // Fallback for pre-verified accounts: accept explicit userId from body
    if (!userId && userIdFromBody) {
      userId = String(userIdFromBody);
    }
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // Upsert profile fields
    const updates: any = { id: userId };
    if (typeof bio === 'string') updates.bio = bio;
    if (typeof focusAreas === 'string') updates.skills = focusAreas.split(',').map((s: string) => s.trim()).filter(Boolean);
    if (!isNaN(Number(hourlyRate))) updates.hourly_rate = Number(hourlyRate);
    // Prefer storage path (server-readable) if available over signed URL
    if (avatarPath) updates.avatar_url = avatarPath;
    else if (avatarUrl) updates.avatar_url = avatarUrl;
    updates.is_reviewer = true;
    // Optionally store contact/marketing consent in preferences JSON
    updates.preferences = { marketing_consent: !!marketingConsent, phone: phone || null };

    const { error: upErr } = await admin.from('profiles').upsert(updates, { onConflict: 'id' });
    if (upErr) return new Response(JSON.stringify({ error: upErr.message }), { status: 400 });

    // Store socials if provided
    if (Array.isArray(socials) && socials.length) {
      for (const s of socials) {
        try {
          const provider = String(s.provider || '').toLowerCase();
          if (!['tiktok','instagram'].includes(provider)) continue;
          await admin.from('social_accounts').upsert({
            user_id: userId,
            provider,
            username: s.username || provider,
          }, { onConflict: 'user_id,provider' });
        } catch {}
      }
    }

    // Also persist handles into profiles.links json for convenience
    const linksUpdate: any = { id: userId };
    linksUpdate.links = {
      instagram: instagramHandle || null,
      tiktok: tiktokHandle || null,
    };
    try { await admin.from('profiles').upsert(linksUpdate, { onConflict: 'id' }); } catch {}

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Unknown error' }), { status: 500 });
  }
}


