# Apple Receipt Verification Explained

## What is an Apple IAP Receipt?

When a user makes an in-app purchase (IAP) on iOS, Apple generates a **receipt** - a cryptographically signed document that proves the purchase happened. This receipt contains:

- Transaction ID
- Product ID (e.g., `com.auro.app.review.75`)
- Purchase date
- User's Apple ID
- Payment status
- And more...

## The Problem: Trusting the Client

**Current Implementation (Insecure):**

Right now, in `site/app/api/payments/verify-iap/route.ts`, when a user completes an IAP purchase:

1. The mobile app sends the receipt to our server
2. Our server **trusts the receipt** and creates a review request
3. ❌ **We never verify with Apple that the receipt is real**

**Why This is Dangerous:**

A malicious user could:
- Send a fake receipt
- Reuse an old receipt from a previous purchase
- Send someone else's receipt
- Create a review request without actually paying

This would result in:
- Lost revenue
- Free reviews
- Fraud

## The Solution: Server-Side Verification

**How It Should Work:**

1. User completes IAP purchase in the app
2. App receives receipt from Apple
3. App sends receipt to **our server** (not directly to Apple)
4. **Our server** sends receipt to **Apple's servers** to verify it's real
5. Apple responds with verification status
6. Only if Apple confirms it's valid, we create the review request

## Apple's Verification Endpoints

Apple provides two endpoints for receipt verification:

### Production:
```
POST https://buy.itunes.apple.com/verifyReceipt
```

### Sandbox (for testing):
```
POST https://sandbox.itunes.apple.com/verifyReceipt
```

## What Needs to Be Verified

1. **Receipt is valid** - Status code 0 means valid
2. **Product ID matches** - The product in the receipt matches what we expect
3. **Transaction is new** - Check if we've already processed this transaction (idempotency)
4. **Purchase is complete** - The transaction wasn't cancelled or refunded

## Current Code Status

**Location:** `site/app/api/payments/verify-iap/route.ts`

**Current Code (Lines 39-52):**
```typescript
// TODO: Verify receipt with Apple's servers
// In production, you MUST verify the receipt with Apple's servers:
// - Production: https://buy.itunes.apple.com/verifyReceipt
// - Sandbox: https://sandbox.itunes.apple.com/verifyReceipt
```

**What's Missing:**
- The actual HTTP request to Apple's servers
- Parsing Apple's response
- Validating the receipt data
- Idempotency checking (preventing duplicate transactions)

## How to Implement

### Option 1: Use Apple's App Store Server API (Recommended)

Apple's newer API uses JWT authentication and is more secure:

```typescript
import { AppStoreServerAPI, Environment } from 'app-store-server-api';

// Initialize
const api = new AppStoreServerAPI(
  process.env.APP_STORE_KEY_ID!,
  process.env.APP_STORE_ISSUER_ID!,
  process.env.APP_STORE_BUNDLE_ID!,
  process.env.APP_STORE_PRIVATE_KEY!,
  Environment.PRODUCTION // or Environment.SANDBOX
);

// Verify transaction
const transactionInfo = await api.getTransactionInfo(transactionId);
```

### Option 2: Use Legacy verifyReceipt Endpoint

Simpler but older approach:

```typescript
const response = await fetch('https://buy.itunes.apple.com/verifyReceipt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    'receipt-data': receipt,
    'password': process.env.APP_STORE_SHARED_SECRET, // Optional but recommended
  }),
});

const data = await response.json();

if (data.status === 0) {
  // Receipt is valid
  // Check product ID, transaction ID, etc.
} else {
  // Receipt is invalid
  // Handle error
}
```

## Required Setup

To implement receipt verification, you'll need:

1. **App Store Connect API Key** (for App Store Server API):
   - Key ID
   - Issuer ID
   - Private Key (.p8 file)
   - Bundle ID

2. **OR App Store Shared Secret** (for legacy API):
   - Found in App Store Connect → Your App → App Information → Shared Secret

## Security Best Practices

1. **Never trust client data** - Always verify on the server
2. **Check idempotency** - Store transaction IDs to prevent reuse
3. **Verify product ID** - Ensure the product matches what was purchased
4. **Check transaction status** - Ensure it's not refunded/cancelled
5. **Use HTTPS** - Always use secure connections
6. **Store secrets securely** - Never expose API keys in client code

## Impact of Not Implementing

**Without receipt verification:**
- ❌ Vulnerable to fraud
- ❌ Users can get free reviews
- ❌ Revenue loss
- ❌ App Store may reject your app
- ❌ Potential for abuse

**With receipt verification:**
- ✅ Secure transactions
- ✅ Fraud prevention
- ✅ Revenue protection
- ✅ App Store compliance
- ✅ Trustworthy system

## Next Steps

1. **Choose verification method** (App Store Server API recommended)
2. **Get credentials** from App Store Connect
3. **Install library** (e.g., `app-store-server-api` npm package)
4. **Implement verification** in `verify-iap/route.ts`
5. **Test in sandbox** before production
6. **Add idempotency checks** to prevent duplicate processing

## Example Implementation Flow

```
User completes IAP
    ↓
App receives receipt from Apple
    ↓
App sends receipt to our server (/api/payments/verify-iap)
    ↓
Our server sends receipt to Apple's servers
    ↓
Apple verifies and responds
    ↓
Our server checks:
  - Receipt is valid? ✓
  - Product ID matches? ✓
  - Transaction not used before? ✓
    ↓
Create review request in database
    ↓
Return success to app
```

## Summary

**Receipt verification** is the process of confirming with Apple that an in-app purchase actually happened. Without it, your app is vulnerable to fraud. It's a **critical security requirement** that must be implemented before going to production.
