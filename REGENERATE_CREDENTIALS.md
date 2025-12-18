# Regenerate Provisioning Profile with Sign in with Apple

## Option 1: Use EAS Dashboard (Recommended - Easiest)

1. Go to: https://expo.dev/accounts/reddoy/projects/auro/credentials
2. Click on **"com.auro.app"** under iOS bundle identifiers
3. You should see the App Identifier and Provisioning Profile
4. Click **"Edit"** on the App Identifier
5. Make sure **"Sign in with Apple"** capability is checked/enabled
6. Save the changes
7. Click **"Regenerate"** or **"Update"** on the Provisioning Profile
8. This will create a new profile with Sign in with Apple capability
9. Build again: `eas build --platform ios --profile production`

## Option 2: Use EAS CLI with Apple Account Login

Run the build with Apple account access so EAS can automatically fix it:

```bash
eas build --platform ios --profile production
```

When prompted:
- **"Do you want to log in to your Apple account?"** → Answer **Yes (Y)**
- EAS will detect that Sign in with Apple is needed and automatically:
  - Update the app identifier to include the capability
  - Regenerate the provisioning profile

## Option 3: Manual via Apple Developer Portal

1. Go to https://developer.apple.com/account
2. Navigate to Certificates, Identifiers & Profiles
3. Find your App ID: **com.auro.app**
4. Edit it and enable **"Sign in with Apple"** capability
5. Go to Profiles section
6. Find your App Store provisioning profile
7. Edit it and select the updated App ID
8. Download and regenerate the profile
9. EAS should pick it up on next build

## What's Wrong

- Your provisioning profile was created **before** Sign in with Apple was enabled
- The profile doesn't include the `com.apple.developer.applesignin` entitlement
- We need a new profile that includes this capability

## Recommendation

**Use Option 1** (EAS Dashboard) - it's the easiest and will automatically update everything.


