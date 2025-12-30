/**
 * IAP Price Tier System
 * 
 * Since Apple requires pre-configured products with fixed prices, but reviewers
 * can set their own rates, we use a tier system:
 * 
 * 1. Define standard price tiers (e.g., $50, $75, $100, etc.)
 * 2. Round reviewer rates to the nearest tier
 * 3. Use tier-based product IDs (e.g., com.auro.app.review.50, com.auro.app.review.75)
 * 
 * Product IDs in App Store Connect should follow: com.auro.app.review.{tier}
 * where {tier} is the web price (before IAP markup)
 */

// Define price tiers - these should match products in App Store Connect
// Each tier represents the WEB price (before IAP markup)
// 
// START WITH ESSENTIAL TIERS (37 products) - covers 90% of likely reviewer rates
// You can add more tiers later as needed. Web checkout works for any price.
export const PRICE_TIERS = [
  // $25-$200: Most common range for reviewers
  25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100,
  110, 120, 130, 140, 150, 160, 170, 180, 190, 200,
  // $250-$500: Common higher tiers
  250, 300, 350, 400, 450, 500,
  // $600-$1000: Higher tiers
  600, 700, 800, 900, 1000,
] as const;

// Minimum and maximum supported prices
export const MIN_PRICE = Math.min(...PRICE_TIERS);
export const MAX_PRICE = Math.max(...PRICE_TIERS);

/**
 * Find the nearest price tier for a given rate
 * @param rate - Reviewer's hourly rate (web price)
 * @returns The nearest tier price
 */
export function findNearestTier(rate: number): number {
  if (rate <= MIN_PRICE) return MIN_PRICE;
  if (rate >= MAX_PRICE) return MAX_PRICE;
  
  // Find the tier that's closest to the rate
  let nearestTier = PRICE_TIERS[0];
  let minDiff = Math.abs(rate - nearestTier);
  
  for (const tier of PRICE_TIERS) {
    const diff = Math.abs(rate - tier);
    if (diff < minDiff) {
      minDiff = diff;
      nearestTier = tier;
    }
  }
  
  return nearestTier;
}

/**
 * Generate product ID for a given tier
 * @param tier - The price tier (web price)
 * @returns Product ID for App Store Connect (e.g., "com.auro.app.review.75")
 */
export function getProductIdForTier(tier: number): string {
  return `com.auro.app.review.${tier}`;
}

/**
 * Get product ID for a reviewer's rate
 * This rounds the rate to the nearest tier and generates the product ID
 * @param rate - Reviewer's hourly rate (web price)
 * @returns Product ID for App Store Connect
 */
export function getProductIdForRate(rate: number): string {
  const tier = findNearestTier(rate);
  return getProductIdForTier(tier);
}

/**
 * Get the IAP price for a tier (accounting for Apple's 30% cut)
 * @param tier - The price tier (web price)
 * @returns IAP price (rounded up)
 */
export function getIAPPriceForTier(tier: number): number {
  // IAP price = web price * 1.43 (to account for Apple's 30% cut while preserving 20% margin)
  return Math.ceil(tier * 1.43);
}

/**
 * Get all product IDs that need to be configured in App Store Connect
 * @returns Array of product IDs
 */
export function getAllProductIds(): string[] {
  return PRICE_TIERS.map(tier => getProductIdForTier(tier));
}

/**
 * Get tier information for a given rate
 * @param rate - Reviewer's hourly rate (web price)
 * @returns Object with tier info including web price, IAP price, and product ID
 */
export function getTierInfo(rate: number): {
  webPrice: number;
  iapPrice: number;
  productId: string;
  tier: number;
} {
  const tier = findNearestTier(rate);
  return {
    webPrice: tier,
    iapPrice: getIAPPriceForTier(tier),
    productId: getProductIdForTier(tier),
    tier,
  };
}
