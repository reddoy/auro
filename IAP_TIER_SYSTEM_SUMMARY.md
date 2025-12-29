# IAP Tier System - Solution Summary

## The Problem

- **Reviewers set their own rates** (dynamic pricing: $25, $47, $73, $125, etc.)
- **Apple requires pre-configured products** with fixed prices in App Store Connect
- **How do we handle dynamic rates with fixed IAP products?**

## The Solution: Price Tier System

We use a **tier-based system** that rounds reviewer rates to the nearest standard tier.

### How It Works

1. **Define Price Tiers**: Standard price points (e.g., $50, $75, $100, $150, etc.)
2. **Round Rates**: When a reviewer sets their rate, it's rounded to the nearest tier
3. **Product IDs**: Each tier has a corresponding product ID: `com.auro.app.review.{tier}`
4. **IAP Pricing**: IAP price is automatically calculated (43% higher) to account for Apple's 30% cut

### Example Flow

**Scenario**: Reviewer sets their rate to **$73**

1. System finds nearest tier: **$75**
2. Product ID used: `com.auro.app.review.75`
3. Web price shown: **$75** (with note: "rounded from $73")
4. IAP price: **$108** (calculated as $75 × 1.43)

## Implementation

### Files Created/Updated

1. **`lib/iapPriceTiers.ts`** - Tier system utilities
   - `findNearestTier(rate)` - Finds closest tier for a rate
   - `getProductIdForRate(rate)` - Generates product ID from rate
   - `getTierInfo(rate)` - Returns complete tier information

2. **`lib/inAppPurchases.ts`** - Updated to use tier system
   - Now accepts `reviewerRate` parameter
   - Automatically calculates product ID from rate

3. **`site/app/request/components/PaymentStep.tsx`** - Updated UI
   - Shows tier price (may differ from reviewer's exact rate)
   - Displays note if price was rounded

4. **`site/app/api/payments/verify-iap/route.ts`** - Updated API
   - Extracts tier from product ID
   - Uses tier price for request creation

5. **`IAP_PRODUCT_SETUP_GUIDE.md`** - Setup instructions
   - Complete guide for creating products in App Store Connect
   - Price tier reference table

## Price Tiers

The system includes **49 price tiers** from $25 to $5000:

- **$25-$100**: $5 increments (16 tiers)
- **$100-$200**: $10 increments (10 tiers)
- **$200-$300**: $25 increments (4 tiers)
- **$300-$500**: $50 increments (4 tiers)
- **$500-$1000**: $100 increments (5 tiers)
- **$1000-$2000**: $250 increments (4 tiers)
- **$2000-$5000**: $500 increments (6 tiers)

## Product ID Format

All product IDs follow this pattern:
```
com.auro.app.review.{tier}
```

Where `{tier}` is the **web price** (before IAP markup).

**Examples**:
- `com.auro.app.review.50` - $50 tier (IAP: $72)
- `com.auro.app.review.75` - $75 tier (IAP: $108)
- `com.auro.app.review.100` - $100 tier (IAP: $143)

## Setting Up Products

### Quick Start

1. **Start with common tiers**: Create products for $50, $75, $100, $150, $200
2. **Calculate IAP prices**: IAP Price = Web Price × 1.43 (rounded up)
3. **Create products in App Store Connect**:
   - Product ID: `com.auro.app.review.{tier}`
   - Price: Set to IAP price (not web price)
   - Type: Consumable
4. **Submit for review**
5. **Add more tiers** as needed based on reviewer usage

### Example Setup

For the **$75 tier**:
- **Product ID**: `com.auro.app.review.75`
- **Reference Name**: `Review Request - $75`
- **Price**: $108 (IAP price)
- **Type**: Consumable
- **Description**: "Purchase a personalized review request. Web price: $75, In-app price: $108."

## Benefits

✅ **Works with Apple's requirements** - Fixed products, pre-configured prices  
✅ **Supports dynamic rates** - Reviewers can still set any rate  
✅ **Automatic rounding** - System handles tier selection  
✅ **Scalable** - Easy to add more tiers as needed  
✅ **Transparent** - Users see when price is rounded  

## Next Steps

1. ✅ Review the tier system implementation
2. ⏳ Create products in App Store Connect (start with common tiers)
3. ⏳ Submit products for Apple review
4. ⏳ Test with sandbox accounts
5. ⏳ Monitor tier usage and add more tiers if needed

## Notes

- **Start small**: You don't need all 49 tiers immediately. Start with the most common ones.
- **Monitor usage**: Track which tiers are used most and add more granular tiers in those ranges if needed.
- **Price rounding**: The system shows users when a price has been rounded (e.g., "rounded from $73").
- **Tier expansion**: Easy to add more tiers by updating the `PRICE_TIERS` array.
