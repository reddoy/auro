import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path');
    const bucketParam = searchParams.get('bucket');
    
    if (!path) {
      return new Response('Missing path parameter', { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!url || !key) {
      return new Response('Server not configured', { status: 500 });
    }

    const supabase = createClient(url, key);
    
    // Use provided bucket parameter, or determine bucket based on path
    const requestMediaBucket = process.env.NEXT_PUBLIC_SUPABASE_REQUEST_MEDIA_BUCKET || 'request-media';
    const avatarBucket = process.env.NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET || 'avatars';
    
    const bucket = bucketParam || ((path.includes('/avatar/') || path.includes('/selfie/')) ? avatarBucket : requestMediaBucket);
    
    // Create signed URL that expires in 24 hours
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 60 * 24);
    
    if (error) {
      console.error('Error creating signed URL:', error);
      return new Response('Failed to create signed URL', { status: 500 });
    }
    
    if (!data?.signedUrl) {
      return new Response('No signed URL generated', { status: 500 });
    }
    
    // Return JSON response with the signed URL
    return new Response(JSON.stringify({ url: data.signedUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Signed view error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}