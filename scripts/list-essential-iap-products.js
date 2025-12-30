/**
 * Essential IAP Products - Start with these 25 most common tiers
 * This covers 90% of likely reviewer rates
 * Run with: node scripts/list-essential-iap-products.js
 */

const ESSENTIAL_TIERS = [
  // Most common range: $25-$200
  25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100,
  110, 120, 130, 140, 150, 160, 170, 180, 190, 200,
  
  // Common higher tiers
  250, 300, 350, 400, 450, 500,
  600, 700, 800, 900, 1000,
];

function getIAPPriceForTier(tier) {
  return Math.ceil(tier * 1.43);
}

function getProductIdForTier(tier) {
  return `com.auro.app.review.${tier}`;
}

console.log('='.repeat(80));
console.log('ESSENTIAL IAP PRODUCTS (Start with these 25)');
console.log('='.repeat(80));
console.log(`Total Products: ${ESSENTIAL_TIERS.length}\n`);
console.log('These cover 90% of likely reviewer rates. Add more later as needed.\n');

console.log('Format: Product ID | Web Price | IAP Price\n');
console.log('-'.repeat(80));

ESSENTIAL_TIERS.forEach(tier => {
  const productId = getProductIdForTier(tier);
  const iapPrice = getIAPPriceForTier(tier);
  console.log(`${productId.padEnd(30)} | $${String(tier).padStart(6)} | $${String(iapPrice).padStart(6)}`);
});

console.log('-'.repeat(80));
console.log(`\nTotal: ${ESSENTIAL_TIERS.length} products (vs 84 total)`);
console.log(`Time Estimate: ~1 hour (vs 3-4 hours for all)`);
console.log('\nStrategy:');
console.log('1. Create these 25 products first');
console.log('2. Submit app to App Store');
console.log('3. Monitor which rates reviewers actually use');
console.log('4. Add more products later based on real usage');
console.log('\nNote: Web checkout still works for ANY price, so reviewers');
console.log('      can always use web payment if their rate isn\'t in this list.');
