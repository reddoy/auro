# Production Ready Checklist

This document summarizes what's been fixed and what you need to do before pushing to production.

## ✅ What's Been Fixed

### 1. Google Sign-In Fixed for Production Builds

**Problem**: Google sign-in was opening the browser but not properly closing it and logging users in within the app.

**Solution**: Updated `app/auth.tsx` to use `expo-auth-session`'s `openAuthSessionAsync` method, which properly handles OAuth flows in production builds with deep linking. The browser will now automatically close and return to the app after successful authentication.

**Key Changes**:
- Uses `makeRedirectUri` to create proper deep link URLs (`auro://auth/callback`)
- Uses `WebBrowser.openAuthSessionAsync` instead of `openBrowserAsync`
- Properly extracts the auth code from the callback URL
- Exchanges the code for a session automatically
- Handles errors and edge cases

**What You Need to Do**:
1. Make sure your Google OAuth redirect URIs include:
   - `auro://auth/callback` (for production app deep linking)
   - `https://app.appauro.com/auth/callback` (for web fallback)
2. Add the same URIs to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs

### 2. Stripe Configuration Documented

**Created**: `STRIPE_PRODUCTION_SETUP.md` - A comprehensive guide for switching from test to production Stripe keys.

**What You Need to Do**:
1. Follow the guide in `STRIPE_PRODUCTION_SETUP.md`
2. Update `app.json` with your production Stripe publishable key
3. Set environment variables in Vercel and Supabase (see guide)

## 📋 Pre-Production Checklist

### Google OAuth Setup
- [ ] Add `auro://auth/callback` to Google Cloud Console → OAuth 2.0 Client → Authorized redirect URIs
- [ ] Add `https://app.appauro.com/auth/callback` to Google Cloud Console → OAuth 2.0 Client → Authorized redirect URIs
- [ ] Add both URIs to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs
- [ ] Test Google sign-in in a production build (not Expo Go)

### Stripe Configuration
- [ ] Get production Stripe keys from Stripe Dashboard (Live mode)
- [ ] Update `app.json` with production publishable key (`pk_live_...`)
- [ ] Set `STRIPE_SECRET_KEY` in Vercel (Production environment)
- [ ] Set `STRIPE_PLATFORM_ACCOUNT_ID` in Vercel (Production environment)
- [ ] Set `STRIPE_WEBHOOK_SECRET` in Vercel (Production environment)
- [ ] Set `STRIPE_SECRET_KEY` in Supabase Edge Functions secrets
- [ ] Set `STRIPE_WEBHOOK_SECRET` in Supabase Edge Functions secrets
- [ ] Configure webhook endpoints in Stripe Dashboard (Live mode)
- [ ] Test a payment flow in production build

### Testing
- [ ] Build production iOS app: `eas build --platform ios --profile production`
- [ ] Test Google sign-in in production build
- [ ] Test payment flow in production build
- [ ] Test reviewer payout flow
- [ ] Verify webhooks are receiving events

### App Store Submission
- [ ] Follow `APP_STORE_SUBMISSION_GUIDE.md` for final submission steps
- [ ] Ensure all environment variables are set
- [ ] Test in TestFlight before App Store submission

## 🔍 Key Files Changed

1. **`app/auth.tsx`**: Fixed Google sign-in to work properly in production builds
2. **`app.json`**: Added TODO comment for Stripe key
3. **`STRIPE_PRODUCTION_SETUP.md`**: Comprehensive Stripe setup guide (NEW)
4. **`PRODUCTION_READY_CHECKLIST.md`**: This file (NEW)

## 🚨 Important Notes

1. **Deep Linking**: The Google sign-in fix relies on proper deep linking configuration. Make sure:
   - Your `app.json` has `"scheme": "auro"` (already set)
   - Your iOS app has associated domains configured (already set: `applinks:app.appauro.com`)
   - The deep link scheme matches what's configured in Google OAuth

2. **Stripe Keys**: Never commit production Stripe keys to git. Always use:
   - EAS secrets for mobile app keys
   - Vercel environment variables for backend keys
   - Supabase secrets for Edge Function keys

3. **Testing**: Always test in a production build (not Expo Go) because:
   - Deep linking works differently in production
   - OAuth flows behave differently
   - Payment flows require production keys

## 📚 Documentation

- **Stripe Setup**: See `STRIPE_PRODUCTION_SETUP.md`
- **App Store Submission**: See `APP_STORE_SUBMISSION_GUIDE.md`
- **Payment Flow**: See `docs/PAYMENT_FLOW_EXPLAINED.md`

## 🆘 Troubleshooting

### Google Sign-In Not Working
- Verify redirect URIs are configured correctly in Google Cloud Console
- Check that `auro://auth/callback` is registered in your app's URL scheme
- Test in a production build, not Expo Go
- Check console logs for OAuth errors

### Stripe Payments Not Working
- Verify all Stripe keys are production keys (start with `pk_live_` and `sk_live_`)
- Check that environment variables are set in the correct environment (Production, not Preview)
- Verify webhook endpoints are configured in Stripe Dashboard
- Check Stripe Dashboard → Logs for API errors

### Need Help?
- Check the relevant documentation files
- Review Stripe Dashboard logs
- Check Vercel function logs
- Check Supabase Edge Function logs

