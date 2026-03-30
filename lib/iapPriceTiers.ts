/**
 * Price tiers for reviewer rates (web checkout amount).
 * Kept in sync with site/lib/priceTiers.ts.
 */
export const PRICE_TIERS = [
  5, 10, 15, 20, 25, 30, 35, 40, 45, 50,
  55, 60, 65, 70, 75, 80, 85, 90, 95, 100,
  125, 150, 175, 200,
  250, 300, 350, 400, 450, 500,
  600, 700, 800, 900, 1000,
] as const;

export function findNearestTier(rate: number): number {
  if (!Number.isFinite(rate) || rate <= 0) {
    return PRICE_TIERS[0];
  }
  let best = PRICE_TIERS[0];
  let bestDist = Math.abs(rate - best);
  for (const t of PRICE_TIERS) {
    const d = Math.abs(rate - t);
    if (d < bestDist) {
      best = t;
      bestDist = d;
    }
  }
  return best;
}

/** List price shown for in-app purchase (higher than web to account for store commission). */
export function getTierInfo(rate: number): { webPrice: number; iapPrice: number } {
  const webPrice = findNearestTier(rate);
  const iapPrice = Math.max(webPrice + 1, Math.ceil(webPrice * 1.3));
  return { webPrice, iapPrice };
}

/**
 * App Store product id for the tier nearest to `rate`.
 * Must match products configured in App Store Connect.
 */
export function getProductIdForRate(rate: number): string {
  const tier = findNearestTier(rate);
  return `com.appauro.review_request_${tier}`;
}
