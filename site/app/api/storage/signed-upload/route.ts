import { createClient } from '@supabase/supabase-js';

function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Max-Age': '86400',
  };
}

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fileName, contentType, category, uploadSessionId, action, path, expiresIn } = body || {};

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON || '';
    if (!url || !key) {
      return new Response(JSON.stringify({ error: 'Supabase not configured' }), { status: 500, headers: { ...corsHeaders(req), 'content-type': 'application/json' } });
    }

    const supabase = createClient(url, key);

    const requestMediaBucket = process.env.NEXT_PUBLIC_SUPABASE_REQUEST_MEDIA_BUCKET || 'request-media';
    const avatarBucket = process.env.NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET || 'avatars';

    // Server-signed view URL
    if (action === 'sign-view') {
      if (!path) {
        return new Response(JSON.stringify({ error: 'Missing path' }), { status: 400, headers: { ...corsHeaders(req), 'content-type': 'application/json' } });
      }
      const seconds = Number(expiresIn || 60 * 60 * 24);
      // Determine bucket from path if category specified in path; default to request-media
      const whichBucket = (typeof path === 'string' && path.includes('temp-uploads/') && path.includes('/selfie/')) ? avatarBucket : requestMediaBucket;
      const { data: signed, error: signErr } = await supabase.storage.from(whichBucket).createSignedUrl(path, seconds);
      if (signErr) {
        return new Response(JSON.stringify({ error: signErr.message }), { status: 400, headers: { ...corsHeaders(req), 'content-type': 'application/json' } });
      }
      return new Response(JSON.stringify({ signedUrl: signed?.signedUrl || '' }), { status: 200, headers: { ...corsHeaders(req), 'content-type': 'application/json' } });
    }

    // Signed upload URL issue
    if (!fileName || !contentType) {
      return new Response(JSON.stringify({ error: 'Missing fileName or contentType' }), { status: 400, headers: { ...corsHeaders(req), 'content-type': 'application/json' } });
    }

    const safeCategory = (category || 'web').toString().replace(/[^a-zA-Z0-9_-]/g, '');
    const safeSession = (uploadSessionId || 'anon').toString().replace(/[^a-zA-Z0-9_-]/g, '');
    const fileExt = (fileName.split('.').pop() || 'jpg').toLowerCase();
    const objectPath = `temp-uploads/${safeSession}/${safeCategory}/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;

    const bucket = safeCategory === 'selfie' ? avatarBucket : requestMediaBucket;
    const { data, error } = await (supabase.storage as any).from(bucket).createSignedUploadUrl(objectPath);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders(req), 'content-type': 'application/json' } });
    }

    const { signedUrl, path: createdPath, token } = data as { signedUrl: string; path: string; token: string };

    return new Response(
      JSON.stringify({ signedUrl, path: createdPath, token, contentType, bucket }),
      { status: 200, headers: { ...corsHeaders(req), 'content-type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Unknown error' }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}


