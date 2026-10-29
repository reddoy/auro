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

    const admin = createClient(url, key);
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://auro-pearl.vercel.app').replace(/\/$/, '');
    // Land on reset-password so PKCE ?code= and legacy token links can establish a session there.
    const redirectTo = `${siteUrl}/auth/reset-password`;

    const { error } = await admin.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to send reset email' }, { status: 500 });
  }
}

