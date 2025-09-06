import { initPaymentSheet, presentPaymentSheet } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export type CreatePaymentSheetParams = {
  amountCents: number;
  currency: string;
  requestId: string;
};

function resolvePaymentsBaseUrl(): string {
  const explicit =
    process.env.EXPO_PUBLIC_API_URL ||
    (Constants.expoConfig?.extra as any)?.apiUrl ||
    (Constants.manifest2 as any)?.extra?.apiUrl ||
    '';
  // If a full URL to a specific function is provided, just return it
  if (/^https?:\/\//i.test(explicit)) {
    return explicit.replace(/\/$/, '');
  }
  if (explicit) {
    return `http://${explicit}`;
  }
  // If explicit placeholder remains or empty, try to derive from Supabase URL
  const looksLikePlaceholder = /YOUR_PROJECT_REF\.functions\.supabase\.co/i.test(explicit || '');
  if (explicit && !looksLikePlaceholder) return explicit;

  // Derive from Supabase project ref if available
  const supabaseUrl =
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    (Constants.expoConfig?.extra as any)?.supabaseUrl ||
    (Constants.manifest2 as any)?.extra?.supabaseUrl ||
    '';
  const match = supabaseUrl.match(/^https?:\/\/([a-z0-9-]+)\.supabase\.co/i);
  if (match && match[1]) {
    return `https://${match[1]}.functions.supabase.co`;
  }

  // Derive from Expo dev host (works in dev clients)
  const hostUri =
    (Constants as any)?.expoConfig?.hostUri ||
    (Constants as any)?.manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any)?.manifest?.hostUri ||
    '';
  if (hostUri) {
    const host = String(hostUri).split(':')[0];
    return `http://${host}:4242`;
  }

  // Fallbacks per platform (dev server or emulator)
  if (Platform.OS === 'android') return 'http://10.0.2.2:4242'; // Android emulator maps localhost
  return 'http://localhost:4242';
}

export async function openPaymentSheet(params: CreatePaymentSheetParams): Promise<{ completed: boolean; errorMessage?: string }> {
  try {
    const baseUrl = resolvePaymentsBaseUrl();
    // If baseUrl already points to a specific function endpoint, use as-is; else append our default name
    const endpoint = /\/functions\//.test(baseUrl)
      ? baseUrl
      : `${baseUrl}/payments-create-sheet`;
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token || '';
    const supabaseAnonKey =
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
      (Constants.expoConfig?.extra as any)?.supabaseAnonKey ||
      (Constants.manifest2 as any)?.extra?.supabaseAnonKey ||
      '';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
    if (supabaseAnonKey) headers['apikey'] = supabaseAnonKey;
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ amountCents: params.amountCents, currency: params.currency, requestId: params.requestId }),
    });
    if (!resp.ok) {
      const raw = await resp.text();
      try {
        const errObj = raw ? JSON.parse(raw) : {};
        return { completed: false, errorMessage: errObj?.error || raw || 'Payment server error' };
      } catch {
        return { completed: false, errorMessage: raw || 'Payment server error' };
      }
    }
    const { paymentIntentClientSecret, ephemeralKey, customerId, merchantDisplayName } = await resp.json();

    const init = await initPaymentSheet({
      paymentIntentClientSecret,
      customerEphemeralKeySecret: ephemeralKey,
      customerId,
      merchantDisplayName,
      allowsDelayedPaymentMethods: false,
    });
    if (init.error) {
      return { completed: false, errorMessage: init.error.message };
    }
    const present = await presentPaymentSheet();
    if (present.error) {
      return { completed: false, errorMessage: present.error.message };
    }
    return { completed: true };
  } catch (e: any) {
    return { completed: false, errorMessage: e?.message || 'Payment failed' };
  }
}


