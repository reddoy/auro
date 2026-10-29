import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!url || !serviceKey) {
      return NextResponse.json(
        { error: 'Confirmation emails are not configured on the server. Please contact support.' },
        { status: 500 }
      );
    }

    const admin = createClient(url, serviceKey);
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://auro-pearl.vercel.app').replace(/\/$/, '');
    const redirectTo = `${siteUrl}/auth/confirm?type=signup`;

    const { error } = await (admin.auth as any).resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to send confirmation email' }, { status: 500 });
  }
}

