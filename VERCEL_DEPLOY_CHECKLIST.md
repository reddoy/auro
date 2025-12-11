# Vercel Deployment Checklist - Fix Avatar Loading

## ✅ What We Verified
- Files exist in Supabase Storage ✅
- Signed URLs work with service role ✅
- Code is correct ✅

## 🔧 What Needs to Happen

### Step 1: Set Environment Variable in Vercel

1. Go to https://vercel.com/dashboard
2. Find your project (likely `auro-site` or similar)
3. Go to **Settings** → **Environment Variables**
4. Add/Update this variable:
   - **Name**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Value**: `REDACTED_SERVICE_ROLE_KEY`
   - **Environment**: Production, Preview, Development (check all)
5. Click **Save**

### Step 2: Deploy to Vercel

**Option A: Via Vercel Dashboard (Easiest)**
1. Go to **Deployments** tab
2. Find the latest deployment
3. Click **⋯** (three dots) → **Redeploy**
4. Wait 2-3 minutes for deployment to complete

**Option B: Via Git Push (If connected)**
```bash
cd /Users/rohanomalley/Desktop/auro
git add site/app/api/storage/signed-view/route.ts
git commit -m "Fix avatar signing endpoint"
git push
# Vercel will auto-deploy
```

**Option C: Via Vercel CLI**
```bash
cd /Users/rohanomalley/Desktop/auro/site
npm install -g vercel  # if not installed
vercel --prod
```

### Step 3: Verify Deployment

After deployment completes:
1. Check Vercel logs for any errors
2. Test the endpoint manually:
   ```bash
   curl "https://www.appauro.com/api/storage/signed-view?path=temp-uploads/reviewer-signup-1765243815450/avatar/1765243815989_bzvqhn5rn5q.jpeg&bucket=avatars"
   ```
   Should return: `{"url":"https://zxazjbduiistnfstnwka.supabase.co/storage/v1/object/sign/..."}`

### Step 4: Test in App

1. Wait 2-3 minutes after deployment
2. **Restart your Expo app** (fully close and reopen)
3. Navigate to "Discover Reviewers" page
4. Avatars should now load! 🎉

## 🔍 Troubleshooting

If avatars still don't load after deployment:

1. **Check Vercel Function Logs**:
   - Go to Vercel Dashboard → Your Project → Functions
   - Click on `/api/storage/signed-view`
   - Check for errors

2. **Verify Environment Variable**:
   - Go to Settings → Environment Variables
   - Make sure `SUPABASE_SERVICE_ROLE_KEY` is set for Production

3. **Test Endpoint Directly**:
   ```bash
   curl "https://www.appauro.com/api/storage/signed-view?path=temp-uploads/reviewer-signup-1765243815450/avatar/1765243815989_bzvqhn5rn5q.jpeg&bucket=avatars"
   ```
   - If it returns an error, check Vercel logs
   - If it returns a URL, test that URL in browser

## 📝 Additional Environment Variables to Check

Make sure these are also set in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL` = `https://zxazjbduiistnfstnwka.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` = (the key above)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (your anon key from app.json)

