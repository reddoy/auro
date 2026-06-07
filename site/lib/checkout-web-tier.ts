/**
 * Web checkout price from reviewer hourly_rate (whole dollars, $1–$10000).
 * Keep in sync with PaymentStep display and create-session API.
 */
export const CHECKOUT_PRICE_MIN = 1;
export const CHECKOUT_PRICE_MAX = 10000;

export function getCheckoutPriceDollars(rate: number): number {
  const dollars = Math.round(Number(rate));
  if (!Number.isFinite(dollars) || dollars < CHECKOUT_PRICE_MIN) {
    return CHECKOUT_PRICE_MIN;
  }
  if (dollars > CHECKOUT_PRICE_MAX) {
    return CHECKOUT_PRICE_MAX;
  }
  return dollars;
}

/** @deprecated Use getCheckoutPriceDollars — kept for existing imports. */
export function findNearestCheckoutTierDollars(rate: number): number {
  return getCheckoutPriceDollars(rate);
}
