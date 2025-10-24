import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: 'Email required' }), { status: 400 });
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON || '';
    if (!url || !key) {
      return new Response(JSON.stringify({ error: 'Supabase not configured' }), { status: 500 });
    }
    const admin = createClient(url, key);
    // send magic link/verification email
    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.appauro.com'}/auth/confirm`;
    const { error } = await (admin.auth as any).resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Failed to resend verification' }), { status: 400 });
  }
}


