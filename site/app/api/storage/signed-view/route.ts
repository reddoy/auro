import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path') || '';
    const bucketParam = searchParams.get('bucket') || '';
    const expiresInParam = searchParams.get('expiresIn') || '';

    if (!path) {
      return new Response(JSON.stringify({ error: 'Missing path' }), { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const defaultAvatarBucket = process.env.NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET || 'avatars';
    if (!url || !key) {
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500 });
    }

    const admin = createClient(url, key);
    const seconds = Number(expiresInParam || 3600);
    // Choose bucket: explicit param wins; otherwise default to avatars for safety
    const bucket = bucketParam || defaultAvatarBucket;

    const { data, error } = await (admin.storage as any).from(bucket).createSignedUrl(path, seconds);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ url: data?.signedUrl || null }), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Unknown error' }), { status: 500 });
  }
}


