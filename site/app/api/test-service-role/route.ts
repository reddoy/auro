import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    console.log('[test-service-role] Env check:', { 
      url: !!url, 
      key: !!key,
      keyPrefix: key ? key.substring(0, 10) + '...' : 'missing'
    });
    
    if (!url || !key) {
      return new Response(JSON.stringify({ 
        error: 'Missing env vars', 
        url: !!url, 
        key: !!key 
      }), { status: 500 });
    }

    const admin = createClient(url, key);
    
    // Test basic connection
    const { data, error } = await admin.from('profiles').select('count', { count: 'exact' });
    
    if (error) {
      console.log('[test-service-role] Query error:', error);
      return new Response(JSON.stringify({ 
        error: 'Query failed', 
        details: error.message 
      }), { status: 400 });
    }
    
    console.log('[test-service-role] Success:', data);
    return new Response(JSON.stringify({ 
      success: true, 
      profileCount: (data as any)?.count || 0,
      message: 'Service role key works!'
    }), { status: 200 });
    
  } catch (e: any) {
    console.log('[test-service-role] Catch error:', e?.message);
    return new Response(JSON.stringify({ 
      error: 'Exception', 
      message: e?.message 
    }), { status: 500 });
  }
}
