import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function isSafeAvatarPath(p: string): boolean {
  if (!p || p.includes('..') || p.includes('//')) return false;
  return /^profiles\/[a-zA-Z0-9._-]+\/profile\.(jpe?g|png|webp)$/i.test(p);
}

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization');
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = auth.replace(/^Bearer\s+/i, '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    if (!body || typeof body !== 'object' || !('path' in body)) {
      return NextResponse.json({ error: 'Missing path' }, { status: 400 });
    }
    const path = (body as { path: unknown }).path as string | null | undefined;

    if (path !== null && path !== undefined && typeof path !== 'string') {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    if (typeof path === 'string' && path.length > 0 && !isSafeAvatarPath(path)) {
      return NextResponse.json({ error: 'Invalid avatar path' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON || '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const nextUrl = path && path.length > 0 ? path : null;

    const { error: upErr } = await admin.from('profiles').update({ avatar_url: nextUrl }).eq('id', user.id);

    if (upErr) {
      console.error('[account/avatar]', upErr);
      return NextResponse.json({ error: upErr.message || 'Update failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, avatar_url: nextUrl });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
