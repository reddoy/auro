# Google Authentication Setup Guide

## Issues Fixed

1. **Supabase Client Configuration**: Updated `site/lib/supabase.ts` to enable proper session persistence and auto-refresh
2. **OAuth Redirect Handling**: Created proper callback handler at `/auth/callback`
3. **Environment Variables**: Standardized environment variable usage across the application

## Required Environment Variables

Make sure these are set in your `.env` file in the `site/` directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Supabase Dashboard Configuration

1. **Authentication Settings**:
   - Go to Authentication > Settings
   - Set **Site URL** to your production domain (e.g., `https://www.appauro.com`)
   - Add **Redirect URLs**:
     - `https://your-project.supabase.co/auth/v1/callback`
     - `http://localhost:3000/auth/callback` (for development)

2. **Google OAuth Provider**:
   - Go to Authentication > Providers
   - Enable Google provider
   - Add your Google OAuth credentials

## Google Cloud Console Configuration

1. **OAuth 2.0 Client ID**:
   - Go to Google Cloud Console > APIs & Services > Credentials
   - Create or edit your OAuth 2.0 Client ID
   - **Authorized redirect URIs** should include:
     - `https://your-project.supabase.co/auth/v1/callback`
   - **Authorized JavaScript origins** should include:
     - Your production domain
     - `http://localhost:3000` (for development)

## Testing the Flow

1. Start your development server: `npm run dev`
2. Navigate to `/request` and try the Google sign-in
3. You should be redirected to Google, then back to `/auth/callback`, and finally to `/request`
4. Check browser console for any errors

## Common Issues

- **"Invalid redirect URI"**: Check Google Cloud Console redirect URIs
- **"Site URL mismatch"**: Update Supabase Site URL setting
- **Session not persisting**: Ensure `persistSession: true` in Supabase client config
- **Environment variables not loading**: Restart your development server after updating `.env`

## Debugging

Check the browser console and network tab for:
- OAuth redirect URLs
- Session tokens
- Any CORS or authentication errors

The callback handler at `/auth/callback` will show loading, success, or error states to help debug issues.
