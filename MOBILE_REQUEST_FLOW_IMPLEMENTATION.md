# Mobile Request Flow Implementation

## Overview

I've created a complete mobile request flow that mirrors the web flow, with support for both payment methods:
- **Web Checkout** (Stripe) - Redirects to browser
- **In-App Purchase** (Apple IAP) - Native iOS payment

## Files Created

### Main Flow
- `app/request/index.tsx` - Main flow screen that manages all steps

### Step Components
- `app/request/components/IntroStep.tsx` - Welcome/intro screen
- `app/request/components/CreatorSelectionStep.tsx` - Reviewer selection
- `app/request/components/PhotoUploadStep.tsx` - Photo upload (placeholder - needs implementation)
- `app/request/components/PromptAnswersStep.tsx` - Message input
- `app/request/components/ConsentStep.tsx` - Terms & consent
- `app/request/components/PaymentStep.tsx` - **Dual payment options** (web + IAP)
- `app/request/components/SuccessStep.tsx` - Success screen

## How to Access

The flow can be accessed via:
1. **Deep link**: `auro://request?creatorId=xxx&creatorSlug=xxx`
2. **Navigation**: `router.push('/request')`
3. **From reviewer profile**: When user taps "Request Review"

## Payment Flow Details

### Web Payment (Stripe)
1. User selects "Continue on the Web"
2. App creates Stripe Checkout session
3. User is redirected to browser
4. Completes payment in Stripe Checkout
5. Returns to app after payment

### In-App Purchase (Apple IAP)
1. User selects "Continue in App"
2. App initiates StoreKit purchase
3. Apple shows native payment UI
4. User authenticates and confirms
5. App receives receipt
6. App verifies receipt with backend
7. Request is created
8. User sees success screen

## What Still Needs Implementation

### Photo Upload Step
The `PhotoUploadStep.tsx` is currently a placeholder. You need to:
1. Implement image picker integration
2. Upload photos to Supabase storage
3. Create upload session
4. Handle photo previews and management

Reference the web version in `site/app/request/components/PhotoUpload.tsx` for the full implementation.

### Navigation Route
Add the request route to your navigation stack in `app/_layout.tsx`:
```typescript
<Stack.Screen name="request" options={{ headerShown: false }} />
```

### Receipt Verification
The `/api/payments/verify-iap` endpoint needs proper Apple receipt verification. Currently it's a placeholder that trusts the client receipt. You need to:
1. Verify receipt with Apple's servers
2. Check for duplicate transactions
3. Validate product ID matches
4. Only then create the request

## Stripe vs Apple IAP - Important Notes

**They are completely separate systems:**

- **Stripe** = Web payments only (cannot be used in-app on iOS)
- **Apple IAP** = iOS in-app payments only (uses StoreKit, not Stripe)
- **You cannot use Stripe for in-app purchases** - Apple requires IAP for digital content

See `STRIPE_VS_APPLE_IAP_EXPLAINED.md` for complete details.

## Testing

1. **Web Payment**: Test by selecting "Continue on the Web" and completing checkout
2. **IAP Payment**: Test in sandbox mode with test Apple ID
3. **Flow Navigation**: Test all steps forward and backward
4. **State Persistence**: Test that flow state is saved/restored correctly

## Next Steps

1. ✅ Complete photo upload implementation
2. ✅ Add route to navigation
3. ✅ Implement proper receipt verification
4. ✅ Test both payment flows
5. ✅ Add error handling and edge cases
6. ✅ Polish UI/UX
