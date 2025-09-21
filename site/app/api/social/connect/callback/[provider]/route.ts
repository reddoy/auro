import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest, { params }: { params: { provider: string } }) {
  try {
    const provider = String(params.provider || '').toLowerCase();
    if (!['tiktok','instagram'].includes(provider)) return new Response('Invalid provider', { status: 400 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!url || !serviceKey) return new Response('Server not configured', { status: 500 });
    const admin = createClient(url, serviceKey);

    // In a real implementation, exchange code for access token here.
    // For now, mark as linked with placeholder values when a user token is supplied via state or cookie.
    const userId = req.nextUrl.searchParams.get('user_id');
    const username = req.nextUrl.searchParams.get('username') || provider;
    if (!userId) return new Response('Missing user context', { status: 400 });

    const { error } = await admin.from('social_accounts').upsert({
      user_id: userId,
      provider,
      username,
      external_user_id: null,
      access_token: null,
      refresh_token: null,
      expires_at: null,
      scope: null,
    }, { onConflict: 'user_id,provider' });
    if (error) return new Response(error.message, { status: 400 });

    const appReturn = req.nextUrl.searchParams.get('return_to') || '';
    if (appReturn) {
      return Response.redirect(appReturn, 302);
    }
    return new Response('Linked. You can close this window.', { status: 200 });
  } catch (e: any) {
    return new Response(e?.message || 'Error', { status: 500 });
  }
}


