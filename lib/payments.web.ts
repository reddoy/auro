import type { CreatePaymentSheetParams } from './payments';

export async function openPaymentSheet(_params: CreatePaymentSheetParams): Promise<{ completed: boolean; errorMessage?: string }> {
  console.warn('openPaymentSheet is not supported on web. Skipping payment flow.');
  return { completed: false, errorMessage: 'Payments are not available on web preview.' };
}


