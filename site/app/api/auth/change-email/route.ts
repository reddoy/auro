import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { newEmail } = await req.json();
    
    if (!newEmail) {
      return NextResponse.json({ error: 'New email is required' }, { status: 400 });
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

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://auro-pearl.vercel.app';
    const redirectTo = `${siteUrl}/auth/confirm?type=email_change&email=${encodeURIComponent(newEmail)}`;

    // Update email - Supabase will automatically send a verification email to the new address
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      email: newEmail,
      email_confirm: false, // Require email confirmation - this triggers the verification email
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to send verification email' }, { status: 500 });
  }
}

