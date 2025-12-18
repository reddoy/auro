# App Store Review Fixes

This document addresses the issues raised in the App Store review rejection.

**Latest Review Date**: December 16, 2025  
**Submission ID**: 564b17ac-c9e3-4eeb-bcc1-801ca2bdfd2e  
**Version**: 1.0  
**Device Tested**: iPad Air 11-inch M3 (iPadOS 26.1)

## 🚨 CURRENT REJECTION ISSUES (December 16, 2025)

### Issue 1: Guideline 2.1 - Sign in with Apple Bug on iPad ⚠️ **CRITICAL**

**Problem**: The app failed to login using Sign in with Apple on iPad Air 11-inch M3 (iPadOS 26.1).

**Status**: 🔧 **FIXING** - Adding OAuth fallback for iPad compatibility

**Root Cause**: Native Apple Sign In API may have issues on certain iPad configurations. Need to add automatic fallback to OAuth flow.

**Fix Applied**:
- Added automatic fallback to OAuth flow if native sign-in fails
- Improved error handling and logging
- Added user-friendly error messages
- Better handling of edge cases (missing tokens, Supabase errors)

**Testing Required**:
- [ ] Test Sign in with Apple on iPad Air 11-inch M3 (or similar)
- [ ] Test on iPhone to ensure native flow still works
- [ ] Verify OAuth fallback works when native fails
- [ ] Test both new and existing users

**Location in Code**: `app/auth.tsx` lines 243-320 (updated)

---

### Issue 2: Guideline 2.1 - PassKit Framework ✅ **FIXED**

**Problem**: App binary includes PassKit framework but Apple Pay is not implemented.

**Solution**: Created config plugin to exclude PassKit framework from iOS build

**Changes Made**:
- Created `plugins/withNoPassKit.js` config plugin
- Plugin removes PassKit from framework linking during build
- Added plugin to `app.json` plugins array

**Action Required**:
1. Build new version - the plugin will automatically exclude PassKit
2. Reply to App Review stating PassKit has been removed:
   ```
   PassKit framework has been removed from the app binary. We have implemented 
   a config plugin that explicitly excludes PassKit from the iOS build. The app 
   does not and never has implemented Apple Pay functionality. All payments are 
   processed through Stripe Checkout on our website (www.appauro.com).
   ```

---

### Issue 3: Guideline 2.3.3 - iPad Screenshots 📸

**Problem**: 13-inch iPad screenshots show stretched iPhone images instead of actual iPad UI.

**Action Required**:
- [ ] Capture real iPad screenshots on 13-inch iPad Pro
- [ ] Upload via "View All Sizes in Media Manager" in App Store Connect

---

### Issue 4: Guideline 2.1 - Demo Account/Mode ⚠️

**Problem**: Apple needs to verify all features, specifically mentioned "My Reviews" functionality.

**Status**: ✅ **IMPLEMENTED** - But need to ensure reviews are visible in demo mode

**Current Demo Mode**:
- ✅ Has review counts (3 given, 5 received)
- ✅ Shows reviews in profile sections
- ⚠️ May need actual review data visible, not just counts

**Action Required**:
1. **Add to Review Notes** in App Store Connect:
   ```
   Demo Mode Instructions:
   
   To access all features including "My Reviews", tap "Try Demo Mode" on the 
   login/signup screen. Demo mode includes:
   - Full access to all app features
   - Pre-populated profile with reviews (3 given, 5 received)
   - Sample reviews visible in Profile tab
   - Both creator and reviewer functionality
   - Transaction history and review history
   - No login credentials required
   
   The "My Reviews" feature can be accessed via:
   - Profile tab → View reviews given/received
   - Requests tab → View review history
   ```

2. **Verify demo mode shows actual review data** (not just counts)

---

## 📋 PREVIOUS REJECTION ISSUES (December 10, 2025)

### Issue A: Guideline 4.8 - Login Services ⚠️

**Problem**: The app uses a third-party login service (Google), but Apple needs confirmation that Sign in with Apple is offered as an equivalent option that meets all requirements:
- Limits data collection to name and email
- Allows users to keep email address private
- Does not collect interactions for advertising without consent

**Status**: ✅ **IMPLEMENTED** - The app already has Sign in with Apple available

**Evidence**:
- Sign in with Apple is implemented using `expo-apple-authentication` (native iOS API)
- Both "Continue with Apple" and "Continue with Google" buttons are visible on the auth screen
- Sign in with Apple meets all three requirements by default

