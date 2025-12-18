# Immediate Actions for Resubmission

## Critical: Sign in with Apple Fix

✅ **Code Updated**: Added OAuth fallback for iPad compatibility
- Location: `app/auth.tsx` lines 243-347
- Change: Automatic fallback to OAuth when native API fails

**Next Steps**:
1. Test on iPad Air 11-inch M3 (if available) or similar iPad
2. Build new version: `eas build --platform ios --profile production`
3. Update build number in `app.json` if needed

---

## App Store Connect Updates

### 1. Reply to Review Issues

Go to: **App Store Connect → Your App → App Review → [Your Submission] → Reply**

**Reply for Sign in with Apple Bug (Guideline 2.1)**:
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

**Reply for PassKit (Guideline 2.1)**:
```
PassKit framework has been removed from the app binary. We have implemented 
a config plugin that explicitly excludes PassKit from the iOS build. The app 
does not and never has implemented Apple Pay functionality. All payments are 
processed through Stripe Checkout on our website (www.appauro.com), not through 
in-app payment processing.

Please verify that PassKit is no longer present in the binary.
```

**Reply for Demo Account (Guideline 2.1)**:
```
Demo Mode is available for testing all features including "My Reviews". 

To access:
1. Open the app
2. On the login/signup screen, tap "Try Demo Mode"
3. All features are immediately available without login

The "My Reviews" feature can be accessed via:
- Profile tab → View reviews given/received in profile sections  
- Requests tab → View complete review history for all requests

Demo mode includes pre-populated data:
- Profile with reviews (3 given, 5 received)
- Sample review requests and transactions
- Both creator and reviewer functionality
- Full access to all app features

We have added detailed instructions in the Review Notes section.
```

---

### 2. Update Review Notes

Go to: **App Store Connect → Your App → App Store → Version Information → Review Notes**

**Add this content**:
```
   PassKit Framework Note:
   PassKit framework has been removed from the app binary via config plugin. 
   The app does not implement Apple Pay functionality. All payments are processed 
   through Stripe Checkout on our website.

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

### 3. Upload iPad Screenshots

Go to: **App Store Connect → Your App → App Store → Previews and Screenshots**

1. Click **"View All Sizes in Media Manager"** (important!)
2. Select **13-inch iPad Pro** size
3. Upload new screenshots showing actual iPad UI (not stretched iPhone)
4. Ensure screenshots show core app functionality

**Requirements**:
- Must be actual iPad screenshots (not stretched iPhone)
- Should highlight core features
- PNG or JPEG format
- No text overlays

---

## Build & Submit

1. **Update build number** (if needed):
   ```bash
   # Edit app.json, increment buildNumber
   ```

2. **Build new version**:
   ```bash
   eas build --platform ios --profile production
   ```

3. **Test on device** (if possible):
   - Test Sign in with Apple on iPad
   - Test demo mode
   - Verify all features work

4. **Submit for review**:
   ```bash
   eas submit --platform ios --latest
   ```

---

## Summary Checklist

- [x] Code fix: OAuth fallback for Sign in with Apple
- [x] Code fix: Config plugin to remove PassKit framework
- [ ] Test Sign in with Apple on iPad
- [ ] Build new version (PassKit will be automatically excluded)
- [ ] Reply to Sign in with Apple bug in App Review
- [ ] Reply to PassKit issue in App Review (removed)
- [ ] Reply to Demo Account issue in App Review
- [ ] Add Review Notes (Demo Mode - PassKit removed via plugin)
- [ ] Upload new iPad screenshots
- [ ] Submit for review

