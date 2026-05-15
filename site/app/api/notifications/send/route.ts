import { createClient } from '@supabase/supabase-js';
import { isTrustedInternalRequest } from '@/lib/internal-fetch-secret';

const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send';

export async function POST(req: Request) {
  if (!isTrustedInternalRequest(req)) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { userId, title, body, data } = await req.json();
    
    if (!userId || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, title, body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!url || !key) {
      return new Response(
        JSON.stringify({ error: 'Server misconfigured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const admin = createClient(url, key);
    
    // Get user's push token
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('push_token')
      .eq('id', userId)
      .maybeSingle();
    
    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user profile' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (!profile?.push_token) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No push token found for user',
          userId 
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Send push notification via Expo API
    const response = await fetch(EXPO_PUSH_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify({
        to: profile.push_token,
        sound: 'default',
        title,
        body,
        data: data || {},
        priority: 'high',
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('Expo Push API error:', result);
      return new Response(
        JSON.stringify({ error: 'Failed to send push notification', details: result }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send notification:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

