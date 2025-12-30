# Complete Flow Breakdown - Dual Pricing & Mobile Request Flow

## 🎯 What We Built

### 1. Dual Pricing System
- **Web Payment**: Lower price (direct Stripe checkout)
- **In-App Purchase**: Higher price (43% markup to account for Apple's 30% cut)
- **Price Explanation**: Modal explaining why prices differ
- **Price Tier System**: Fixed tiers ($5-$10,000) to work with Apple's IAP requirements

### 2. Mobile Request Flow
- Complete multi-step wizard in the mobile app
- All steps: Intro → Creator Selection → Photo Upload → Prompts → Consent → Payment → Success
- Supports both web checkout and in-app purchase

### 3. Receipt Verification
- Secure server-side verification with Apple
- Idempotency checks (prevents duplicate transactions)
- Product ID validation

---

## 📱 Complete User Flow

### Scenario 1: User on Web

```
1. User visits: https://www.appauro.com/request?creatorSlug=john
   ↓
2. Goes through web flow:
   - Selects reviewer (if not preselected)
   - Uploads photos
   - Answers prompts
   - Gives consent
   ↓
3. Payment Step:
   - Sees two options:
     * "Continue on Web - $75" (lower price)
     * "Continue in App - $108" (higher price)
   ↓
4. If selects "Continue on Web":
   - Redirects to Stripe Checkout
   - Pays $75
   - Returns to success page
   ↓
5. If selects "Continue in App" (on mobile browser):
   - Tries to open app via deep link: auro://request?creatorSlug=john
   - If app opens → continues in mobile flow
   - If app doesn't open → shows error message
```

### Scenario 2: User in Mobile App

```
1. User opens app and navigates to request flow
   - Via deep link from web, OR
   - Via UI button (if you add one)
   ↓
2. Goes through mobile flow:
   - Intro screen
   - Selects reviewer (from list of approved reviewers)
   - Uploads photos (up to 10)
   - Answers prompts/message
   - Gives consent
   ↓
3. Payment Step:
   - Sees reviewer info and price
   - Sees two options:
     * "Continue on Web - $75" (opens browser)
     * "Continue in App - $108" (iOS only)
   ↓
4. If selects "Continue on Web":
   - Opens browser with Stripe Checkout
   - User completes payment there
   - Returns to app (or stays in browser)
   ↓
5. If selects "Continue in App" (iOS):
   - Shows Apple payment sheet
   - User authenticates with Face ID/Touch ID
   - Apple processes payment
   ↓
6. After IAP purchase:
   - App gets receipt from Apple
   - App sends receipt to YOUR server: /api/payments/verify-iap
   ↓
7. Server verification:
   - Checks: Has this transaction been used? (No)
   - Sends receipt to Apple: "Is this real?"
   - Apple responds: "Yes, status 0"
   - Server verifies: Product ID matches? ✓
   - Creates review request in database
   ↓
8. App receives success response
   - Shows success screen
   - User can view their request
```

---

## 🔄 Technical Flow: In-App Purchase

### Step-by-Step IAP Flow

```
┌─────────────────┐
│  Mobile App     │
│  (iOS)          │
└────────┬────────┘
         │
         │ 1. User taps "Continue in App"
         │
         ▼
┌─────────────────┐
│  react-native-iap│
│  requestPurchase │
└────────┬────────┘
         │
         │ 2. Shows Apple payment sheet
         │
         ▼
┌─────────────────┐
│  Apple StoreKit │
│  Processes IAP  │
└────────┬────────┘
         │
         │ 3. Returns receipt + transaction ID
         │
         ▼
┌─────────────────┐
│  Mobile App     │
│  Gets receipt   │
└────────┬────────┘
         │
         │ 4. POST /api/payments/verify-iap
         │    Body: {
         │      receipt: "...",
         │      productId: "com.auro.app.review.75",
         │      transactionId: "1000000123456789",
         │      creatorId: "...",
         │      reviewPayload: {...}
         │    }
         │
         ▼
┌─────────────────┐
│  Your Server    │
│  (Vercel)       │
└────────┬────────┘
         │
         │ 5. Check idempotency
         │    SELECT * FROM requests 
         │    WHERE iap_transaction_id = ?
         │
         ▼
┌─────────────────┐
│  Supabase DB    │
│  Check existing │
└────────┬────────┘
         │
         │ 6. If exists → return existing request
         │    If not → continue
         │
         ▼
┌─────────────────┐
│  Your Server    │
│  Verify receipt │
└────────┬────────┘
         │
         │ 7. POST https://buy.itunes.apple.com/verifyReceipt
         │    Body: {
         │      'receipt-data': receipt,
         │      password: APP_STORE_SHARED_SECRET
         │    }
         │
         ▼
┌─────────────────┐
│  Apple Servers  │
│  Verify receipt │
└────────┬────────┘
         │
         │ 8. Response: { status: 0, receipt: {...} }
         │    Status 0 = Valid ✓
         │
         ▼
┌─────────────────┐
│  Your Server    │
│  Validate data   │
└────────┬────────┘
         │
         │ 9. Check:
         │    - Status is 0? ✓
         │    - Product ID matches? ✓
         │    - Transaction in receipt? ✓
         │
         ▼
┌─────────────────┐
│  Your Server    │
│  Create request │
└────────┬────────┘
         │
         │ 10. INSERT INTO requests
         │     - influencer_id
         │     - amount_cents
         │     - payment_method: 'iap'
         │     - iap_transaction_id
         │     - iap_product_id
         │     - status: 'paid'
         │
         ▼
┌─────────────────┐
│  Supabase DB    │
│  Request saved  │
└────────┬────────┘
         │
         │ 11. Return { success: true, requestId: "..." }
         │
         ▼
┌─────────────────┐
│  Mobile App     │
│  Shows success  │
└─────────────────┘
```

---

## 💰 Price Calculation Flow

### How Prices Are Calculated

```
Reviewer sets rate: $77/hour
    ↓
Finds nearest tier: $75 (from PRICE_TIERS array)
    ↓
Web Price: $75 (what customer pays on web)
    ↓
IAP Price: $75 × 1.43 = $108 (rounded up)
    ↓
Why 1.43?
- Apple takes 30%: $108 × 0.30 = $32.40
- You receive: $108 - $32.40 = $75.60
- Your 20% margin: $75.60 × 0.20 = $15.12
- Reviewer gets: $75.60 - $15.12 = $60.48
    ↓
Result: Same margins as web payment!
```

### Price Tier System

- **Tiers**: Fixed prices from $5 to $10,000
- **Rounding**: Reviewer rates round to nearest tier
- **Product IDs**: `com.auro.app.review.{tier}`
  - Example: $75 tier → `com.auro.app.review.75`
- **IAP Price**: Tier × 1.43 (rounded up)

---

## 📋 What You Need to Do Now

### ✅ Already Done
- [x] Dual pricing system implemented
- [x] Mobile request flow created
- [x] Receipt verification implemented
- [x] Shared secret added to Vercel
- [x] Price tier system implemented
- [x] Rate pickers updated throughout app

### 🔴 Critical: Before Submission

#### 1. Set Up IAP Products in App Store Connect

**You MUST create ~150 products in App Store Connect**

**Steps:**
1. Go to https://appstoreconnect.apple.com
2. Select your app → "Features" → "In-App Purchases"
3. Click "+" to create new product
4. For EACH tier ($5, $10, $15, ... up to $10,000):

   **Product Information:**
   - Type: "Non-Consumable" (or "Consumable" if you prefer)
   - Reference Name: "Review Request - $75" (example)
   - Product ID: `com.auro.app.review.75` (must match exactly)
   - Price: $108 (IAP price = tier × 1.43)

5. Repeat for all tiers

**Quick Reference:**
- See `IAP_PRODUCT_SETUP_GUIDE.md` for complete list
- Use the `getAllProductIds()` function output to see all product IDs needed

**Time Estimate:** 2-3 hours (you can batch create some, but many need to be done individually)

#### 2. Test the Flow

**Test Checklist:**
- [ ] Test mobile request flow (all steps)
- [ ] Test photo upload (multiple photos)
- [ ] Test web payment option
- [ ] Test IAP payment option (iOS device with sandbox account)
- [ ] Test deep linking from web to app
- [ ] Test receipt verification (check Vercel logs)
- [ ] Test idempotency (try same transaction twice)

**How to Test IAP:**
1. Create sandbox test account in App Store Connect
2. Sign out of App Store on test device
3. Run app in development/sandbox mode
4. Make test purchase (uses sandbox account)
5. Check Vercel logs to see receipt verification

#### 3. Verify Environment Variables

**In Vercel:**
- [x] `APP_STORE_SHARED_SECRET` ✓ (you added this)
- [ ] `STRIPE_SECRET_KEY` (should already be there)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` (should already be there)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (should already be there)

#### 4. Update Audit Document

After completing setup, update `PRE_SUBMISSION_AUDIT.md`:
- [ ] Mark IAP products as created
- [ ] Mark testing as complete
- [ ] Note any issues found

---

## 🧪 Testing Guide

### Test 1: Mobile Request Flow

```
1. Open app
2. Navigate to request flow (via deep link or UI)
3. Go through each step:
   - Intro ✓
   - Select reviewer ✓
   - Upload photos ✓
   - Enter message ✓
   - Give consent ✓
   - Payment step ✓
```

### Test 2: Web Payment

```
1. Select "Continue on Web"
2. Should open browser with Stripe Checkout
3. Complete payment
4. Should redirect to success page
```

### Test 3: IAP Payment (iOS Only)

```
1. Select "Continue in App"
2. Should show Apple payment sheet
3. Authenticate with Face ID/Touch ID
4. Purchase completes
5. Should show success screen
6. Check Vercel logs for verification
```

### Test 4: Receipt Verification

**Check Vercel Logs:**
1. Go to Vercel Dashboard → Your Project → Deployments
2. Click latest deployment → Functions tab
3. Look for `/api/payments/verify-iap` logs
4. Should see:
   - `[verify-iap] Verifying Apple receipt...`
   - `[verify-iap] Verifying with Apple: ...`
   - `[verify-iap] Apple verification status: 0`
   - `[verify-iap] Receipt verified successfully`
   - `[verify-iap] Request created successfully`

### Test 5: Idempotency

```
1. Complete an IAP purchase
2. Try to use the same receipt again (manually or via code)
3. Should return existing request, not create duplicate
```

---

## 🚨 Common Issues & Solutions

### Issue: "Receipt validation failed: Status 21007"
**Solution:** This means receipt is from sandbox but you're using production endpoint. The code auto-handles this, but if it persists, check your environment.

### Issue: "Product ID mismatch"
**Solution:** 
- Check product ID in App Store Connect matches exactly
- Format: `com.auro.app.review.{tier}`
- No spaces, correct capitalization

### Issue: "Transaction already processed"
**Solution:** This is working correctly! It's the idempotency check preventing duplicates.

### Issue: IAP products not showing in app
**Solution:**
- Make sure products are approved in App Store Connect
- Check product IDs match exactly
- Ensure app is using correct bundle ID

---

## 📊 Current Status

### ✅ Completed
- Dual pricing UI (web & mobile)
- Mobile request flow (all steps)
- Photo upload functionality
- Receipt verification logic
- Idempotency checks
- Product ID validation
- Price tier system
- Rate pickers (mobile & web)

### ⏳ In Progress
- IAP products setup in App Store Connect (YOU need to do this)

### 🔴 Blocking Submission
- IAP products must be created before app submission
- Testing must be completed

---

## 🎯 Next Steps (Priority Order)

1. **NOW**: Create IAP products in App Store Connect (~150 products)
2. **THEN**: Test IAP flow with sandbox account
3. **THEN**: Test web payment flow
4. **THEN**: Test full mobile request flow
5. **THEN**: Check Vercel logs for any errors
6. **THEN**: Rebuild app and submit to App Store

---

## 📝 Quick Reference

### Key Files
- **Mobile Request Flow**: `app/request/index.tsx`
- **IAP Purchase**: `lib/inAppPurchases.ts`
- **Receipt Verification**: `site/app/api/payments/verify-iap/route.ts`
- **Price Tiers**: `lib/iapPriceTiers.ts`
- **Web Payment**: `site/app/request/components/PaymentStep.tsx`
- **Mobile Payment**: `app/request/components/PaymentStep.tsx`

### Key Environment Variables
- `APP_STORE_SHARED_SECRET` (Vercel) ✓
- `STRIPE_SECRET_KEY` (Vercel)
- `NEXT_PUBLIC_SUPABASE_URL` (Vercel)
- `SUPABASE_SERVICE_ROLE_KEY` (Vercel)

### Key Documentation
- `IAP_PRODUCT_SETUP_GUIDE.md` - How to create products
- `APP_STORE_SHARED_SECRET_SETUP.md` - Shared secret guide
- `PRE_SUBMISSION_AUDIT.md` - Complete audit checklist
- `APPLE_RECEIPT_VERIFICATION_EXPLAINED.md` - Receipt verification details

---

## 🎉 Summary

**What Works:**
- ✅ Complete dual pricing system
- ✅ Full mobile request flow
- ✅ Secure receipt verification
- ✅ Price tier system
- ✅ All UI components

**What You Need to Do:**
1. Create ~150 IAP products in App Store Connect (2-3 hours)
2. Test the flows (1-2 hours)
3. Rebuild and submit

**Timeline:**
- IAP Setup: 2-3 hours
- Testing: 1-2 hours
- Total: ~4-5 hours of work before submission

You're almost there! The hard technical work is done. Now it's just the App Store Connect setup and testing.
