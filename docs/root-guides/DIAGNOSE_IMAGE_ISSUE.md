# Diagnosing Image Loading Issues

## Current Situation

You've set `SUPABASE_SERVICE_ROLE_KEY` in Vercel, but images still aren't showing. Here's how to diagnose:

## Step 1: Check Vercel Function Logs

1. Go to your Vercel dashboard
2. Navigate to your project → Functions tab
3. Look for `/api/storage/signed-view` function calls
4. Check for errors in the logs:
   - If you see "Server not configured" → the key isn't being read
   - If you see "File not found" → files don't exist at those paths
   - If you see "Error creating signed URL" → check the error details

## Step 2: Test the Endpoint Directly

Open your browser console and try:

```javascript
// Replace with an actual avatar path from your database
const testPath = 'users/some-user-id/avatar/image.jpg';
const url = `https://www.appauro.com/api/storage/signed-view?path=${encodeURIComponent(testPath)}&bucket=avatars`;
fetch(url).then(r => r.json()).then(console.log).catch(console.error);
```

This will show you exactly what the API is returning.

## Step 3: Verify Files Exist in Supabase

1. Go to Supabase Dashboard → Storage → `avatars` bucket
2. Check if files exist at the paths stored in your database
3. If files are missing, that's why signed URLs fail to load

## Step 4: Check Environment Variable Name

Make sure in Vercel you set:
- Variable name: `SUPABASE_SERVICE_ROLE_KEY` (exact, case-sensitive)
- Value: Your service role key from Supabase (starts with `eyJ...`)

## Step 5: Redeploy After Setting Environment Variables

After setting/changing environment variables in Vercel, you MUST redeploy:
1. Go to Deployments tab
2. Click "..." on the latest deployment
3. Click "Redeploy"

## Common Issues

### Issue: Signed URLs generated but fail to load
**Cause**: Files don't exist at those paths (see `AVATAR_RECOVERY_INFO.md`)
**Solution**: Reviewers need to re-upload their avatars

### Issue: "Server not configured" error
**Cause**: `SUPABASE_SERVICE_ROLE_KEY` not set or wrong name
**Solution**: Verify in Vercel dashboard → Settings → Environment Variables

### Issue: "Error creating signed URL" with permission error
**Cause**: Service role key doesn't match your Supabase project
**Solution**: Get the correct key from Supabase Dashboard → Settings → API

## What Changed

I've added better error logging to help diagnose:
- The API endpoint now logs more details about what's happening
- The Avatar component shows less noisy errors in production
- Better error messages to identify the root cause

