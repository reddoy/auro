import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const provider = String(req.nextUrl.searchParams.get('provider') || '').toLowerCase();
  const returnTo = req.nextUrl.searchParams.get('return_to') || '';
  if (!['tiktok','instagram'].includes(provider)) {
    return new Response(JSON.stringify({ error: 'Invalid provider' }), { status: 400 });
  }

  // Env-driven: if not configured, signal to client
  const isConfigured = provider === 'tiktok'
    ? !!process.env.TIKTOK_CLIENT_ID
    : !!process.env.IG_APP_ID && !!process.env.FB_APP_ID;

  if (!isConfigured) {
    return new Response(JSON.stringify({ error: 'Not configured', help: 'Set provider client IDs on the server' }), { status: 501 });
  }

  // In a real implementation, construct the provider authorization URL with redirect back to /api/social/connect/callback/[provider]
  // Here we return a placeholder URL to keep client flow intact until configured.
  const placeholder = `https://example.com/oauth/${provider}?redirect_uri=${encodeURIComponent(returnTo || '')}`;
  return new Response(JSON.stringify({ url: placeholder }), { status: 200 });
}


