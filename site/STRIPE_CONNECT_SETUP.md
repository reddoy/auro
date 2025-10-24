# Stripe Connect Setup Guide

## Current Status
The application is currently configured to work without Stripe Connect to avoid the "Only Stripe Connect platforms can work with other accounts" error. However, to implement the proper marketplace model where Auro takes a platform fee and reviewers get the rest, you need to set up Stripe Connect.

## What You Need to Do

### 1. Enable Stripe Connect in Your Dashboard
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Connect** → **Settings**
3. Click **"Get started"** or **"Enable Connect"**
4. Choose **"Express accounts"** (recommended for your use case)
5. Complete the platform setup process

### 2. Configure Your Platform Settings
In your Stripe Dashboard under **Connect** → **Settings**:

- **Platform name**: Auro
- **Platform website**: https://www.appauro.com
- **Platform description**: Review platform connecting users with professional reviewers
- **Support email**: Your support email
- **Terms of service**: Link to your terms
- **Privacy policy**: Link to your privacy policy

### 3. Update Environment Variables
Add these to your environment variables:

```bash
# Stripe Connect Platform ID (found in Connect settings)
STRIPE_CONNECT_PLATFORM_ID=acct_xxxxx

# Your existing Stripe keys
STRIPE_SECRET_KEY=sk_live_... or sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... or pk_test_...
```

### 4. Re-enable Connect Code
Once you've set up Connect, uncomment and update the code in `site/app/api/checkout/create-session/route.ts`:

```typescript
// Replace the current session creation with:
const session = connectAccountId
  ? await stripe.checkout.sessions.create(sessionParams, { 
      stripeAccount: connectAccountId,
      application_fee_percent: 0 // We handle fees via application_fee_amount
    })
  : await stripe.checkout.sessions.create(sessionParams);

// And uncomment the payment_intent_data:
payment_intent_data: connectAccountId
  ? {
      application_fee_amount: finalApplicationFeeCents,
      transfer_data: {
        destination: connectAccountId,
      },
    }
  : undefined,
```

## How the Fee Structure Works

### Current Implementation (Without Connect)
- Customer pays full amount to Auro
- Auro manually pays reviewers (not automated)
- Auro keeps 15% (founders) or 20% (regular) platform fee

### With Stripe Connect (Recommended)
- Customer pays full amount
- Stripe automatically transfers money to reviewer's account
- Auro automatically receives platform fee
- Stripe handles all tax reporting and compliance

## Fee Breakdown Example
For a $50 review:
- **Customer pays**: $50.00
- **Stripe processing fee**: ~$1.75 (3.5% + $0.30)
- **Auro platform fee**: $7.50 (15% for founders) or $10.00 (20% for regular)
- **Reviewer receives**: ~$40.75 (founders) or ~$38.25 (regular)

## Testing Connect
1. Set up test Connect accounts for reviewers
2. Use Stripe's test mode
3. Test the complete flow: customer payment → automatic transfer → platform fee

## Important Notes
- **Connect is required** for automatic transfers to reviewer accounts
- **Without Connect**, you'll need to manually pay reviewers
- **Connect handles compliance** and tax reporting automatically
- **Express accounts** are easier for reviewers to set up than Standard accounts

## Next Steps
1. Enable Connect in your Stripe Dashboard
2. Update environment variables
3. Uncomment the Connect code
4. Test with test accounts
5. Deploy to production

## Support
If you need help with Connect setup, refer to:
- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Express Accounts Guide](https://stripe.com/docs/connect/express-accounts)
- [Platform Fees Documentation](https://stripe.com/docs/connect/application-fees)
