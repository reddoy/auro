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
// Tiers range from $5 to $10,000
export const PRICE_TIERS = [
  // $5-$50: $5 increments
  5, 10, 15, 20, 25, 30, 35, 40, 45, 50,
  // $50-$100: $5 increments
  55, 60, 65, 70, 75, 80, 85, 90, 95, 100,
  // $100-$200: $10 increments
  110, 120, 130, 140, 150, 160, 170, 180, 190, 200,
  // $200-$500: $25 increments
  225, 250, 275, 300, 325, 350, 375, 400, 425, 450, 475, 500,
  // $500-$1000: $50 increments
  550, 600, 650, 700, 750, 800, 850, 900, 950, 1000,
  // $1000-$2000: $100 increments
  1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000,
  // $2000-$5000: $250 increments
  2250, 2500, 2750, 3000, 3250, 3500, 3750, 4000, 4250, 4500, 4750, 5000,
  // $5000-$10000: $500 increments
  5500, 6000, 6500, 7000, 7500, 8000, 8500, 9000, 9500, 10000,
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
