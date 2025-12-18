# Apple App Store Review Response Templates

Use these response templates when replying to App Review in App Store Connect.

## Guideline 4.8 - Login Services

**Subject**: Sign in with Apple Available as Equivalent Login Option

**Response**:
```
Sign in with Apple is available as an equivalent login option that meets all 
requirements specified in guideline 4.8. Users can access it from the login/signup 
screen by tapping the "Continue with Apple" button (visible on iOS devices).

Sign in with Apple:
- Limits data collection to the user's name and email address
- Allows users to keep their email address private via "Hide My Email"
- Does not collect interactions with the app for advertising purposes without consent

The feature is implemented using Apple's native authentication API (expo-apple-authentication) 
and is prominently displayed alongside other login options on the authentication screen.
```

---

## Guideline 5.1.1(v) - Account Deletion

**Subject**: Account Deletion Feature Location

**Response**:
```
Account deletion is available in the app. Users can delete their account by:

1. Opening the Profile tab (bottom navigation bar)
2. Tapping "Account Settings" (gear icon)
3. Scrolling to the "Account" section
4. Tapping "Delete Account"

The feature permanently deletes all user data including profile, reviews, requests, 
and associated information. It includes a two-step confirmation process to prevent 
accidental deletion. This is not a deactivation - the account and all data are 
permanently removed from our systems.
```

---

## Guideline 2.1 - PassKit Framework

**Subject**: PassKit Framework Removed from Binary

**Response**:
```
PassKit framework has been removed from the app binary. We have implemented 
a config plugin that explicitly excludes PassKit from the iOS build. The app 
does not and never has implemented Apple Pay functionality. All payments are 
processed through Stripe Checkout on our website (www.appauro.com), not through 
in-app payment processing.

Please verify that PassKit is no longer present in the binary.
```

---

## Guideline 2.1 - Sign in with Apple Bug (iPad)

**Subject**: Sign in with Apple Fix - OAuth Fallback Added

**Response**:
```
We have fixed the Sign in with Apple issue on iPad by implementing an automatic 
fallback to OAuth flow when the native API encounters issues. The app now:

1. First attempts native Apple Sign In (faster and more reliable)
2. Automatically falls back to OAuth flow if native sign-in fails
3. Provides better error handling and user feedback

This ensures Sign in with Apple works reliably across all iOS devices, including 
iPad Air 11-inch M3. The fix has been tested and is included in this build.

Please test Sign in with Apple on the iPad Air 11-inch M3 device. The app will 
automatically use the appropriate authentication method.
```

---

## Review Notes (Add to Version Information)

**Location**: App Store Connect → Your App → App Store → Version Information → Review Notes

**Content**:
```
PassKit Framework Note:
The app does not implement Apple Pay functionality. If PassKit framework is 
included in the binary, it is through a third-party dependency and is not 
actively used. No Apple Pay features are accessible in the app.

Demo Mode Instructions:

To access all features including "My Reviews", tap "Try Demo Mode" on the 
login/signup screen. Demo mode includes:
- Full access to all app features
- Pre-populated profile with reviews (3 given, 5 received)
- Sample reviews visible in Profile tab and Requests tab
- Both creator and reviewer functionality
- Transaction history and review history
- No login credentials required

The "My Reviews" feature can be accessed via:
- Profile tab → View reviews given/received in profile sections
- Requests tab → View complete review history for all requests
```

---

## Guideline 3.1.1 - Business - Payments - In-App Purchase

**Subject**: Paid Content Access Blocked on iOS

**Response**:
```
The iOS app does not provide access to paid digital content (reviews) that was 
purchased outside the app. Per Apple Guideline 3.1.1, since we do not offer in-app 
purchases, the iOS app blocks access to any paid review content.

Implementation details:
- The iOS app detects when a user attempts to access a paid review (any review 
  with amount_cents > 0)
- When a paid review is accessed on iOS, users are automatically redirected to 
  view the content on our website (www.appauro.com) via Safari
- The iOS app only displays free content or content that does not involve payments
- All purchases must be made through our website, and paid content must be viewed 
  on the website

This ensures compliance with Guideline 3.1.1 by preventing the iOS app from 
accessing paid digital content that isn't available via in-app purchase.
```

---

## Quick Reference - Feature Locations

- **Sign in with Apple**: Login/Signup screen → "Continue with Apple" button
- **Account Deletion**: Profile Tab → Account Settings → Account section → "Delete Account"
- **Demo Mode**: Login/Signup screen → "Try Demo Mode" button

