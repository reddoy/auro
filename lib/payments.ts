import Constants from 'expo-constants';
import { supabase } from './supabase';

// Note: In-app payments are not supported. All payments are processed through
// Stripe Checkout (web-based redirect flow) on the website.
// This file only contains functions for Stripe Connect (reviewer payouts).

export type CreatePaymentSheetParams = {
  amountCents: number;
  currency: string;
  requestId: string;
};

// openPaymentSheet is not implemented - payments use web checkout
export async function openPaymentSheet(_params: CreatePaymentSheetParams): Promise<{ completed: boolean; errorMessage?: string }> {
  return { completed: false, errorMessage: 'In-app payments are not supported. Please use the web checkout flow.' };
}

export async function createStripeExpressLoginLink(reviewerId: string): Promise<string | null> {
  try {
    // Build auth headers for Supabase Edge Functions (401 without Authorization)
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token || '';
    const supabaseAnonKey =
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      (Constants.expoConfig?.extra as any)?.supabaseAnonKey ||
      (Constants.manifest2 as any)?.extra?.supabaseAnonKey ||
      '';
    const fnHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (supabaseAnonKey) fnHeaders['apikey'] = supabaseAnonKey;
    if (accessToken || supabaseAnonKey) fnHeaders['Authorization'] = `Bearer ${accessToken || supabaseAnonKey}`;

    // 1) Explicit function URL override
    const explicit = process.env.EXPO_PUBLIC_SUPABASE_FN_LOGIN_URL;
    if (explicit) {
      const resp = await fetch(explicit, { method: 'POST', headers: fnHeaders, body: JSON.stringify({ reviewerId }) });
      if (resp.ok) { const json = await resp.json(); return json?.url || null; }
    }

    // 2) Derive from Supabase project ref
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || (Constants.expoConfig?.extra as any)?.supabaseUrl || (Constants.manifest2 as any)?.extra?.supabaseUrl || '';
    if (supabaseUrl) {
      const projectRef = (supabaseUrl.match(/^https?:\/\/([a-z0-9-]+)\.supabase\.co/i) || [])[1];
      if (projectRef) {
        const base = `https://${projectRef}.functions.supabase.co`;
        const endpoint = `${base}/connect-express-login`;
        const resp = await fetch(endpoint, { method: 'POST', headers: fnHeaders, body: JSON.stringify({ reviewerId }) });
        if (resp.ok) { const json = await resp.json(); return json?.url || null; }
      }
    }

    // 2b) Hardcoded project fallback (user provided fixed URLs)
    try {
      const hardcoded = 'https://zxazjbduiistnfstnwka.supabase.co/functions/v1/connect-express-login';
      const resp = await fetch(hardcoded, { method: 'POST', headers: fnHeaders, body: JSON.stringify({ reviewerId }) });
      if (resp.ok) { const json = await resp.json(); return json?.url || null; }
    } catch {}

    // 3) Fallback to site API route if configured
    const siteUrl = process.env.EXPO_PUBLIC_SITE_URL || (Constants.expoConfig?.extra as any)?.siteUrl || (Constants.manifest2 as any)?.extra?.siteUrl || '';
    if (!siteUrl) return null;
    const resp = await fetch(`${siteUrl}/api/stripe/express-login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reviewerId, returnUrl: siteUrl }) });
    if (!resp.ok) return null;
    const json = await resp.json();
    return json?.url || null;
  } catch {
    return null;
  }
}

export async function createStripeExpressOnboardingLink(reviewerId: string): Promise<string | null> {
  try {
    // Build auth headers for Supabase Edge Functions (401 without Authorization)
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token || '';
    const supabaseAnonKey =
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
      (Constants.expoConfig?.extra as any)?.supabaseAnonKey ||
      (Constants.manifest2 as any)?.extra?.supabaseAnonKey ||
      '';
    const fnHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (supabaseAnonKey) fnHeaders['apikey'] = supabaseAnonKey;
    if (accessToken || supabaseAnonKey) fnHeaders['Authorization'] = `Bearer ${accessToken || supabaseAnonKey}`;

    // Get site URL for success page redirect
    const siteUrl = process.env.EXPO_PUBLIC_SITE_URL || (Constants.expoConfig?.extra as any)?.siteUrl || (Constants.manifest2 as any)?.extra?.siteUrl || '';
    const successUrl = siteUrl ? `${siteUrl}/auth/stripe-connect-success` : undefined;

    // 1) Explicit function URL override
    const explicit = process.env.EXPO_PUBLIC_SUPABASE_FN_ONBOARDING_URL;
    if (explicit) {
      const resp = await fetch(explicit, { method: 'POST', headers: fnHeaders, body: JSON.stringify({ reviewerId, returnUrl: successUrl }) });
      if (resp.ok) { const json = await resp.json(); return json?.url || null; }
    }

    // 2) Derive from Supabase project ref
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || (Constants.expoConfig?.extra as any)?.supabaseUrl || (Constants.manifest2 as any)?.extra?.supabaseUrl || '';
    if (supabaseUrl) {
      const projectRef = (supabaseUrl.match(/^https?:\/\/([a-z0-9-]+)\.supabase\.co/i) || [])[1];
      if (projectRef) {
        const base = `https://${projectRef}.functions.supabase.co`;
        const endpoint = `${base}/connect-express-onboarding`;
        const resp = await fetch(endpoint, { method: 'POST', headers: fnHeaders, body: JSON.stringify({ reviewerId, returnUrl: successUrl }) });
        if (resp.ok) { const json = await resp.json(); return json?.url || null; }
      }
    }

    // 2b) Hardcoded project fallback (user provided fixed URLs)
    try {
      const hardcoded = 'https://zxazjbduiistnfstnwka.supabase.co/functions/v1/connect-express-onboarding';
      const resp = await fetch(hardcoded, { method: 'POST', headers: fnHeaders, body: JSON.stringify({ reviewerId, returnUrl: successUrl }) });
      if (resp.ok) { const json = await resp.json(); return json?.url || null; }
    } catch {}

    // 3) Fallback to site API route if configured
    if (!siteUrl) return null;
    const resp = await fetch(`${siteUrl}/api/stripe/express-onboarding`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reviewerId, returnUrl: successUrl }) });
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
    const siteUrl = process.env.EXPO_PUBLIC_SITE_URL || (Constants.expoConfig?.extra as any)?.siteUrl || (Constants.manifest2 as any)?.extra?.siteUrl || '';
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


