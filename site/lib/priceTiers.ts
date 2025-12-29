/**
 * Price Tier Constants for Web
 * Shared with mobile app's lib/iapPriceTiers.ts
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
