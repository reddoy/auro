# Stripe vs Apple In-App Purchases - How They Work Together

## Overview

Your app now supports **two separate payment systems** that work independently:

1. **Stripe** - For web payments (redirects to Stripe Checkout)
2. **Apple In-App Purchases (IAP)** - For iOS app payments (uses StoreKit)

## Key Differences

### Stripe (Web Payments)
- ✅ Used for web checkout
- ✅ Processes credit/debit cards
- ✅ Handles all payment processing
- ✅ You receive funds directly to your Stripe account
- ✅ Standard Stripe fees apply (2.9% + $0.30)
- ❌ **Cannot be used for in-app purchases on iOS** (Apple doesn't allow it)

### Apple In-App Purchases (IAP)
- ✅ Used for iOS app payments
- ✅ Uses Apple's StoreKit framework
- ✅ Processes through Apple's payment system
- ✅ Apple takes 30% commission
- ✅ Funds go to your Apple Developer account
- ✅ Required by Apple for digital content purchases
- ❌ **Only works on iOS devices**
- ❌ **Cannot use Stripe for in-app purchases** (Apple's policy)

## How They Work in Your App

### Web Payment Flow (Stripe)
1. User selects "Continue on the Web"
2. App creates Stripe Checkout session via API
3. User is redirected to Stripe Checkout in browser
4. User completes payment with card
5. Stripe processes payment
6. Webhook notifies your backend
7. Request is created in database
8. User returns to app

### In-App Purchase Flow (Apple IAP)
1. User selects "Continue in App"
2. App uses StoreKit to initiate purchase
3. Apple shows native payment UI
4. User authenticates with Apple ID / Touch ID / Face ID
5. Apple processes payment
6. App receives purchase receipt
7. App sends receipt to your backend for verification
8. Backend verifies receipt with Apple's servers
9. Request is created in database
10. Purchase is completed

## Payment Processing

### Stripe Payments
- **Where funds go**: Your Stripe account
- **Fees**: Stripe's standard fees (2.9% + $0.30 per transaction)
- **Payout**: To your connected bank account (typically 2-7 days)
- **Processing**: Handled entirely by Stripe

### Apple IAP Payments
- **Where funds go**: Your Apple Developer account
- **Fees**: Apple takes 30% commission
- **Payout**: To your bank account via Apple (typically monthly)
- **Processing**: Handled entirely by Apple
- **Verification**: You must verify receipts with Apple's servers

## Why Two Systems?

Apple requires that digital content purchases use their in-app purchase system. However, you can still offer web checkout as an alternative. The dual pricing system allows you to:

1. **Comply with Apple's requirements** - Offer IAP for in-app purchases
2. **Give users choice** - Let them choose web (lower price) or in-app (higher price)
3. **Preserve your margin** - IAP price is 43% higher to account for Apple's 30% cut

## Implementation Details

### Web Payment (Stripe)
- Uses existing `/api/checkout/create-session` endpoint
- Creates Stripe Checkout session
- Redirects user to Stripe's hosted checkout page
- Payment processed by Stripe
- Webhook handles completion

### In-App Purchase (Apple IAP)
- Uses `react-native-iap` library
- Calls StoreKit to initiate purchase
- Receives purchase receipt from Apple
- Sends receipt to `/api/payments/verify-iap` endpoint
- Backend verifies receipt with Apple's servers
- Creates request in database

## Important Notes

1. **You cannot use Stripe for in-app purchases** - Apple's policy requires IAP for digital content
2. **Stripe and IAP are completely separate** - They don't interact with each other
3. **Receipt verification is critical** - Always verify IAP receipts with Apple's servers
4. **Two different payout systems** - Stripe payouts vs Apple payouts
5. **Price differences are intentional** - IAP price is higher to account for Apple's commission

## Revenue Flow

### Stripe Revenue
```
Customer pays $75
→ Stripe takes 2.9% + $0.30 = ~$2.48
→ You receive ~$72.52
→ You take 20% = ~$14.50
→ Reviewer gets 80% = ~$58.02
```

### Apple IAP Revenue
```
Customer pays $108 (IAP price)
→ Apple takes 30% = $32.40
→ You receive $75.60 (after Apple's cut)
→ You take 20% = $15.12
→ Reviewer gets 80% = $60.48
```

Both flows preserve your 20% margin while accounting for platform fees.

## Next Steps

1. ✅ **Web payment flow** - Already implemented and working
2. ✅ **IAP payment flow** - Implemented in mobile app
3. ⏳ **Receipt verification** - Needs to be implemented in `/api/payments/verify-iap`
4. ⏳ **Product setup** - Create products in App Store Connect
5. ⏳ **Testing** - Test both flows in sandbox/test mode

## Summary

- **Stripe** = Web payments only (redirects to browser)
- **Apple IAP** = iOS in-app payments only (native StoreKit)
- **They are separate systems** that don't interact
- **Both are needed** to comply with Apple's requirements and give users choice
- **Dual pricing** accounts for different fee structures
