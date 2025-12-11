# App Store Submission Guide

## Pre-Submission Checklist

### 1. Apple Developer Account Setup ✅
- [ ] Ensure you have an active Apple Developer Program membership ($99/year)
- [ ] Verify your Apple ID has admin access to the developer account
- [ ] Confirm your Team ID (found in Apple Developer portal)

### 2. App Store Connect Setup
- [ ] Create your app in App Store Connect (https://appstoreconnect.apple.com)
  - Bundle ID: `com.auro.app` (must match app.json)
  - App Name: "Auro" (or your preferred display name)
  - Primary Language: English (or your choice)
- [ ] Note your App Store Connect App ID (numeric ID, e.g., 1234567890)
- [ ] Add your Apple ID email to the submission configuration

### 3. Update EAS Configuration
Update `eas.json` with your actual Apple credentials:
```json
"submit": {
  "production": {
    "ios": {
      "appleId": "your-actual-apple-id@example.com",
      "ascAppId": "your-actual-app-store-connect-app-id",
      "appleTeamId": "your-actual-team-id"
    }
  }
}
```

**How to find these:**
- **Apple ID**: Your Apple ID email used for App Store Connect
- **ASC App ID**: Found in App Store Connect → Your App → App Information → Apple ID (numeric)
- **Apple Team ID**: Found in Apple Developer → Membership → Team ID (10-character string)

### 4. App Store Connect Metadata
Fill out in App Store Connect:

#### App Information
- [ ] App Name: "Auro"
- [ ] Subtitle: "Dating Profile Reviews" (optional but recommended)
- [ ] Category: Social Networking (Primary)
- [ ] Category: Lifestyle (Secondary, optional)
- [ ] Privacy Policy URL: `https://www.appauro.com/privacy` (or your privacy policy URL)
- [ ] Support URL: `https://www.appauro.com/support` (or your support URL)

#### Pricing & Availability
- [ ] Set price (Free or Paid)
- [ ] Select countries/regions for availability

#### App Privacy
- [ ] Complete App Privacy questionnaire:
  - Camera: Used for taking photos for review requests
  - Photo Library: Used for selecting photos for review requests
  - Microphone: Used for video content in review requests
  - Location: Not collected (or specify if you collect location)
  - User Content: Collected (reviews, photos)
  - Identifiers: User ID, Device ID
  - Usage Data: Product interaction, app functionality

#### Screenshots & Preview
- [ ] iPhone 6.7" Display (iPhone 14 Pro Max, 15 Pro Max) - Required
  - At least 1 screenshot (up to 10)
  - Recommended: 6-8 screenshots showing key features
- [ ] iPhone 6.5" Display (iPhone 11 Pro Max, XS Max) - Optional
- [ ] iPhone 5.5" Display (iPhone 8 Plus) - Optional
- [ ] iPad Pro (12.9") - Optional (since supportsTablet: true)
- [ ] App Preview Video - Optional but recommended

**Screenshot Requirements:**
- Format: PNG or JPEG
- No transparency
- No device frames (Apple adds these)
- No status bar text overlays
- Must show actual app content (no placeholders)

**Recommended Screenshots:**
1. Onboarding/Welcome screen
2. Profile creation
3. Request creation flow
4. Review submission interface
5. Completed review view
6. Payment/checkout screen
7. Reviewer dashboard
8. Settings/Profile

### 5. App Review Information
- [ ] Contact Information:
  - First Name, Last Name
  - Phone Number
  - Email Address
- [ ] Demo Account (if required):
  - Username/Email
  - Password
  - Notes about what reviewers should test
- [ ] Notes for Review:
  - Explain any special features
  - Mention test account credentials if needed
  - Note any backend requirements

### 6. Version Information
- [ ] Version: `1.0.0` (matches app.json)
- [ ] Build Number: Will auto-increment via EAS
- [ ] What's New in This Version: First release description

### 7. Build Configuration Check
Verify in `app.json`:
- [x] Bundle Identifier: `com.auro.app`
- [x] Version: `1.0.0`
- [x] Build Number: `1` (will auto-increment)
- [x] Privacy descriptions for Camera, Photo Library, Microphone
- [x] Associated Domains configured
- [x] Encryption declaration: `ITSAppUsesNonExemptEncryption: false`

### 8. Assets Verification
- [x] App Icon: `./assets/images/icon.png` (1024x1024px required)
- [x] Splash Screen: `./assets/images/splash-icon.png`

**Icon Requirements:**
- 1024x1024 pixels
- PNG format
- No transparency
- No rounded corners (Apple adds these)
- No text or UI elements (just the icon)

### 9. Environment Variables & Secrets
- [ ] Update Stripe publishable key in `app.json`:
  - Replace `pk_live_YOUR_LIVE_STRIPE_KEY_HERE` with actual live key
- [ ] Set EAS secrets (if using environment variables):
  ```bash
  eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://zxazjbduiistnfstnwka.supabase.co"
  eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-anon-key"
  eas secret:create --scope project --name STRIPE_PUBLISHABLE_KEY --value "pk_live_..."
  ```

### 10. TestFlight Beta Testing (Recommended)
- [ ] Build and submit to TestFlight first
- [ ] Test with internal testers
- [ ] Test with external testers (optional)
- [ ] Fix any critical issues found
- [ ] Submit for App Review after TestFlight validation

## Submission Steps

### Step 1: Update eas.json
Fill in your Apple credentials in `eas.json` (see section 3 above).

### Step 2: Build Production iOS App
```bash
# Make sure you're logged into EAS
eas login

# Build for production
eas build --platform ios --profile production
```

This will:
- Create a production build
- Auto-increment build number
- Upload to EAS servers
- Take 15-30 minutes

### Step 3: Submit to App Store
Once the build completes:

```bash
# Submit to App Store (automated)
eas submit --platform ios --profile production
```

This will:
- Upload the build to App Store Connect
- Link it to your app
- Make it available for submission

**OR** manually:
1. Go to App Store Connect
2. Select your app
3. Go to TestFlight or App Store tab
4. Click "+" to add a new build
5. Select the build from EAS
6. Fill out version information
7. Submit for Review

### Step 4: Complete App Store Connect
1. Go to App Store Connect → Your App
2. Fill out all required metadata (see section 4)
3. Upload screenshots
4. Complete App Privacy questionnaire
5. Add review notes if needed
6. Click "Submit for Review"

### Step 5: Wait for Review
- Typical review time: 24-48 hours
- You'll receive email notifications about status changes
- Check App Store Connect for updates

## Common Issues & Solutions

### Build Fails
- Check EAS build logs: `eas build:list`
- Verify all dependencies are compatible
- Ensure app.json is valid JSON

### Submission Rejected
Common reasons:
- Missing privacy policy URL
- Incomplete App Privacy questionnaire
- App crashes during review
- Missing demo account (if required)
- Violates App Store guidelines

### Build Not Appearing in App Store Connect
- Wait 5-10 minutes after build completes
- Check that bundle ID matches exactly
- Verify you're looking at the correct app in App Store Connect

## Post-Submission

### After Approval
- [ ] App goes live automatically (or schedule release)
- [ ] Monitor App Store Connect analytics
- [ ] Set up crash reporting (if not already)
- [ ] Monitor user reviews and ratings
- [ ] Prepare for updates (version 1.0.1, etc.)

### Monitoring
- App Store Connect → Analytics
- App Store Connect → Reviews
- Crash reports (if integrated)
- User feedback

## Quick Command Reference

```bash
# Login to EAS
eas login

# Check build status
eas build:list

# Build for production
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios --profile production

# View submission status
eas submit:list
```

## Important Notes

1. **First Submission**: May take longer (up to 7 days) for initial review
2. **Updates**: Subsequent updates typically review faster (24-48 hours)
3. **Rejections**: Don't panic - most issues are fixable. Read the rejection reason carefully.
4. **TestFlight**: Highly recommended to test before submitting for review
5. **Screenshots**: Can be updated without a new build submission
6. **Metadata**: Can be updated anytime (name, description, etc.)

## Need Help?

- EAS Documentation: https://docs.expo.dev/submit/ios/
- App Store Connect Help: https://help.apple.com/app-store-connect/
- Apple Developer Support: https://developer.apple.com/support/

Good luck with your submission! 🚀

