import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function corsHeaders(req: NextRequest): HeadersInit {
  const origin = req.headers.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Max-Age': '86400',
  };
}

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path') || '';
    const bucketParam = searchParams.get('bucket') || '';
    const expiresInParam = searchParams.get('expiresIn') || '';

    if (!path) {
      return new Response(JSON.stringify({ error: 'Missing path' }), { status: 400, headers: { ...corsHeaders(req), 'content-type': 'application/json' } });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const defaultAvatarBucket = process.env.NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET || 'avatars';
    if (!url || !key) {
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500, headers: { ...corsHeaders(req), 'content-type': 'application/json' } });
    }

    const admin = createClient(url, key);
    const seconds = Number(expiresInParam || 3600);
    // Choose bucket: explicit param wins; otherwise default to avatars for safety
    const bucket = bucketParam || defaultAvatarBucket;

    const { data, error } = await (admin.storage as any).from(bucket).createSignedUrl(path, seconds);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders(req), 'content-type': 'application/json' } });
    }

    return new Response(JSON.stringify({ url: data?.signedUrl || null }), {
      headers: { ...corsHeaders(req), 'content-type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Unknown error' }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}


