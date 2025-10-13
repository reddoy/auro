# Deploying Auro Web App to Vercel

## Prerequisites
- A Vercel account (sign up at https://vercel.com)
- Your Supabase credentials
- Your Stripe API keys (if using payments)

## Step 1: Install Vercel CLI (Optional but recommended)

```bash
npm install -g vercel
```

## Step 2: Deploy via Vercel Dashboard (Easiest Method)

### Option A: Deploy via Vercel Dashboard

1. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**

2. **Click "Add New" → "Project"**

3. **Import your Git repository**
   - If your code is on GitHub/GitLab/Bitbucket, connect your account
   - Select your repository
   - Vercel will auto-detect that this is a Next.js project

4. **Configure Project**
   - **Framework Preset**: Next.js (should be auto-detected)
   - **Root Directory**: `site` (IMPORTANT: since your Next.js app is in the site folder)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

5. **Add Environment Variables**
   Click "Environment Variables" and add these (get values from your Supabase and Stripe dashboards):
   
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... or pk_test_...
   STRIPE_SECRET_KEY=sk_live_... or sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

6. **Click "Deploy"**

### Option B: Deploy via Vercel CLI

1. **Navigate to your site folder**
   ```bash
   cd site
   ```

2. **Run Vercel deploy**
   ```bash
   vercel
   ```

3. **Follow the prompts**
   - Link to existing project or create new one
   - Set up project settings
   
4. **Add environment variables**
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
   vercel env add STRIPE_SECRET_KEY
   vercel env add STRIPE_WEBHOOK_SECRET
   ```

5. **Deploy to production**
   ```bash
   vercel --prod
   ```

## Step 3: Configure Your Custom Domain (Optional)

1. In Vercel Dashboard, go to your project → **Settings** → **Domains**
2. Add your custom domain (e.g., `app.auro.com` or `auro.com`)
3. Follow Vercel's instructions to update your DNS records

## Step 4: Update Supabase Redirect URLs

After deployment, you need to update your Supabase authentication redirect URLs:

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **Authentication** → **URL Configuration**
3. Add your Vercel deployment URL to:
   - **Site URL**: `https://your-app.vercel.app` or your custom domain
   - **Redirect URLs**: Add these:
     - `https://your-app.vercel.app/auth/callback`
     - `https://your-app.vercel.app/**` (wildcard for all routes)
     - If using custom domain, add those URLs too

## Step 5: Configure Stripe Webhooks (If using payments)

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Set endpoint URL: `https://your-app.vercel.app/api/stripe/webhook`
4. Select events to listen to (e.g., `checkout.session.completed`, `payment_intent.succeeded`)
5. Copy the webhook secret and add it to Vercel environment variables

## Step 6: Test Your Deployment

1. Visit your deployed URL
2. Test the "Get Reviewed" button in the navigation
3. Test the "Become Founding Reviewer" flow
4. Verify authentication works
5. Test payment flow (if applicable)

## Continuous Deployment

Vercel automatically sets up continuous deployment:
- Every push to your `main`/`master` branch triggers a production deployment
- Pull requests create preview deployments
- You can configure which branch to use in Vercel settings

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify TypeScript types are correct

### Environment Variables Not Working
- Make sure variables are prefixed with `NEXT_PUBLIC_` for client-side access
- Redeploy after adding environment variables
- Check variable names match exactly

### Authentication Issues
- Verify Supabase redirect URLs include your Vercel domain
- Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set correctly
- Make sure cookies are enabled

### API Routes Failing
- Check function logs in Vercel dashboard
- Verify serverless function timeout limits
- Ensure environment variables are set for server-side routes

## Quick Deploy Button (For README)

You can add this to your README for one-click deployment:

```markdown
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/your-repo&project-name=auro&root-directory=site&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,STRIPE_SECRET_KEY)
```

## Need Help?

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)

