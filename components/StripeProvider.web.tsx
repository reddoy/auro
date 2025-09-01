import React, { PropsWithChildren } from 'react';

type StripeProviderProps = PropsWithChildren<Record<string, unknown>>;

export function StripeProvider({ children }: StripeProviderProps) {
  return <>{children}</>;
}