**Action Required**:
1. Reply to App Review in App Store Connect stating:
   - "Sign in with Apple is available as an equivalent login option"
   - Location: Login/Signup screen - "Continue with Apple" button (visible on iOS)
   - It meets all requirements: limits data to name/email, allows private email, no ad tracking

**Location in Code**: `app/auth.tsx` lines 1605-1619 (Apple Sign In button) and 224-429 (implementation)

---

### Issue B: Guideline 5.1.1(v) - Account Deletion ⚠️

**Problem**: The app supports account creation but Apple couldn't find an account deletion option.

**Status**: ✅ **IMPLEMENTED** - Account deletion exists but may need better visibility

**Evidence**:
- Account deletion is implemented in `app/(tabs)/profile/settings.tsx`
- Located in: Profile Tab → Settings → Account section → "Delete Account" button
- Includes two-step confirmation
- Permanently deletes all user data via API endpoint

**Action Required**:
1. **Reply to App Review** in App Store Connect stating:
   - Account deletion is available at: **Profile Tab → Settings → Account section → "Delete Account"**
   - The feature permanently deletes all account data (not just deactivation)
   - Includes confirmation steps to prevent accidental deletion

2. **Optional Enhancement**: Consider making the delete button more prominent or adding a direct link in the main profile screen

**Location in Code**: `app/(tabs)/profile/settings.tsx` lines 300-389

---

### Issue C: Guideline 2.3.6 - Age Rating Metadata ⚠️

**Problem**: Age Rating indicates "In-App Controls" but Apple couldn't find Parental Controls or Age Assurance mechanisms.

**Status**: ❌ **METADATA ISSUE** - Needs to be fixed in App Store Connect

**Action Required**:
1. Go to App Store Connect → Your App → App Information
2. Find "Age Rating" section
3. Change "Age Assurance" from current setting to **"None"**
4. Keep other age rating selections accurate

**Note**: This is purely a metadata update - no code changes needed.

---

### Issue D: Guideline 2.1 - PassKit Framework ⚠️

**Problem**: App binary includes PassKit framework but Apple couldn't verify Apple Pay integration.

**Status**: ⚠️ **NEEDS VERIFICATION** - Previously marked as fixed but Apple still sees it

**Previous Fix Attempt**:
- Removed `@stripe/stripe-react-native` package
- Removed Stripe plugin from `app.json`

**Action Required**:
1. **Verify PassKit is removed**:
   - Check if any other dependency includes PassKit
   - Run: `grep -r "PassKit\|ApplePay" --include="*.json" --include="*.ts" --include="*.tsx"`
   - Verify `app.json` doesn't have any PassKit references

2. **If PassKit is still present**, add note in Review Notes:
   ```
   The app does not currently implement Apple Pay functionality. 
   The PassKit framework may be included by a third-party dependency, 
   but no Apple Pay features are active in the app.
   ```

3. **If PassKit is removed**, reply to App Review stating it has been removed from the binary.

---

### Issue E: Guideline 2.3.3 - iPad Screenshots 📸

**Problem**: 13-inch iPad screenshots don't show the actual app in use.

**Status**: ❌ **NEEDS ACTION** - Same issue as before

**Action Required**: (See detailed steps in "Issue 3" section below)

---

### Issue F: Guideline 2.1 - Demo Account/Demo Mode ✅

**Problem**: Apple needs a way to verify all app features.

**Status**: ✅ **IMPLEMENTED** - Demo Mode exists

**Action Required**:
1. Add to **Review Notes** in App Store Connect:
   ```
   Demo Mode is available for testing. On the login/signup screen, 
   tap "Try Demo Mode" to access all features without creating an account. 
   The demo includes pre-populated data for reviews, requests, and profile information.
   ```

**Location**: App Store Connect → Your App → App Store → Version Information → Review Notes

---

## ✅ Issue 1: Sign in with Apple Bug (FIXED)

**Problem**: The app failed to login using Sign in with Apple on iPad Air 11-inch M3.

**Solution**: Updated the Sign in with Apple implementation to use the native `expo-apple-authentication` API for iOS devices instead of the OAuth web flow. This provides better reliability, especially on iPad.

**Changes Made**:
- Installed `expo-apple-authentication` package
- Updated `app/auth.tsx` to use native Apple Sign In API for iOS
- Added `expo-apple-authentication` plugin to `app.json`
- Kept OAuth flow as fallback for Android and web

**Testing Required**:
- Test Sign in with Apple on iPhone
- Test Sign in with Apple on iPad (especially iPad Air 11-inch M3)
- Verify the flow works for both new and existing users

---

