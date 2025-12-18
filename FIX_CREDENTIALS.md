# Fix Sign in with Apple Credentials

The build is failing because the provisioning profile doesn't include Sign in with Apple capability.

## Quick Fix

Run these commands to regenerate credentials:

```bash
# 1. Configure iOS credentials and enable Sign in with Apple
eas credentials

# When prompted:
# - Select "iOS"
# - Select "Set up credentials for production"
# - EAS should detect that Sign in with Apple is enabled in app.json
# - It will regenerate the provisioning profile with the capability

# OR manually regenerate:

# 2. Delete old provisioning profile (optional - EAS will regenerate)
eas credentials -p ios

# Select your bundle identifier, then select provisioning profile
# Choose to regenerate it

# 3. Build again
eas build --platform ios --profile production
```

## Alternative: Use EAS Dashboard

1. Go to https://expo.dev/accounts/reddoy/projects/auro/credentials
2. Click on your iOS bundle identifier (com.auro.app)
3. Click "Edit" on the App Identifier
4. Make sure "Sign in with Apple" capability is enabled
5. Regenerate the provisioning profile
6. Build again

## What's Happening

- `app.json` has `"usesAppleSignIn": true` ✅
- `expo-apple-authentication` plugin is installed ✅
- But the provisioning profile was created before this capability was enabled ❌
- Need to regenerate the profile with the capability enabled


