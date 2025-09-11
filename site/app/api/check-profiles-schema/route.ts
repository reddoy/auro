import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!url || !key) {
      return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500 });
    }

    const admin = createClient(url, key);
    
    // Query the schema to see what columns exist in profiles table
    const { data, error } = await admin
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'profiles')
      .eq('table_schema', 'public');
    
    if (error) {
      console.log('Schema query error:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }
    
    console.log('Profiles table schema:', data);
    return new Response(JSON.stringify({ 
      success: true, 
      columns: data 
    }), { status: 200 });
    
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message }), { status: 500 });
  }
}