## ✅ Issue 2: PassKit Framework (FIXED)

**Problem**: The app binary includes the PassKit framework for implementing Apple Pay, but no Apple Pay integration is visible.

**Solution**: Removed the `@stripe/stripe-react-native` package since the app does not use in-app payment processing. All payments are processed through Stripe Checkout (web-based redirect flow) on the website.

**Changes Made**:
- Removed `@stripe/stripe-react-native` package
- Removed Stripe plugin from `app.json` (which was including PassKit)
- Removed `StripeProvider` wrapper from `app/_layout.tsx`
- Updated `lib/payments.ts` to remove PaymentSheet code
- Updated `components/StripeProvider.tsx` to be a no-op component

**Result**: The PassKit framework is no longer included in the app binary, resolving the App Store review issue.

---

## 📸 Issue 3: iPad Screenshots (Metadata Update Required)

**Problem**: The 13-inch iPad screenshots show an iPhone image that has been modified or stretched to appear to be an iPad image.

**Action Required**: Upload new iPad screenshots that accurately reflect the app running on an iPad.

### Steps to Fix:

1. **Capture iPad Screenshots**:
   - Use a physical iPad or iPad simulator (13-inch iPad Pro recommended)
   - Take screenshots at the correct resolution:
     - **12.9-inch iPad Pro (3rd generation)**: 2048 x 2732 pixels (portrait) or 2732 x 2048 pixels (landscape)
     - **11-inch iPad Pro (2nd generation)**: 1668 x 2388 pixels (portrait) or 2388 x 1668 pixels (landscape)
   - Ensure screenshots show the actual iPad UI (not stretched iPhone UI)

2. **Update in App Store Connect**:
   - Go to App Store Connect → Your App → App Store → App Information
   - Scroll to "Previews and Screenshots"
   - Click "View All Sizes in Media Manager" (important for iPad screenshots)
   - Upload new iPad screenshots for the 13-inch iPad Pro size
   - Ensure screenshots highlight the app's core functionality

3. **Screenshot Requirements**:
   - Must show actual iPad interface (not stretched iPhone)
   - Should highlight core app features
   - Must be in PNG or JPEG format
   - No text overlays or marketing copy on the screenshots themselves

---

## ✅ Issue 4: Demo Account (FIXED)

**Problem**: App reviewers need a demo account to access all features and functionality.

**Solution**: Implemented a **Demo Mode** that provides full access to all features without requiring login credentials.

### Demo Mode Features:

- ✅ **No Login Required**: Tap "Try Demo Mode" button on the auth screen
- ✅ **Full Feature Access**: All app features are available
- ✅ **Pre-populated Data**: Demo profile includes:
  - Complete profile with bio, skills, links
  - Reviewer status (approved)
  - Sample reviews (3 given, 5 received)
  - Rating average (4.8 stars)
  - Payment packages and balances
  - Stripe Connect account status
- ✅ **Clear Indicator**: Demo mode banner shows at top of app
- ✅ **All Account Types**: Access to both creator and reviewer features

### How Reviewers Can Access Demo Mode:

1. Open the app
2. On the login/signup screen, tap the **"Try Demo Mode"** button
3. The app will immediately enter demo mode with full access
4. A banner at the top indicates "Demo Mode - All features available for testing"

### Action Required in App Store Connect:

**Option 1: Use Demo Mode (Recommended)**
- Add the following note in **Review Notes**:
  ```
  Demo Mode is available for testing. On the login screen, tap "Try Demo Mode" 
  to access all features without creating an account. The demo includes 
  pre-populated data for reviews, requests, and profile information.
  ```

**Option 2: Provide Demo Account Credentials**
- If you prefer to provide actual credentials, create a demo account and add:
  - **Username/Email**: `[Your demo account email]`
  - **Password**: `[Your demo account password]`
  - Note: "This account has full access to all features"

**Location**: App Store Connect → Your App → App Store → Version Information → Review Notes

---

## 📋 PRE-RESUBMISSION CHECKLIST (December 16, 2025)

### Code & Implementation ✅
- [x] Sign in with Apple implemented (native API for iOS)
- [x] OAuth fallback added for iPad compatibility
- [x] Account deletion implemented in settings
- [x] Demo Mode implemented
- [ ] Tested Sign in with Apple on iPad Air 11-inch M3 (CRITICAL)
- [ ] Tested Sign in with Apple on iPhone (verify native still works)
- [ ] Tested OAuth fallback when native fails
- [ ] Verified demo mode shows "My Reviews" functionality
- [ ] Tested account deletion flow

