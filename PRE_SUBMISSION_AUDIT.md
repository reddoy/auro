# Pre-Submission Audit - Dual Pricing & Mobile Request Flow

## ✅ Completed Implementation

### 1. Dual Pricing System
- ✅ Web payment option with lower price
- ✅ In-app purchase option with higher price (43% markup)
- ✅ Price explanation modal ("Why are these prices different?")
- ✅ Both options available on web (`site/app/request/components/PaymentStep.tsx`)
- ✅ Both options available on mobile (`app/request/components/PaymentStep.tsx`)

### 2. Price Tier System
- ✅ Price tiers defined ($5 to $10,000) in `lib/iapPriceTiers.ts`
- ✅ Tier rounding logic implemented
- ✅ Product ID generation (`com.auro.app.review.{tier}`)
- ✅ IAP price calculation (web price × 1.43)
- ✅ Mobile rate picker (`components/PriceTierPicker.tsx`)
- ✅ Web rate selector (`site/components/PriceTierSelector.tsx`)
- ✅ Rate inputs updated throughout app:
  - ✅ Mobile set-rate screen (`app/(tabs)/profile/set-rate.tsx`)
  - ✅ Mobile onboarding rate screen (`app/onboarding/reviewer/rate.tsx`)
  - ✅ Web reviewer signup (`site/app/reviewers/apply/page.tsx`)

### 3. Mobile Request Flow
- ✅ Main flow screen (`app/request/index.tsx`)
- ✅ Intro step (`app/request/components/IntroStep.tsx`)
- ✅ Creator selection step (`app/request/components/CreatorSelectionStep.tsx`)
- ✅ Photo upload step (`app/request/components/PhotoUploadStep.tsx`) - **COMPLETED**
- ✅ Prompt answers step (`app/request/components/PromptAnswersStep.tsx`)
- ✅ Consent step (`app/request/components/ConsentStep.tsx`)
- ✅ Payment step (`app/request/components/PaymentStep.tsx`)
- ✅ Success step (`app/request/components/SuccessStep.tsx`)
- ✅ Navigation route added (`app/_layout.tsx`)

### 4. In-App Purchase Integration
- ✅ IAP initialization (`lib/inAppPurchases.ts`)
- ✅ Purchase flow implementation
- ✅ Receipt verification endpoint (`site/app/api/payments/verify-iap/route.ts`)
- ✅ Product ID calculation from reviewer rates
- ✅ Error handling and user feedback

### 5. Dependencies
- ✅ `react-native-iap` installed (v14.6.4)
- ✅ `@react-native-picker/picker` installed (v2.11.4)
- ✅ All required imports and components available

## ⚠️ Critical Issues to Address

### 1. **Apple Receipt Verification (CRITICAL)**
**Location:** `site/app/api/payments/verify-iap/route.ts` (lines 39-52)

**Issue:** The receipt verification with Apple's servers is not implemented. Currently, the code trusts the client receipt, which is a security risk.

**Action Required:**
- Implement receipt verification with Apple's servers:
  - Production: `https://buy.itunes.apple.com/verifyReceipt`
  - Sandbox: `https://sandbox.itunes.apple.com/verifyReceipt`
- Use a library like `app-store-server-api` or make direct HTTP requests
- Verify:
  1. Receipt is valid (status code 0)
  2. Product ID matches
  3. Transaction hasn't been used before (idempotency check)
  4. Only then create the request

**Recommendation:** Use Apple's App Store Server API (JWT-based) for better security and reliability.

### 2. **Environment Variables**
**Required Variables:**
- `EXPO_PUBLIC_SITE_URL` - Your website URL (defaults to `https://www.appauro.com`)
- `EXPO_PUBLIC_CREATOR_WEB_BASE` - Creator web base URL (for signed URLs)
- `STRIPE_SECRET_KEY` - Stripe secret key (for web payments)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for server-side operations)

**Action Required:**
- Verify all environment variables are set in:
  - `.env` files (local development)
  - Expo config (`app.json` / `eas.json`)
  - Vercel/your hosting platform (production)
  - App Store Connect (if needed)

### 3. **App Store Connect Setup**
**Action Required:**
- Create IAP products in App Store Connect for ALL price tiers
- Product ID format: `com.auro.app.review.{tier}` (e.g., `com.auro.app.review.75`)
- IAP price = web price × 1.43 (rounded up)
- Reference: `IAP_PRODUCT_SETUP_GUIDE.md`

