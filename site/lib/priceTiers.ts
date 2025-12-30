/**
 * Price Tier Constants for Web
 * Shared with mobile app's lib/iapPriceTiers.ts
 */

// Define price tiers - these should match products in App Store Connect
// Each tier represents the WEB price (before IAP markup)
// 
// ESSENTIAL TIERS (37 products) - covers 90% of likely reviewer rates
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
