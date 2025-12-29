# IAP Product Setup Guide for App Store Connect

## Overview

Since reviewers can set their own rates (dynamic pricing), but Apple requires pre-configured products with fixed prices, we use a **price tier system**.

## How It Works

1. **Price Tiers**: We define standard price tiers (e.g., $50, $75, $100, etc.)
2. **Rate Rounding**: When a reviewer sets their rate, it's rounded to the nearest tier
3. **Product IDs**: Each tier has a corresponding product ID in App Store Connect
4. **IAP Pricing**: The IAP price is automatically calculated (43% higher) to account for Apple's 30% cut

## Product IDs Format

All product IDs follow this pattern:
```
com.auro.app.review.{tier}
```

Where `{tier}` is the **web price** (before IAP markup).

### Example Product IDs

- `com.auro.app.review.50` - For $50 tier (IAP price: $72)
- `com.auro.app.review.75` - For $75 tier (IAP price: $108)
- `com.auro.app.review.100` - For $100 tier (IAP price: $143)

## Price Tiers

The following tiers are defined in `lib/iapPriceTiers.ts` (ranging from $5 to $10,000):

**$5-$50** (in $5 increments):
- 5, 10, 15, 20, 25, 30, 35, 40, 45, 50

**$50-$100** (in $5 increments):
- 55, 60, 65, 70, 75, 80, 85, 90, 95, 100

**$100-$200** (in $10 increments):
- 110, 120, 130, 140, 150, 160, 170, 180, 190, 200

**$200-$500** (in $25 increments):
- 225, 250, 275, 300, 325, 350, 375, 400, 425, 450, 475, 500

**$500-$1000** (in $50 increments):
- 550, 600, 650, 700, 750, 800, 850, 900, 950, 1000

**$1000-$2000** (in $100 increments):
- 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000

**$2000-$5000** (in $250 increments):
- 2250, 2500, 2750, 3000, 3250, 3500, 3750, 4000, 4250, 4500, 4750, 5000

**$5000-$10000** (in $500 increments):
- 5500, 6000, 6500, 7000, 7500, 8000, 8500, 9000, 9500, 10000

## Setting Up Products in App Store Connect

### Step 1: Create Products

1. Go to **App Store Connect** → Your App → **Features** → **In-App Purchases**
2. Click **+** to create a new in-app purchase
3. Select **Consumable** (reviews can be purchased multiple times)
4. For each tier, create a product with:

   **Product ID**: `com.auro.app.review.{tier}`
   
   **Reference Name**: `Review Request - $${tier}`
   
   **Price**: Set to the **IAP price** (not the web price)
   - IAP Price = Web Price × 1.43 (rounded up)
   - Example: $75 tier → IAP price = $108

### Step 2: Calculate IAP Prices

Use this formula for each tier:
```
IAP Price = ceil(Web Price × 1.43)
```

**Quick Reference Table** (first 25 tiers):

| Web Price | IAP Price | Product ID |
|-----------|-----------|------------|
| $5 | $8 | com.auro.app.review.5 |
| $10 | $15 | com.auro.app.review.10 |
| $15 | $22 | com.auro.app.review.15 |
| $20 | $29 | com.auro.app.review.20 |
| $25 | $36 | com.auro.app.review.25 |
| $30 | $43 | com.auro.app.review.30 |
| $35 | $51 | com.auro.app.review.35 |
| $40 | $58 | com.auro.app.review.40 |
| $45 | $65 | com.auro.app.review.45 |
| $50 | $72 | com.auro.app.review.50 |
| $55 | $79 | com.auro.app.review.55 |
| $60 | $86 | com.auro.app.review.60 |
| $65 | $93 | com.auro.app.review.65 |
| $70 | $101 | com.auro.app.review.70 |
| $75 | $108 | com.auro.app.review.75 |
| $80 | $115 | com.auro.app.review.80 |
| $85 | $122 | com.auro.app.review.85 |
| $90 | $129 | com.auro.app.review.90 |
| $95 | $136 | com.auro.app.review.95 |
| $100 | $143 | com.auro.app.review.100 |
| $110 | $158 | com.auro.app.review.110 |
| $120 | $172 | com.auro.app.review.120 |
| $130 | $186 | com.auro.app.review.130 |
| $140 | $201 | com.auro.app.review.140 |
| $150 | $215 | com.auro.app.review.150 |

### Step 3: Product Details

For each product, fill in:

- **Display Name**: `Review Request - $${tier}`
- **Description**: `Purchase a personalized review request from an Auro reviewer. Price: $${tier} (web) / $${iapPrice} (in-app).`
- **Review Information**: 
  - Screenshot (optional)
  - Review Notes: "This is a consumable in-app purchase for review requests. Each purchase allows a user to request one review from a reviewer."

### Step 4: Submit for Review

1. Submit all products for review
2. Apple typically reviews IAP products within 24-48 hours
3. Products must be approved before they can be used in production

## How Rate Rounding Works

When a reviewer sets their rate:

1. **Example 1**: Reviewer sets rate to **$73**
   - Nearest tier: **$75**
   - Product ID: `com.auro.app.review.75`
   - Web price shown: **$75** (with note: "rounded from $73")
   - IAP price: **$108**

2. **Example 2**: Reviewer sets rate to **$47**
   - Nearest tier: **$45** or **$50** (whichever is closer)
   - If $47 → $45 is closer, product ID: `com.auro.app.review.45`
   - Web price shown: **$45** (with note: "rounded from $47")
   - IAP price: **$65**

3. **Example 3**: Reviewer sets rate to **$125**
   - Nearest tier: **$130** (closer than $120)
   - Product ID: `com.auro.app.review.130`
   - Web price shown: **$130** (with note: "rounded from $125")
   - IAP price: **$186**

## Important Notes

1. **Start with Common Tiers**: You don't need to create all tiers immediately. Start with the most common ones (e.g., $50, $75, $100, $150) and add more as needed.

2. **Tier Expansion**: If reviewers frequently use rates between tiers, you can add more tiers to the `PRICE_TIERS` array in `lib/iapPriceTiers.ts`.

3. **Price Changes**: If a reviewer changes their rate, the system automatically uses the new tier's product ID.

4. **Testing**: Test with sandbox accounts using the tier products before going live.

5. **Minimum/Maximum**: The system supports rates from $5 to $10,000. Rates outside this range will be rounded to the nearest boundary tier.

## Automation Script

You can generate a list of all product IDs and IAP prices by running:

```typescript
import { getAllProductIds, getIAPPriceForTier, PRICE_TIERS } from './lib/iapPriceTiers';

PRICE_TIERS.forEach(tier => {
  const productId = `com.auro.app.review.${tier}`;
  const iapPrice = getIAPPriceForTier(tier);
  console.log(`${productId} - Web: $${tier}, IAP: $${iapPrice}`);
});
```

## Next Steps

1. ✅ Create products in App Store Connect for common tiers ($50, $75, $100, $150, $200)
2. ✅ Submit products for Apple review
3. ✅ Test with sandbox accounts
4. ✅ Add more tiers as needed based on reviewer usage patterns
5. ✅ Monitor and adjust tier distribution if needed
