import React, { PropsWithChildren } from 'react';

type StripeProviderProps = PropsWithChildren<Record<string, unknown>>;

// StripeProvider is no longer needed since we don't use in-app payments
// All payments are processed through Stripe Checkout (web-based redirect)
export function StripeProvider({ children }: StripeProviderProps) {
  return <>{children}</>;
}


