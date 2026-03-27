/**
 * Price Tier Constants for Web
 * Shared with mobile app's lib/iapPriceTiers.ts
 */

// Define supported web checkout price tiers
// Each tier represents the WEB price (before IAP markup)
// 
// More products on lower end, spaced out more as prices increase above $100
// Total: 35 products - optimized for common reviewer rates
export const PRICE_TIERS = [
  // $5-$50: Lower end with $5 increments (10 products)
  5, 10, 15, 20, 25, 30, 35, 40, 45, 50,
  // $55-$100: Most common range with $5 increments (10 products)
  55, 60, 65, 70, 75, 80, 85, 90, 95, 100,
  // $125-$200: Spaced out with $25 increments (4 products)
  125, 150, 175, 200,
  // $250-$500: Higher tiers with $50 increments (6 products)
  250, 300, 350, 400, 450, 500,
  // $600-$1000: Highest tiers with $100 increments (5 products)
  600, 700, 800, 900, 1000,
] as const;
