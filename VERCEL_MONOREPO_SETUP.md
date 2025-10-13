# Vercel Monorepo Setup Guide

## Your Repository Structure

```
auro/
├── site/                  ← Next.js Marketing Site
│   ├── app/
│   ├── components/
│   ├── package.json
│   ├── vercel.json
│   └── .vercelignore      ← Ignores Expo files
│
├── app/                   ← Expo React Native App (with web support)
├── assets/
├── components/
├── lib/
├── package.json
├── vercel.json            ← Config for Expo web export
└── .vercelignore          ← Ignores site/ files
```

---

## Two Vercel Projects (Same Git Repo)

### **Project 1: Marketing Site** 🌐
- **Name**: `auro-site` (or current name)
- **Domain**: `www.appauro.com`
- **Root Directory**: `site`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Framework**: Next.js
- **Status**: ✅ Already deployed

### **Project 2: Web App** 📱
- **Name**: `auro-app` (or whatever you choose)
- **Domain**: `app.appauro.com`
- **Root Directory**: (leave blank - builds from root)
- **Build Command**: `npx expo export --platform web`
- **Output Directory**: `dist`
- **Framework**: Other
- **Status**: ⏳ Needs to be created

---

## How to Deploy the Web App

### Option 1: Via Vercel Dashboard (Recommended)

1. **Go to**: https://vercel.com/new

2. **Import Git Repository**: Select the SAME repo again

3. **Configure Project**:
   ```
   Project Name: auro-app
   Root Directory: (leave blank)
   Framework: Other
   Build Command: npx expo export --platform web
   Output Directory: dist
   Install Command: npm install
   ```

4. **Environment Variables**:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://zxazjbduiistnfstnwka.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   ```

5. **Deploy** → Click "Deploy"

6. **Add Domain**:
   - Go to: Project Settings → Domains
   - Add: `app.appauro.com`
   - Configure DNS (CNAME to `cname.vercel-dns.com`)

---

### Option 2: Via Vercel CLI

```bash
# Navigate to root directory
cd C:\Users\rohan\OneDrive\Desktop\auro

# Deploy (will create new project)
vercel

# When prompted:
# - Set up new project? Yes
# - Link to existing project? No
# - Project name: auro-app
# - Root directory: . (leave blank/current)

# Deploy to production
vercel --prod
```

---

## Why Two Projects?

**Different apps = Different build processes:**

| Aspect | Marketing Site | Web App |
|--------|---------------|---------|
| Framework | Next.js | Expo (Metro) |
| Build Command | `npm run build` | `npx expo export --platform web` |
| Output Dir | `.next` | `dist` |
| Root Dir | `site/` | Root |
| Domain | www.appauro.com | app.appauro.com |

You CAN'T build both from the same Vercel project because they have completely different build processes.

---

## Deployment Flow

```
Push to GitHub (master branch)
    ↓
    ├─→ Vercel Project 1 (auro-site)
    │   └─→ Builds site/ folder
    │       └─→ Deploys to www.appauro.com
    │
    └─→ Vercel Project 2 (auro-app)
        └─→ Builds Expo app from root
            └─→ Deploys to app.appauro.com
```

Both projects auto-deploy on every push to `master` branch.

---

## Verification Checklist

After setup, verify:

- [ ] Visit `www.appauro.com` → See marketing site
- [ ] Click "Sign In" button → Goes to `app.appauro.com`
- [ ] `app.appauro.com` loads Expo web app
- [ ] Both projects show in Vercel dashboard
- [ ] Both auto-deploy on git push

---

## Common Issues

### "Marketing site building Expo files"
→ Make sure `site/.vercelignore` exists and ignores root app files

### "Expo app building Next.js files"
→ Make sure `.vercelignore` (in root) exists and ignores `site/` folder

### "Changes not deploying"
→ Check which Vercel project is triggering. You might need to manually trigger deployment for the other project.

### "Both projects building on every push"
→ This is normal! Both will build, but they ignore each other's files via `.vercelignore`

---

## Managing Both Projects

### View all projects:
```bash
vercel ls
```

### Deploy specific project:
```bash
# Marketing site
cd site
vercel --prod

# Web app
cd ..
vercel --prod
```

### Check deployment status:
Go to: https://vercel.com/dashboard

---

## DNS Configuration

### For `www.appauro.com` (Marketing):
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### For `app.appauro.com` (Web App):
```
Type: CNAME
Name: app
Value: cname.vercel-dns.com
```

---

## Summary

✅ **You NEED 2 Vercel projects** because:
- Different frameworks (Next.js vs Expo)
- Different build commands
- Different output directories
- Different domains

✅ **They CAN share the same Git repo** by:
- Using different root directories
- Using `.vercelignore` files
- Configuring each project separately

✅ **Benefits**:
- Single git repo to manage
- Both auto-deploy on push
- Separate domains for each app
- No conflicts between builds

---

## Quick Commands

```bash
# Commit changes (affects both projects)
git add .
git commit -m "Update apps"
git push

# Both Vercel projects will auto-deploy! 🚀
```

---

**Need help?** Check Vercel dashboard to see which projects exist and their configurations.