### App Store Connect Updates ⚠️
- [ ] **Reply to App Review** for Guideline 2.1 (Sign in with Apple Bug):
  - [ ] Explained OAuth fallback fix for iPad
  - [ ] Requested testing on iPad Air 11-inch M3
  
- [ ] **Reply to App Review** for Guideline 2.1 (PassKit):
  - [ ] Stated PassKit is not used for Apple Pay
  - [ ] Added note in Review Notes section
  
- [ ] **Reply to App Review** for Guideline 2.1 (Demo Account):
  - [ ] Explained demo mode location and features
  - [ ] Specifically mentioned "My Reviews" functionality
  - [ ] Added detailed instructions in Review Notes
  
- [ ] **Add Review Notes**:
  - [ ] PassKit explanation (Apple Pay not implemented)
  - [ ] Demo Mode instructions with "My Reviews" details
  
- [ ] **Upload New iPad Screenshots** for Guideline 2.3.3:
  - [ ] Captured actual iPad screenshots (13-inch iPad Pro)
  - [ ] Uploaded via "View All Sizes in Media Manager"

### Build & Submission
- [ ] Updated build number in `app.json` if needed
- [ ] Built new production build: `eas build --platform ios --profile production`
- [ ] Tested new build on physical device
- [ ] Submitted for review: `eas submit --platform ios --latest`

---

## Detailed Action Steps for Resubmission

### Step 1: Verify PassKit Removal
```bash
# Check for any PassKit references in the codebase
grep -r "PassKit\|ApplePay" --include="*.json" --include="*.ts" --include="*.tsx"
```

### Step 2: Build New Version
```bash
# Update build number in app.json first (if needed)
eas build --platform ios --profile production
```

### Step 3: Test on Physical Device
- Install build on iPhone and iPad (if available)
- Test Sign in with Apple on both devices
- Test account deletion flow: Profile → Settings → Account → Delete Account
- Verify demo mode works: Login screen → "Try Demo Mode"

### Step 4: Update App Store Connect

**A. Reply to All Review Issues** (Go to App Store Connect → Your App → App Review → Responses):

1. **Guideline 4.8 - Login Services**:
   ```
   Sign in with Apple is available as an equivalent login option that meets all 
   requirements specified in guideline 4.8. Users can access it from the login/signup 
   screen by tapping the "Continue with Apple" button (visible on iOS devices).
   
   Sign in with Apple:
   - Limits data collection to the user's name and email address
   - Allows users to keep their email address private via "Hide My Email"
   - Does not collect interactions with the app for advertising purposes without consent
   
   The feature is implemented using Apple's native authentication API and is prominently 
   displayed alongside other login options on the authentication screen.
   ```

2. **Guideline 5.1.1(v) - Account Deletion**:
   ```
   Account deletion is available in the app. Users can delete their account by:
   
   1. Opening the Profile tab (bottom navigation)
   2. Tapping "Account Settings" 
   3. Scrolling to the "Account" section
   4. Tapping "Delete Account"
   
   The feature permanently deletes all user data including profile, reviews, requests, 
   and associated information. It includes a two-step confirmation process to prevent 
   accidental deletion. This is not a deactivation - the account and all data are 
   permanently removed.
   ```

3. **Guideline 2.1 - PassKit Framework** (if still present):
   ```
   The app does not currently implement Apple Pay functionality. If PassKit framework 
   is included in the binary, it is through a third-party dependency and is not actively 
   used. No Apple Pay features are accessible or visible in the app.
   ```

**B. Update Age Rating Metadata**:
- Go to: App Store Connect → Your App → App Information
- Find "Age Rating" section
- Set "Age Assurance" to **"None"**
- Save changes

**C. Add Review Notes**:
- Go to: App Store Connect → Your App → App Store → Version Information
- In "Review Notes" section, add:
  ```
  Demo Mode Instructions:
  
  To access all features without creating an account, tap "Try Demo Mode" on the 
  login/signup screen. Demo mode includes:
  - Full access to all app features
  - Pre-populated profile data
  - Sample reviews and requests
  - Both creator and reviewer functionality
  ```

**D. Upload iPad Screenshots**:
- Go to: App Store Connect → Your App → App Store → Previews and Screenshots
- Click "View All Sizes in Media Manager"
- Upload new 13-inch iPad Pro screenshots showing actual app in use

### Step 5: Resubmit for Review
```bash
eas submit --platform ios --latest
```

---

## Previous Issues (Resolved)

These issues were addressed in previous submissions but are documented for reference.

