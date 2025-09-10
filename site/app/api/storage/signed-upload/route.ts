import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { fileName, contentType, category } = await req.json();
    if (!fileName || !contentType) {
      return new Response(JSON.stringify({ error: 'Missing fileName or contentType' }), { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON || '';
    if (!url || !key) {
      return new Response(JSON.stringify({ error: 'Supabase not configured' }), { status: 500 });
    }

    const supabase = createClient(url, key);

    // Build a path that does not require user auth on the client
    const safeCategory = (category || 'web').toString().replace(/[^a-zA-Z0-9_-]/g, '');
    const fileExt = (fileName.split('.').pop() || 'jpg').toLowerCase();
    const objectPath = `web/${safeCategory}/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;

    const bucket = process.env.NEXT_PUBLIC_SUPABASE_REQUEST_MEDIA_BUCKET || 'request-media';

    // Create a signed URL for upload using uploadToSignedUrl (requires supabase-js v2.49+)
    // Fallback: use admin upload with empty body to reserve path and return signed PUT URL
    const { data, error } = await (supabase.storage as any).from(bucket).createSignedUploadUrl(objectPath);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    const { signedUrl, path, token } = data as { signedUrl: string; path: string; token: string };

    return new Response(
      JSON.stringify({ signedUrl, path, token, contentType, bucket }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Unknown error' }), { status: 500 });
  }
}


