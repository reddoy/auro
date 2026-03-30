import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON || '';
    
    if (!url || !key) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    // Get auth token from request
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const admin = createClient(url, key);
    
    // Verify the token and get user
    const { data: { user }, error: userError } = await admin.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://appauro.com';
    const redirectTo = `${siteUrl}/auth/confirm?type=invite&email=${encodeURIComponent(email)}`;

    // Send invitation email using the resend method with type 'invite'
    const { error } = await (admin.auth as any).resend({
      type: 'invite',
      email,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to send invitation' }, { status: 500 });
  }
}

