import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let path = searchParams.get('path');
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
    
    // If the path ends with a slash, it's a directory - find the actual file
    if (path.endsWith('/')) {
      try {
        const { data: files, error: listError } = await supabase.storage
          .from(bucket)
          .list(path, { limit: 1, sortBy: { column: 'created_at', order: 'desc' } });
        
        if (listError || !files || files.length === 0) {
          console.error('Error listing directory or no files found:', listError, 'path:', path);
          return new Response(JSON.stringify({ error: 'No files found in directory' }), { 
            status: 404, 
            headers: { 'Content-Type': 'application/json' } 
          });
        }
        
        // Use the first file found
        path = path + files[0].name;
        console.log('Resolved directory to file:', path);
      } catch (err) {
        console.error('Error resolving directory path:', err);
        return new Response(JSON.stringify({ error: 'Failed to resolve directory path' }), { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
    }
    
    // Create signed URL that expires in 24 hours
    // Note: Supabase will create a signed URL even if the file doesn't exist
    // The URL will return 404/400 when accessed if the file is missing
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 60 * 24);
    
    if (error) {
      console.error('Error creating signed URL:', error, 'path:', path, 'bucket:', bucket);
      return new Response(JSON.stringify({ error: error.message || 'Failed to create signed URL' }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    if (!data?.signedUrl) {
      return new Response(JSON.stringify({ error: 'No signed URL generated' }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // Return JSON response with the signed URL
    return new Response(JSON.stringify({ url: data.signedUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Signed view error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}