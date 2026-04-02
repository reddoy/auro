import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Store temporary codes (in production, use Redis or similar)
const tempCodes = new Map<string, { accessToken: string; refreshToken: string; expiresAt: number }>();

// Note: In production, use Redis with TTL instead of in-memory storage

// Clean up expired codes every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [code, data] of tempCodes.entries()) {
    if (data.expiresAt < now) {
      tempCodes.delete(code);
    }
  }
}, 5 * 60 * 1000);

export async function POST(req: NextRequest) {
  try {
    const { accessToken, refreshToken } = await req.json();
    
    if (!accessToken || typeof accessToken !== 'string') {
      return NextResponse.json({ error: 'Access token required' }, { status: 400 });
    }
    
    if (!refreshToken || typeof refreshToken !== 'string') {
      return NextResponse.json({ error: 'Refresh token required' }, { status: 400 });
    }

    // Validate the token by creating a Supabase client with it
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON || '';
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    // Verify the token is valid by trying to get the user
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Generate a short-lived code (6 characters, expires in 5 minutes)
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Store both tokens for session creation
    tempCodes.set(code, { 
      accessToken, 
      refreshToken,
      expiresAt 
    });

    return NextResponse.json({ code, expiresIn: 300 }); // 5 minutes in seconds
  } catch (error: any) {
    console.error('[app-session] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create session code' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code');
    
    if (!code) {
      return NextResponse.json({ error: 'Code required' }, { status: 400 });
    }

    const codeData = tempCodes.get(code);
    
    if (!codeData) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 404 });
    }

    if (codeData.expiresAt < Date.now()) {
      tempCodes.delete(code);
      return NextResponse.json({ error: 'Code expired' }, { status: 410 });
    }

    // Use the access token to get user info and create a proper session
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON || '';

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    // Verify the token and get user info
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${codeData.accessToken}`,
        },
      },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      tempCodes.delete(code);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Delete the code after use (one-time use)
    tempCodes.delete(code);

    // Return session data that the client can use to set the session
    return NextResponse.json({ 
      accessToken: codeData.accessToken,
      refreshToken: codeData.refreshToken,
      user: {
        id: user.id,
        email: user.email,
      },
      expiresAt: codeData.expiresAt 
    });
  } catch (error: any) {
    console.error('[app-session] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to get session' }, { status: 500 });
  }
}

