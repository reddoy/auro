# How to Get Your App Store Shared Secret

The App Store Shared Secret is used to verify in-app purchase receipts with Apple. Here's how to get it:

## Steps

1. **Go to App Store Connect**
   - Visit: https://appstoreconnect.apple.com
   - Sign in with your Apple Developer account

2. **Navigate to Your App**
   - Click on "My Apps"
   - Select your app (Auro)

3. **Go to App Information**
   - Click on your app
   - In the left sidebar, click "App Information"

4. **Find the Shared Secret**
   - Scroll down to the "App Store Server Notifications" section
   - Look for "Shared Secret" or "App-Specific Shared Secret"
   - Click "Generate" if you don't have one yet
   - Copy the secret (it looks like: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`)

5. **Add to Environment Variables**
   - Add this to your `.env` file (local development):
     ```
     APP_STORE_SHARED_SECRET=your_secret_here
     ```
   - Add to your hosting platform (Vercel/Netlify/etc.) environment variables
   - **IMPORTANT:** Never commit this secret to git!

## What It's Used For

The shared secret is sent to Apple when verifying receipts. It helps:
- Prevent unauthorized receipt verification
- Improve security
- Allow Apple to verify you're the app owner

## Optional but Recommended

While the shared secret is optional, Apple recommends using it for better security. If you don't set it, the verification will still work, but it's less secure.

## Environment Variable

Add this to your production environment:
```
APP_STORE_SHARED_SECRET=your_secret_from_app_store_connect
```

## Testing

- **Sandbox receipts** will work even without the shared secret
- **Production receipts** work better with the shared secret
- The code automatically handles both sandbox and production environments
