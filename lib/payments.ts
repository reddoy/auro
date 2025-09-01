import { initPaymentSheet, presentPaymentSheet } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';

export type CreatePaymentSheetParams = {
  amountCents: number;
  currency: string;
  requestId: string;
};

export async function openPaymentSheet(params: CreatePaymentSheetParams): Promise<{ completed: boolean; errorMessage?: string }> {
  try {
    const baseUrl =
      process.env.EXPO_PUBLIC_API_URL ||
      (Constants.expoConfig?.extra as any)?.apiUrl ||
      (Constants.manifest2 as any)?.extra?.apiUrl ||
      '';
    const resp = await fetch(`${baseUrl}/payments/create-payment-sheet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountCents: params.amountCents, currency: params.currency, requestId: params.requestId }),
    });
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


