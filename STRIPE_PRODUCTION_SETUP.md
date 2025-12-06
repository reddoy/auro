# Stripe Production Setup Guide

This guide walks you through switching from Stripe test keys to production keys for your Auro app.

## Overview

Your app uses Stripe in multiple places:
- **Mobile App**: PaymentSheet for customer payments
- **Backend APIs**: Payment processing, refunds, and reviewer payouts
- **Supabase Edge Functions**: Payment intent creation and webhooks
- **Stripe Connect**: Reviewer onboarding and payouts

## Step 1: Get Your Production Stripe Keys

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com)
2. Make sure you're in **Live mode** (toggle in top right)
3. Go to **Developers** → **API keys**
4. Copy these keys:
   - **Publishable key**: `pk_live_...` (starts with `pk_live_`)
   - **Secret key**: `sk_live_...` (starts with `sk_live_`)
5. Go to **Developers** → **Webhooks**
   - Find or create your webhook endpoint
   - Copy the **Signing secret**: `whsec_...` (starts with `whsec_`)
6. Go to **Settings** → **Account**
   - Copy your **Account ID**: `acct_...` (starts with `acct_`)

## Step 2: Update Mobile App Configuration

### Update `app.json`

Replace the placeholder in `app.json`:

```json
"stripePublishableKey": "pk_live_YOUR_LIVE_STRIPE_KEY_HERE"
```

With your actual production key:

```json
"stripePublishableKey": "pk_live_51ABC123..."
```

### Set EAS Secret (Recommended)

Instead of hardcoding in `app.json`, you can use EAS secrets:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY --value "pk_live_51ABC123..."
```

Then update `app.json` to use the environment variable (or keep it in `app.json` if you prefer).

## Step 3: Update Vercel Environment Variables

Your Next.js backend (`site/`) needs these environment variables in Vercel:

1. Go to your Vercel project → **Settings** → **Environment Variables**
2. Add/Update these variables for **Production**:

```
STRIPE_SECRET_KEY=sk_live_51ABC123...
STRIPE_PLATFORM_ACCOUNT_ID=acct_1ABC123...
STRIPE_WEBHOOK_SECRET=whsec_ABC123...
```

**Important**: Make sure to set these for the **Production** environment, not Preview or Development.

## Step 4: Update Supabase Edge Functions

Your Supabase Edge Functions need the Stripe secret key:

1. Go to your Supabase project → **Settings** → **Edge Functions** → **Secrets**
2. Set these secrets:

```
STRIPE_SECRET_KEY=sk_live_51ABC123...
STRIPE_WEBHOOK_SECRET=whsec_ABC123...
```

Or use the Supabase CLI:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_51ABC123...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_ABC123...
```

## Step 5: Update Webhook Endpoints

### Supabase Webhook

1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Find your Supabase webhook endpoint: `https://<project-ref>.functions.supabase.co/stripe-webhook`
3. Make sure it's using the **live** signing secret (update if needed)
4. Ensure these events are enabled:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `charge.dispute.created`

### Next.js Webhook (if used)

1. If you have a webhook at `https://www.appauro.com/api/stripe/webhook`
2. Add it in Stripe Dashboard → **Developers** → **Webhooks**
3. Use the same signing secret as configured in Vercel

## Step 6: Replace Hardcoded Test Account ID

The code has a hardcoded test account ID `acct_1S0FmFBCrjcqavov` that needs to be replaced. This is already handled via the `STRIPE_PLATFORM_ACCOUNT_ID` environment variable, but make sure it's set everywhere.

**Files that use this** (already using env var, but verify):
- `site/app/api/payments/distribute-reviewer-payment/route.ts`
- `site/app/api/payments/retry-distribution/route.ts`
- `site/app/api/payments/retry-failed-distributions/route.ts`
- `site/app/api/admin/distribute-payment/route.ts`

## Step 7: Verify Configuration

### Test Mobile App

1. Build a production build:
   ```bash
   eas build --platform ios --profile production
   ```

2. Test a payment flow:
   - Create a review request
   - Complete payment with a test card (Stripe test mode still works for testing)
   - Verify payment appears in Stripe Dashboard (Live mode)

### Test Backend APIs

1. Check that environment variables are set:
   ```bash
   # In Vercel, check Environment Variables page
   # In Supabase, check Edge Functions secrets
   ```

2. Test a payment distribution:
   - Use the admin API or retry endpoint
   - Verify it uses the live account ID

### Test Webhooks

1. Use Stripe CLI to test webhooks:
   ```bash
   stripe listen --forward-to https://<project-ref>.functions.supabase.co/stripe-webhook
   ```

2. Trigger a test event:
   ```bash
   stripe trigger payment_intent.succeeded
   ```

## Step 8: Update Google OAuth Redirect URIs

Since you're going to production, make sure your Google OAuth redirect URIs are configured:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services** → **Credentials**
3. Find your OAuth 2.0 Client ID
4. Add these **Authorized redirect URIs**:
   - `auro://auth/callback` (for deep linking in production builds)
   - `https://app.appauro.com/auth/callback` (for web fallback)

5. Also add to **Supabase Dashboard** → **Authentication** → **URL Configuration** → **Redirect URLs**:
   - `auro://auth/callback`
   - `https://app.appauro.com/auth/callback`

## Checklist

- [ ] Stripe publishable key updated in `app.json` or EAS secret
- [ ] `STRIPE_SECRET_KEY` set in Vercel (Production)
- [ ] `STRIPE_PLATFORM_ACCOUNT_ID` set in Vercel (Production)
- [ ] `STRIPE_WEBHOOK_SECRET` set in Vercel (Production)
- [ ] `STRIPE_SECRET_KEY` set in Supabase Edge Functions secrets
- [ ] `STRIPE_WEBHOOK_SECRET` set in Supabase Edge Functions secrets
- [ ] Webhook endpoints configured in Stripe Dashboard (Live mode)
- [ ] Google OAuth redirect URIs updated
- [ ] Supabase redirect URIs updated
- [ ] Tested payment flow in production build
- [ ] Tested webhook delivery

## Important Notes

1. **Never commit production keys to git** - Always use environment variables or EAS secrets
2. **Test in TestFlight first** - Don't submit to App Store until you've tested payments
3. **Monitor webhooks** - Check Stripe Dashboard → Webhooks for any failures
4. **Keep test keys separate** - Don't mix test and live keys in the same environment
5. **Rotate keys regularly** - For security, rotate your API keys periodically

## Troubleshooting

### Payments not working
- Check that `STRIPE_SECRET_KEY` is set correctly (should start with `sk_live_`)
- Verify publishable key in `app.json` matches your Stripe account
- Check Stripe Dashboard logs for errors

### Webhooks not receiving events
- Verify webhook endpoint URL is correct
- Check that `STRIPE_WEBHOOK_SECRET` matches the signing secret in Stripe Dashboard
- Look at Supabase Edge Function logs for errors

### Reviewer payouts failing
- Verify `STRIPE_PLATFORM_ACCOUNT_ID` is set to your live account ID
- Check that reviewers have completed Stripe Connect onboarding
- Review payment distribution logs in Vercel

## Support

If you encounter issues:
1. Check Stripe Dashboard → **Logs** for API errors
2. Check Vercel → **Functions** → **Logs** for backend errors
3. Check Supabase → **Edge Functions** → **Logs** for function errors
4. Review this guide to ensure all steps are completed

