# Deploy to Vercel - Fix Avatar Loading

## The Issue
The server-side signing endpoint (`/api/storage/signed-view`) on Vercel is outdated. This endpoint is critical for signing avatar URLs, so it needs to be deployed with the latest code.

## Quick Deploy

### Option 1: Vercel CLI (Fastest)
```bash
cd /Users/rohanomalley/Desktop/auro/site
vercel --prod
```

### Option 2: Git Push (If connected to Vercel)
```bash
cd /Users/rohanomalley/Desktop/auro
git add site/app/api/storage/signed-view/route.ts
git commit -m "Fix avatar signing endpoint"
git push
# Vercel will auto-deploy if connected to your repo
```

### Option 3: Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Find your project (likely `auro-site` or similar)
3. Click "Deployments" → "Redeploy" latest deployment
   OR
4. Connect your repo and push changes

## What This Fixes

The updated `signed-view` endpoint:
- ✅ Uses service role (bypasses policies)
- ✅ Handles directory paths correctly
- ✅ Better error logging
- ✅ Works with `temp-uploads/` structure

## After Deploying

1. Wait for deployment to complete (~2-3 minutes)
2. Restart your Expo app
3. Check the "Discover Reviewers" page
4. Avatars should now load! 🎉

## Also Apply Storage Policies

Don't forget to also apply the storage policies migration in Supabase:
- Go to Supabase Dashboard → SQL Editor
- Run `supabase/migrations/20251209_02_fix_avatar_storage_policies_safe.sql`

Both fixes are needed:
1. ✅ Deploy to Vercel (fixes server-side signing)
2. ✅ Apply Supabase policies (allows client-side access)

