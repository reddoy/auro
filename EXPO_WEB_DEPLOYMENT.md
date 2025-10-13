# Deploy Auro Expo Web App to Vercel

Your Expo app has web support enabled. Here's how to deploy it:

## 🚀 Quick Deploy (Recommended)

### Step 1: Export Web Build

```bash
# From the root directory (C:\Users\rohan\OneDrive\Desktop\auro)
npx expo export --platform web
```

This creates a `dist/` folder with your static web app.

### Step 2: Deploy to Vercel

You have two options:

#### Option A: Deploy via Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Git Repository"
3. Select your repo
4. **Configure settings:**
   - **Root Directory**: Leave blank (or set to root)
   - **Framework Preset**: Other
   - **Build Command**: `npx expo export --platform web`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

5. **Add Environment Variables:**
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://zxazjbduiistnfstnwka.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc... (your key)
   EXPO_PUBLIC_STRIPE_KEY=pk_live_...
   ```

6. Click **Deploy**

#### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# From root directory
vercel

# When prompted:
# - Build Command: npx expo export --platform web
# - Output Directory: dist
# - Install Command: npm install

# Deploy to production
vercel --prod
```

### Step 3: Set Custom Domain

In Vercel Dashboard:
1. Go to your project → **Settings** → **Domains**
2. Add domain: `app.appauro.com`
3. Update DNS:
   - Type: `CNAME`
   - Name: `app`
   - Value: `cname.vercel-dns.com`

---

## 📋 Alternative: Use Expo Hosting (EAS Update)

Expo also has hosting capabilities:

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build for web
eas build --platform web

# Or use EAS Update for instant deployments
eas update --branch production --message "Initial web deploy"
```

---

## 🔧 Configuration Files

### Create `vercel.json` in root:

```json
{
  "buildCommand": "npx expo export --platform web",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": null,
  "regions": ["iad1"],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

### Update `app.json`:

Make sure your `web` config is set:

```json
{
  "expo": {
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    }
  }
}
```

---

## 🔄 Continuous Deployment

### Automatic Deployment (Recommended)

Once set up, Vercel will automatically:
- Deploy on every push to `main`
- Create preview deployments for PRs

### Update `package.json` scripts:

```json
{
  "scripts": {
    "start": "expo start",
    "web": "expo start --web",
    "build:web": "npx expo export --platform web",
    "deploy": "npx expo export --platform web && vercel --prod"
  }
}
```

Now you can deploy with: `npm run deploy`

---

## 🧪 Test Locally First

Before deploying:

```bash
# Run web version locally
npm run web

# Or
npx expo start --web
```

Visit http://localhost:8081

---

## 🔐 Environment Variables

Your Expo app uses `expo-constants` to access env vars. Make sure these are set in Vercel:

```
EXPO_PUBLIC_SUPABASE_URL=https://zxazjbduiistnfstnwka.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
EXPO_PUBLIC_STRIPE_KEY=pk_live_...
```

Note: Expo uses `EXPO_PUBLIC_` prefix for public env vars (not `NEXT_PUBLIC_`).

---

## 📱 Update Supabase Auth URLs

After deployment, add your web app URL to Supabase:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **Authentication** → **URL Configuration**
3. Add:
   - **Site URL**: `https://app.appauro.com`
   - **Redirect URLs**:
     ```
     https://app.appauro.com/**
     http://localhost:8081/**
     ```

---

## 🐛 Troubleshooting

### Build fails on Vercel
- Check that `npx expo export --platform web` works locally first
- Ensure all dependencies are in `package.json`
- Check Vercel build logs for specific errors

### Blank screen after deployment
- Check browser console for errors
- Verify environment variables are set
- Check that `dist/index.html` exists

### Assets not loading
- Ensure asset paths are correct
- Check that assets are in `assets/` folder
- Verify `web-build/` includes all assets

### Authentication not working
- Update Supabase redirect URLs
- Check environment variables
- Verify CORS settings in Supabase

---

## 📊 Deployment Checklist

- [ ] Test web build locally: `npx expo export --platform web`
- [ ] Deploy to Vercel
- [ ] Set up custom domain: `app.appauro.com`
- [ ] Add environment variables in Vercel
- [ ] Update Supabase redirect URLs
- [ ] Update marketing site Sign In button (already done! ✅)
- [ ] Test authentication flow
- [ ] Test payment flow
- [ ] Test on mobile browsers

---

## 🎯 Your Architecture

```
www.appauro.com (Marketing site - site/ folder)
    ↓
   [Sign In Button]
    ↓
app.appauro.com (Expo Web App - app/ folder)
    ↓
   [Auth, Reviews, Payments]
```

---

## 🚀 Ready to Deploy?

Run these commands:

```bash
# Test locally first
npx expo start --web

# Export web build
npx expo export --platform web

# Deploy to Vercel (from root directory)
vercel --prod
```

Your web app will be live at: `https://app.appauro.com` 🎉

