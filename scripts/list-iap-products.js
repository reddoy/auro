/**
 * Script to list all IAP product IDs that need to be created in App Store Connect
 * Run with: node scripts/list-iap-products.js
 */

const PRICE_TIERS = [
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
];

function getIAPPriceForTier(tier) {
  return Math.ceil(tier * 1.43);
}

function getProductIdForTier(tier) {
  return `com.auro.app.review.${tier}`;
}

console.log('='.repeat(80));
console.log('IAP PRODUCTS TO CREATE IN APP STORE CONNECT');
console.log('='.repeat(80));
console.log(`Total Products: ${PRICE_TIERS.length}\n`);

console.log('Format: Product ID | Web Price | IAP Price\n');
console.log('-'.repeat(80));

PRICE_TIERS.forEach(tier => {
  const productId = getProductIdForTier(tier);
  const iapPrice = getIAPPriceForTier(tier);
  console.log(`${productId.padEnd(30)} | $${String(tier).padStart(6)} | $${String(iapPrice).padStart(6)}`);
});

console.log('-'.repeat(80));
console.log(`\nTotal: ${PRICE_TIERS.length} products`);
console.log('\nInstructions:');
console.log('1. Go to App Store Connect → Your App → In-App Purchases');
console.log('2. For each product above:');
console.log('   - Click "+" to create new product');
console.log('   - Type: Non-Consumable (or Consumable)');
console.log('   - Product ID: (copy from list above)');
console.log('   - Price: (IAP Price from list above)');
console.log('   - Reference Name: "Review Request - $X" (use Web Price)');
console.log('\nNote: This will take 2-3 hours. You can create them in batches.');
