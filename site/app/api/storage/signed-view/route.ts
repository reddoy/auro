import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

function corsHeaders(req: NextRequest): HeadersInit {
  const origin = req.headers.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
    let path = searchParams.get('path');
    const bucketParam = searchParams.get('bucket');
    const expiresInParam = searchParams.get('expiresIn');
    
    if (!path) {
      return new Response(JSON.stringify({ error: 'Missing path parameter' }), { 
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders(req)
        }
      });
    }
    
    // Use requested expiration time, default to 24 hours
    const expiresIn = expiresInParam ? Math.min(Number(expiresInParam), 60 * 60 * 24 * 7) : 60 * 60 * 24;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!url || !key) {
      console.error('[signed-view] Missing configuration:', { hasUrl: !!url, hasKey: !!key });
      return new Response(JSON.stringify({ 
        error: 'Server not configured',
        details: 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables'
      }), { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders(req)
        }
      });
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
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders(req)
            } 
          });
        }
        
        // Use the first file found
        path = path + files[0].name;
      } catch (err) {
        console.error('Error resolving directory path:', err);
        return new Response(JSON.stringify({ error: 'Failed to resolve directory path' }), { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders(req)
          } 
        });
      }
    }
    
    // Verify file exists by listing parent directory
    // Note: We skip this check if it fails, as some buckets may not allow listing
    // but still allow signed URL access to specific files
    try {
      const pathParts = path.split('/');
      const fileName = pathParts.pop();
      const parentDir = pathParts.join('/');
      
      const { data: files, error: listError } = await supabase.storage
        .from(bucket)
        .list(parentDir || '', { limit: 1000 });
      
      if (!listError && files) {
        const fileExists = files.some(f => f.name === fileName);
        if (!fileExists) {
          console.error('[signed-view] File not found in directory:', path, 'bucket:', bucket, 'parentDir:', parentDir);
          // Don't return 404 here - still try to create signed URL as file might exist
          // The signed URL will fail to load if file doesn't exist, which is acceptable
        }
      } else if (listError) {
        // Log but don't fail - listing might not be allowed but file access might work
        console.warn('[signed-view] Could not list directory (may not have permission):', listError.message, 'path:', path);
      }
    } catch (listCheckError) {
      // Ignore list check errors - proceed to create signed URL anyway
      console.warn('[signed-view] Error checking file existence:', listCheckError);
    }
    
    // Create signed URL with requested expiration time
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);
    
    if (error) {
      console.error('[signed-view] Error creating signed URL:', error, 'path:', path, 'bucket:', bucket, 'errorCode:', error.statusCode);
      return new Response(JSON.stringify({ 
        error: error.message || 'Failed to create signed URL',
        details: `Bucket: ${bucket}, Path: ${path}`,
        errorCode: error.statusCode
      }), { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders(req)
        } 
      });
    }
    
    if (!data?.signedUrl) {
      console.error('[signed-view] No signed URL in response data:', data, 'path:', path, 'bucket:', bucket);
      return new Response(JSON.stringify({ error: 'No signed URL generated' }), { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders(req)
        } 
      });
    }
    
    // Log successful signing (can be removed in production if too verbose)
    console.log('[signed-view] Successfully created signed URL for:', path, 'bucket:', bucket);
    
    // Return JSON response with the signed URL
    return new Response(JSON.stringify({ url: data.signedUrl }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders(req)
      }
    });
    
  } catch (error) {
    console.error('Signed view error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500, 
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders(req)
      } 
    });
  }
}