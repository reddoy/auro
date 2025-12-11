# Quick Guide: Build & Submit to App Store

This is a streamlined guide to build your production iOS app and submit it to App Store Connect.

## Prerequisites Checklist

Before building, make sure:

- [x] Stripe publishable key is set in `app.json` ✅
- [ ] All Stripe environment variables are set in Vercel (Production)
- [ ] All Stripe secrets are set in Supabase
- [ ] Google OAuth redirect URIs are configured
- [ ] App is created in App Store Connect (App ID: `6755449985`)

## Step 1: Build Production iOS App

Run this command from your project root:

```bash
eas build --platform ios --profile production
```

**What happens:**
- EAS will build your app in the cloud
- Build takes 15-30 minutes
- You'll get a download link when complete

**Note:** Make sure you're logged into EAS:
```bash
eas login
```

## Step 2: Test the Build (Optional but Recommended)

Before submitting, test the build:

1. Download the build from the EAS dashboard
2. Install on a physical iPhone (not simulator)
3. Test critical flows:
   - Google sign-in
   - Payment flow
   - Review creation

Or use TestFlight:
```bash
eas build --platform ios --profile production --auto-submit
```

## Step 3: Submit to App Store Connect

You have two options:

### Option A: Automatic Submission (Easiest)

```bash
eas submit --platform ios --latest
```

This will:
- Upload the latest build to App Store Connect
- Use credentials from `eas.json` (already configured)

### Option B: Manual Submission

1. Download the `.ipa` file from EAS dashboard
2. Go to [App Store Connect](https://appstoreconnect.apple.com)
3. Select your app (App ID: `6755449985`)
4. Go to **TestFlight** or **App Store** tab
5. Click **+** to add a new build
6. Upload the `.ipa` file using Transporter app or Xcode

## Step 4: Complete App Store Connect Setup

After the build is uploaded, complete these in App Store Connect:

### App Information (if not done)
- [ ] App name, subtitle, category
- [ ] Privacy policy URL: `https://www.appauro.com/privacy`
- [ ] Support URL: `https://www.appauro.com/support`

### Screenshots (Required)
- [ ] Upload at least 1 screenshot for iPhone 6.7" Display
- [ ] Recommended: 6-8 screenshots showing key features

### App Privacy
- [ ] Complete privacy questionnaire:
  - Camera: Used for taking photos
  - Photo Library: Used for selecting photos
  - Microphone: Used for video content
  - User Content: Collected (reviews, photos)

### App Review Information
- [ ] Contact info (your name, phone, email)
- [ ] Demo account credentials (if app requires login)
- [ ] Notes for reviewers explaining key features

## Step 5: Submit for Review

1. In App Store Connect, go to your app
2. Create a new version (or use existing)
3. Fill in:
   - **What's New in This Version**: Describe your updates
   - **Version Number**: From `app.json` (currently `1.0.0`)
4. Select the build you just uploaded
5. Review all information
6. Click **Submit for Review**

## Common Commands

```bash
# Check build status
eas build:list --platform ios

# View build details
eas build:view [build-id]

# Submit latest build
eas submit --platform ios --latest

# Build and submit in one command
eas build --platform ios --profile production --auto-submit
```

## Troubleshooting

### Build Fails
- Check EAS dashboard for error logs
- Verify all environment variables are set
- Ensure Stripe keys are correct format

### Submission Fails
- Verify Apple credentials in `eas.json`
- Check Apple Developer account is active
- Ensure app exists in App Store Connect

### App Review Rejected
- Check email from Apple for specific issues
- Review App Review Guidelines
- Fix issues and resubmit

## Your Current Configuration

From `eas.json`:
- **Apple ID**: rohanomalley@gmail.com ✅
- **App Store Connect App ID**: 6755449985 ✅
- **Apple Team ID**: P9T25F67JV ✅

All credentials are already configured!

## Next Steps After Approval

1. App will appear in App Store after approval (usually 24-48 hours)
2. Monitor crash reports in App Store Connect
3. Respond to user reviews
4. Prepare updates for future versions

## Quick Start (All-in-One)

If you're ready to build and submit right now:

```bash
# 1. Build production app
eas build --platform ios --profile production

# 2. Wait for build to complete (check EAS dashboard)

# 3. Submit to App Store
eas submit --platform ios --latest

# 4. Complete App Store Connect metadata
# (Do this in the web interface)

# 5. Submit for review
# (Do this in App Store Connect)
```

That's it! Your app will be submitted and ready for review.

