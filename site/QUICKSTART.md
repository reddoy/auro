# Quick Start: Deploy Auro to Vercel in 5 Minutes

## 🚀 Fastest Way to Deploy

### Method 1: Vercel Dashboard (Recommended)

1. **Go to [vercel.com/new](https://vercel.com/new)**

2. **Import your Git repository**
   - Click "Import Git Repository"
   - Select your repository
   - If not connected, link your GitHub/GitLab account

3. **IMPORTANT: Set Root Directory**
   - Click "Edit" next to "Root Directory"
   - Set it to: `site`
   - This is crucial since your Next.js app is in the site folder!

4. **Add Environment Variables**
   Click "Add" under Environment Variables and add these:
   
   | Name | Value | Where to Find |
   |------|-------|---------------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Supabase Dashboard → Settings → API |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGc...` | Supabase Dashboard → Settings → API → anon/public key |
   | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` or `pk_live_...` | Stripe Dashboard → Developers → API Keys |
   | `STRIPE_SECRET_KEY` | `sk_test_...` or `sk_live_...` | Stripe Dashboard → Developers → API Keys |
   | `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Set this up after deployment (see below) |

5. **Click Deploy** 🎉

Your app will be live in ~2 minutes at `https://your-app.vercel.app`

---

### Method 2: Vercel CLI (For Power Users)

```bash
# Install Vercel CLI globally
npm install -g vercel

# Navigate to your site directory
cd site

# Deploy
vercel

# Follow the prompts and deploy to production
vercel --prod
```

---

## 🔧 Post-Deployment Configuration

### 1. Update Supabase Auth URLs

After deployment, you **must** update Supabase to allow authentication from your new domain:

1. Go to [Supabase Dashboard](https://app.supabase.com) → Your Project
2. Click **Authentication** → **URL Configuration**
3. Update these fields:
   - **Site URL**: `https://your-app.vercel.app` (your Vercel URL)
   - **Redirect URLs**: Add these (one per line):
     ```
     https://your-app.vercel.app/**
     http://localhost:3000/**
     ```

### 2. Set Up Stripe Webhooks (If Using Payments)

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/webhooks)
2. Click **Add endpoint**
3. Enter: `https://your-app.vercel.app/api/stripe/webhook`
4. Select events: `checkout.session.completed`, `payment_intent.succeeded`
5. Copy the **Signing secret** (starts with `whsec_`)
6. Go to Vercel → Your Project → Settings → Environment Variables
7. Add `STRIPE_WEBHOOK_SECRET` with the signing secret value
8. Redeploy (Vercel → Deployments → ⋯ → Redeploy)

---

## ✅ Test Your Deployment

1. Visit your Vercel URL
2. Click **"Get Reviewed"** button in the navigation
3. Try the authentication flow
4. Test the payment flow (if applicable)

---

## 🎯 Custom Domain Setup (Optional)

Want to use your own domain like `app.auro.com`?

1. Go to Vercel → Your Project → **Settings** → **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `auro.com` or `app.auro.com`)
4. Follow Vercel's DNS configuration instructions
5. Update Supabase redirect URLs to include your custom domain

---

## 🔄 Continuous Deployment

Vercel automatically deploys:
- **Production**: Every push to `main`/`master` branch
- **Preview**: Every pull request gets its own preview URL

---

## 🐛 Common Issues & Fixes

### "Build Failed"
- Check build logs in Vercel dashboard
- Make sure you set **Root Directory** to `site`
- Verify all environment variables are set

### "Authentication not working"
- Did you update Supabase redirect URLs?
- Check that environment variables are set correctly
- Try clearing cookies and testing in incognito mode

### "API routes returning 500"
- Check function logs in Vercel → Functions
- Verify server-side environment variables (without `NEXT_PUBLIC_` prefix) are set
- Check Supabase service role key if using admin operations

### "Environment variables not updating"
- After changing environment variables, you must **redeploy**
- Go to Vercel → Deployments → ⋯ (three dots) → Redeploy

---

## 📱 Local Development

To run locally:

```bash
cd site
npm install
npm run dev
```

Visit http://localhost:3000

Make sure you have a `.env.local` file with your environment variables (don't commit this file!).

---

## 🆘 Need Help?

- **Vercel Support**: https://vercel.com/support
- **Next.js Docs**: https://nextjs.org/docs
- **Supabase Docs**: https://supabase.com/docs

---

## 🎉 You're Live!

Once deployed, your app will be accessible at:
- Vercel URL: `https://your-app.vercel.app`
- Custom domain (if configured): `https://your-domain.com`

Users can now:
- Click **"Get Reviewed"** to request a profile review
- Click **"Become Founding Reviewer"** to sign up as a reviewer
- Access the full Auro web app!

**Happy launching! 🚀**

