/**
 * Essential IAP Products - Start with these 25 most common tiers
 * This covers 90% of likely reviewer rates
 * Run with: node scripts/list-essential-iap-products.js
 */

const ESSENTIAL_TIERS = [
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
];

function getIAPPriceForTier(tier) {
  return Math.ceil(tier * 1.43);
}

function getProductIdForTier(tier) {
  return `com.auro.app.review.${tier}`;
}

console.log('='.repeat(80));
console.log('IAP PRODUCTS - More Lower End, Spaced Higher End');
console.log('='.repeat(80));
console.log(`Total Products: ${ESSENTIAL_TIERS.length}\n`);
console.log('More products below $100, spaced out more above $100.\n');

console.log('Format: Product ID | Web Price | IAP Price\n');
console.log('-'.repeat(80));

ESSENTIAL_TIERS.forEach(tier => {
  const productId = getProductIdForTier(tier);
  const iapPrice = getIAPPriceForTier(tier);
  console.log(`${productId.padEnd(30)} | $${String(tier).padStart(6)} | $${String(iapPrice).padStart(6)}`);
});

console.log('-'.repeat(80));
console.log(`\nTotal: ${ESSENTIAL_TIERS.length} products`);
console.log(`Time Estimate: ~1.5 hours`);
console.log('\nDistribution:');
console.log(`- $5-$50: 10 products (lower end - $5 increments)`);
console.log(`- $55-$100: 10 products (most common - $5 increments)`);
console.log(`- $125-$200: 4 products (spaced out - $25 increments)`);
console.log(`- $250-$500: 6 products (higher tiers - $50 increments)`);
console.log(`- $600-$1000: 5 products (highest tiers - $100 increments)`);
console.log('\nNote: Web checkout still works for ANY price, so reviewers');
console.log('      can always use web payment if their rate isn\'t in this list.');
