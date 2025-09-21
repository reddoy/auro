import Constants from 'expo-constants';
import { supabase } from './supabase';

function resolveSiteApiBase(): string {
  const explicit = process.env.EXPO_PUBLIC_SITE_API_URL || (Constants.expoConfig?.extra as any)?.siteApiUrl || '';
  if (explicit) return explicit.replace(/\/$/, '');
  // fallback to payments base derivation logic if needed in future
  return '';
}

export type SocialAccount = { provider: 'tiktok' | 'instagram'; username?: string | null; external_user_id?: string | null; expires_at?: string | null; scope?: string | null };

export async function fetchLinkedSocialAccounts(): Promise<SocialAccount[]> {
  const base = resolveSiteApiBase();
  const endpoint = base ? `${base}/social/status` : '/api/social/status';
  const { data: session } = await supabase.auth.getSession();
  const access = session.session?.access_token || '';
  const resp = await fetch(endpoint, { headers: { Authorization: access ? `Bearer ${access}` : '' } });
  if (!resp.ok) return [];
  const json = await resp.json();
  return (json?.accounts || []) as SocialAccount[];
}

export async function unlinkSocialAccount(provider: 'tiktok' | 'instagram'): Promise<boolean> {
  const base = resolveSiteApiBase();
  const endpoint = base ? `${base}/social/unlink` : '/api/social/unlink';
  const { data: session } = await supabase.auth.getSession();
  const access = session.session?.access_token || '';
  const resp = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: access ? `Bearer ${access}` : '' }, body: JSON.stringify({ provider }) });
  return resp.ok;
}

export async function startSocialConnect(provider: 'tiktok' | 'instagram', returnTo?: string): Promise<string | null> {
  const base = resolveSiteApiBase();
  const endpoint = base ? `${base}/social/connect/start` : '/api/social/connect/start';
  const url = `${endpoint}?provider=${encodeURIComponent(provider)}${returnTo ? `&return_to=${encodeURIComponent(returnTo)}` : ''}`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const json = await resp.json();
    return json?.url || null;
  } catch {
    return null;
  }
}


