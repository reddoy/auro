# In-App Purchase Implementation Summary

## Overview
This document summarizes the implementation of in-app purchases (IAP) to comply with Apple App Store requirements. The app now supports dual pricing: web checkout (lower price) and in-app purchase (higher price to account for Apple's 30% cut while preserving Auro's 20% margin).

## What Was Implemented

### 1. Web Payment Step Updates (`site/app/request/components/PaymentStep.tsx`)
- ✅ Added dual pricing options: "Continue on the Web" and "Continue in App"
- ✅ Added price explanation dialog explaining why prices differ
- ✅ In-app purchase price calculation (43% higher than web price to account for Apple's 30% cut)
- ✅ UI for selecting payment method

### 2. In-App Purchase Library (`lib/inAppPurchases.ts`)
- ✅ Installed `react-native-iap` package
- ✅ Created IAP utility functions:
  - `initIAP()` - Initialize StoreKit connection
  - `purchaseReviewRequest()` - Handle purchase flow
  - `calculateIAPPrice()` - Calculate IAP price from web price
  - `getProducts()` - Fetch product information
  - `endConnection()` - Clean up connection

### 3. API Endpoint (`site/app/api/payments/verify-iap/route.ts`)
- ✅ Created endpoint to verify and process in-app purchases
- ✅ Creates request in database with IAP payment method
- ⚠️ **TODO**: Implement proper Apple receipt verification (currently placeholder)

### 4. Styling (`site/styles.css`)
- ✅ Added CSS for payment option cards
- ✅ Added modal styles for price explanation dialog
- ✅ Responsive design for mobile devices

## Pricing Calculation

The in-app purchase price is calculated to preserve Auro's 20% margin after Apple takes their 30%:

- **Web Price**: $X
  - Auro gets: $X × 20% = $0.2X
  - Reviewer gets: $X × 80% = $0.8X

- **IAP Price**: $Y = $X × 1.43 (rounded up)
  - Apple takes: $Y × 30% = $0.3Y
  - We receive: $Y × 70% = $0.7Y
  - Auro gets: $0.7Y × 20% = $0.14Y
  - Reviewer gets: $0.7Y × 80% = $0.56Y

To preserve the same absolute margin: $0.14Y = $0.2X
Therefore: Y = $0.2X / 0.14 = 1.4286X ≈ **1.43X**

## What Still Needs to Be Done

### 1. Set Up Products in App Store Connect
1. Go to App Store Connect → Your App → Features → In-App Purchases
2. Create consumable products for each reviewer's price tier
3. Product IDs should follow a pattern like: `com.auro.app.review.{creatorId}` or `com.auro.app.review.{price}`
4. Set prices for each product
5. Submit for review

### 2. Implement Receipt Verification
The current API endpoint (`site/app/api/payments/verify-iap/route.ts`) has a placeholder for receipt verification. You need to:

1. Install a library for Apple receipt verification (e.g., `app-store-server-api` or make direct HTTP requests)
2. Verify receipts with Apple's servers:
   - Production: `https://buy.itunes.apple.com/verifyReceipt`
   - Sandbox: `https://sandbox.itunes.apple.com/verifyReceipt`
3. Check receipt status (0 = valid)
4. Verify product ID matches
5. Implement idempotency to prevent duplicate transactions
6. Only create the request after successful verification

### 3. Integrate IAP into Mobile App Flow
You'll need to add the IAP purchase flow to your mobile app. Example usage:

```typescript
import { initIAP, purchaseReviewRequest, calculateIAPPrice } from '@/lib/inAppPurchases';

// Initialize on app start
useEffect(() => {
  initIAP();
  return () => {
    endConnection();
  };
}, []);

// When user wants to purchase
const handlePurchase = async () => {
  const webPrice = 75; // Get from reviewer's hourly_rate
  const iapPrice = calculateIAPPrice(webPrice);
  const productId = `com.auro.app.review.${creatorId}`; // Match App Store Connect
  
  const result = await purchaseReviewRequest({
    productId,
    creatorId,
    creatorSlug,
    uploadSessionId,
    reviewPayload: {
      message,
      photos,
      consent,
    },
  });
  
  if (result.success) {
    // Navigate to success screen
    router.push(`/review/${result.requestId}`);
  } else {
    // Show error
    Alert.alert('Purchase Failed', result.error);
  }
};
```

### 4. Update Database Schema (if needed)
The API endpoint expects these fields in the `requests` table:
- `payment_method` (should accept 'iap')
- `iap_transaction_id`
- `iap_product_id`
- `iap_receipt`

If these columns don't exist, create a migration to add them.

### 5. Testing
1. Test in sandbox environment with test accounts
2. Test receipt verification
3. Test duplicate transaction prevention
4. Test error handling (network failures, cancelled purchases, etc.)
5. Test on real devices (IAP doesn't work in simulator)

## Price Explanation Dialog

The dialog shows:
> "Why are these prices different? The fee for in-app purchases does not apply to purchases made directly through Auro. This is why the price is lower when you continue on the web."

This matches the competitor's implementation and complies with Apple's guidelines.

## Notes

- In-app purchases are iOS-only (Android support can be added later with Google Play Billing)
- The web version will show both options, but in-app purchase selection will redirect to the mobile app
- Receipt verification is critical for security - never trust client-side receipts without server verification
- Consider implementing receipt validation caching to avoid duplicate verifications

## Next Steps

1. Set up products in App Store Connect
2. Implement proper receipt verification
3. Integrate IAP flow into mobile app
4. Test thoroughly in sandbox
5. Submit updated app to App Store
