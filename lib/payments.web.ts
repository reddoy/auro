import type { CreatePaymentSheetParams } from './payments';
import { supabase } from './supabase.web';

export async function openPaymentSheet(_params: CreatePaymentSheetParams): Promise<{ completed: boolean; errorMessage?: string }> {
  console.warn('openPaymentSheet is not supported on web. Skipping payment flow.');
  return { completed: false, errorMessage: 'Payments are not available on web preview.' };
}

export async function createStripeExpressLoginLink(reviewerId: string): Promise<string | null> {
  try {
    // Build auth headers for Supabase Edge Functions
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token || '';
    const anonKey =
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      '';
    const fnHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (anonKey) fnHeaders['apikey'] = anonKey;
    if (accessToken) {
      fnHeaders['Authorization'] = `Bearer ${accessToken}`;
    } else if (anonKey) {
      fnHeaders['Authorization'] = `Bearer ${anonKey}`;
    }

    // Build candidate URLs (prefer explicit, then project ref default)
    const urls: string[] = [];
    const explicit = process.env.EXPO_PUBLIC_SUPABASE_FN_LOGIN_URL || process.env.NEXT_PUBLIC_SUPABASE_FN_LOGIN_URL;
    if (explicit) urls.push(explicit);

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const projectRef = (supabaseUrl.match(/^https?:\/\/([a-z0-9-]+)\.supabase\.co/i) || [])[1];
    if (projectRef) urls.push(`https://${projectRef}.functions.supabase.co/connect-express-login`);

    // Hardcoded fallback to your project
    urls.push('https://zxazjbduiistnfstnwka.supabase.co/functions/v1/connect-express-login');

    for (const url of urls) {
      try {
        console.log('[stripe-login] trying', url);
        const resp = await fetch(url, { method: 'POST', headers: fnHeaders, body: JSON.stringify({ reviewerId }) });
        if (!resp.ok) {
          let errorBody: any = null;
          try {
            const raw = await resp.text();
            errorBody = raw ? JSON.parse(raw) : null;
          } catch {}
          console.log('[stripe-login] non-OK', url, resp.status, errorBody || '');
          continue;
        }
        const json = await resp.json();
        const found = json?.url || null;
        console.log('[stripe-login] success', url, Boolean(found));
        if (found) return found;
      } catch (e: any) {
        console.log('[stripe-login] error', url, e?.message || String(e));
      }
    }

    // Fallback to site API route (only when explicitly set)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
    if (!siteUrl) return null;
    const resp = await fetch(`${siteUrl}/api/stripe/express-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewerId, returnUrl: siteUrl }),
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    return json?.url || null;
  } catch {
    return null;
  }
}

export async function createStripeExpressOnboardingLink(reviewerId: string): Promise<string | null> {
  try {
    // Build auth headers for Supabase Edge Functions
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token || '';
    const anonKey =
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      '';
    const fnHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (anonKey) fnHeaders['apikey'] = anonKey;
    if (accessToken) {
      fnHeaders['Authorization'] = `Bearer ${accessToken}`;
    } else if (anonKey) {
      fnHeaders['Authorization'] = `Bearer ${anonKey}`;
    }
    // 1) Build candidate URLs in order
    const attemptUrls: string[] = [];
    const explicit = process.env.EXPO_PUBLIC_SUPABASE_FN_ONBOARDING_URL || process.env.NEXT_PUBLIC_SUPABASE_FN_ONBOARDING_URL;
    if (explicit) attemptUrls.push(explicit);

    // 2) Derive from Supabase project ref
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const projectRef = (supabaseUrl.match(/^https?:\/\/([a-z0-9-]+)\.supabase\.co/i) || [])[1];
    if (projectRef) {
      const base = `https://${projectRef}.functions.supabase.co`;
      attemptUrls.push(`${base}/connect-express-onboarding`);
    }

    // 2b) Hardcoded project fallback
    attemptUrls.push('https://zxazjbduiistnfstnwka.supabase.co/functions/v1/connect-express-onboarding');

    // Try all candidates with logging
    for (const url of attemptUrls) {
      try {
        console.log('[stripe-onboarding] trying', url);
        const resp = await fetch(url, { method: 'POST', headers: fnHeaders, body: JSON.stringify({ reviewerId }) });
        if (!resp.ok) {
          let errorBody: any = null;
          try {
            const raw = await resp.text();
            errorBody = raw ? JSON.parse(raw) : null;
          } catch {}
          console.log('[stripe-onboarding] non-OK', url, resp.status, errorBody || '');
          continue;
        }
        const json = await resp.json();
        const found = json?.url || null;
        console.log('[stripe-onboarding] success', url, Boolean(found));
        if (found) return found;
      } catch (e: any) {
        console.log('[stripe-onboarding] error', url, e?.message || String(e));
      }
    }

    // 3) Fallback to site API route (only when explicitly set)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
    if (!siteUrl) return null;
    const resp = await fetch(`${siteUrl}/api/stripe/express-onboarding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewerId, returnUrl: siteUrl }),
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    return json?.url || null;
  } catch {
    return null;
  }
}

export type PendingPaymentsData = {
  pendingAmountCents: number;
  pendingAmountDollars: number;
  currency: string;
  recentTransfers: Array<{
    id: string;
    amount: number;
    amountDollars: number;
    currency: string;
    status: string;
    created: number;
    description: string | null;
  }>;
};

export async function getPendingPayments(reviewerId: string): Promise<PendingPaymentsData | null> {
  console.log('[getPendingPayments] called with reviewerId:', reviewerId);
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.EXPO_PUBLIC_SITE_URL || '';
    if (!siteUrl) return null;
    
    const resp = await fetch(`${siteUrl}/api/stripe/pending-payments?reviewerId=${encodeURIComponent(reviewerId)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!resp.ok) return null;
    const json = await resp.json();
    return json;
  } catch {
    return null;
  }
}


