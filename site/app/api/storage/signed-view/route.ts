import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let path = searchParams.get('path');
    const bucketParam = searchParams.get('bucket');
    const expiresInParam = searchParams.get('expiresIn');
    
    if (!path) {
      return new Response('Missing path parameter', { status: 400 });
    }
    
    // Use requested expiration time, default to 24 hours
    const expiresIn = expiresInParam ? Math.min(Number(expiresInParam), 60 * 60 * 24 * 7) : 60 * 60 * 24;

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
    
    // Verify file exists by listing parent directory
    const pathParts = path.split('/');
    const fileName = pathParts.pop();
    const parentDir = pathParts.join('/');
    
    const { data: files, error: listError } = await supabase.storage
      .from(bucket)
      .list(parentDir || '', { limit: 1000 });
    
    if (!listError && files) {
      const fileExists = files.some(f => f.name === fileName);
      if (!fileExists) {
        console.error('File not found in directory:', path, 'bucket:', bucket);
        return new Response(JSON.stringify({ error: 'File not found' }), { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
    }
    
    // Create signed URL with requested expiration time
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);
    
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