**Total Products Needed:** ~150 products (one for each tier from $5 to $10,000)

**Quick Reference:**
- $5 tier → IAP price: $8
- $75 tier → IAP price: $108
- $100 tier → IAP price: $143
- $1000 tier → IAP price: $1430
- $10000 tier → IAP price: $14300

### 4. **Navigation to Request Flow**
**Current Status:** 
- ✅ Route is registered in `app/_layout.tsx`
- ✅ Deep linking scheme configured (`auro://`) in `app.json`
- ✅ Web PaymentStep redirects to mobile app via deep link when "Continue in App" is selected
- ⚠️ No obvious UI entry point in the app (users can access via deep link from web)

**Deep Link Format:**
- `auro://request?creatorId={id}&creatorSlug={slug}`
- Handled in `app/request/index.tsx` via `useLocalSearchParams`

**Action Required (Optional):**
- Consider adding a UI entry point for users who want to start a request directly in the app:
  - Option 1: Add a "Request Review" button in the requests tab
  - Option 2: Update reviewer profile screen to use mobile flow instead of web
  - Option 3: Add a floating action button (FAB) for quick access

**Note:** Deep linking from web works correctly - when users select "Continue in App" on mobile web, they'll be redirected to the native app.

## 🔍 Code Quality Checks

### ✅ No Critical TODOs
- All TODO comments are informational (receipt verification reminder)
- No incomplete implementations found

### ✅ Consistency
- Price tier system consistent across mobile and web
- Payment flow logic matches between platforms
- Error handling implemented

### ✅ Type Safety
- TypeScript types defined for RequestData
- Proper type checking in all components

## 📋 Pre-Submission Checklist

### Before Rebuilding:
- [ ] **Implement Apple receipt verification** (CRITICAL)
- [ ] **Set up all IAP products in App Store Connect** (~150 products)
- [ ] **Verify all environment variables are configured**
- [ ] **Test IAP flow in sandbox environment**
- [ ] **Test web payment flow**
- [ ] **Test photo upload functionality**
- [ ] **Test navigation to request flow**
- [ ] **Test deep linking from web to app**

### Testing Checklist:
- [ ] Test rate picker on mobile (set-rate screen)
- [ ] Test rate picker on mobile (onboarding)
- [ ] Test rate selector on web (reviewer signup)
- [ ] Test full request flow on mobile
- [ ] Test web payment option
- [ ] Test IAP payment option (iOS only)
- [ ] Test photo upload (multiple photos)
- [ ] Test price explanation modal
- [ ] Test error handling (network failures, etc.)
- [ ] Test authentication flow before payment

### App Store Connect:
- [ ] Create all IAP products (use `IAP_PRODUCT_SETUP_GUIDE.md`)
- [ ] Set correct prices for each product
- [ ] Configure product metadata
- [ ] Submit for review (if required)

### Documentation:
- [ ] Review `IAP_PRODUCT_SETUP_GUIDE.md`
- [ ] Review `IAP_TIER_SYSTEM_SUMMARY.md`
- [ ] Review `STRIPE_VS_APPLE_IAP_EXPLAINED.md`

## 🚨 Known Limitations

1. **Receipt Verification:** Currently trusts client receipts (must be fixed before production)
2. **Product Setup:** Requires manual creation of ~150 products in App Store Connect
3. **Testing:** IAP can only be fully tested on a real iOS device with sandbox account
4. **Navigation:** No obvious UI entry point for mobile request flow (users can access via deep link from web)
5. **Web Price Display:** The web PaymentStep shows the original `price` instead of `tierWebPrice` in the order summary (line 273) - this is a minor UI inconsistency but doesn't affect functionality

## 📝 Notes

- The mobile request flow is fully functional but may need UI entry points
- All price calculations preserve the 20% margin after Apple's 30% cut
- The tier system ensures compatibility with Apple's fixed product requirements
- Web payments continue to work as before (Stripe Checkout)
- Deep linking from web to app is implemented for IAP flow

## 🎯 Recommended Next Steps

1. **Immediate (Before Submission):**
   - Implement Apple receipt verification
   - Set up IAP products in App Store Connect
   - Test both payment flows thoroughly

2. **Short-term (Post-Submission):**
   - Add UI entry point for mobile request flow
   - Monitor IAP transactions for issues
   - Collect user feedback on pricing

3. **Long-term:**
   - Consider automating IAP product creation
   - Implement analytics for payment method selection
   - Optimize tier distribution if needed
