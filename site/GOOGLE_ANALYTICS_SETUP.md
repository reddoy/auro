# Google Analytics Setup Guide

This guide will help you set up Google Analytics 4 (GA4) for your Auro site.

## 📋 Prerequisites

You need a Google Analytics account. If you don't have one, go to [https://analytics.google.com/](https://analytics.google.com/) and create one.

## 🚀 Setup Steps

### 1. Create a GA4 Property

1. Go to [Google Analytics](https://analytics.google.com/)
2. Click **Admin** (gear icon in the bottom left)
3. In the **Account** column, select or create an account
4. In the **Property** column, click **Create Property**
5. Enter your property name (e.g., "Auro Website")
6. Set your timezone and currency
7. Click **Next** and complete the setup wizard

### 2. Get Your Measurement ID

1. In the Admin panel, under **Property**, click **Data Streams**
2. Click on your web data stream (or create one if you haven't)
3. You'll see your **Measurement ID** (format: `G-XXXXXXXXXX`)
4. Copy this ID

### 3. Add Measurement ID to Your Environment Variables

Create a `.env.local` file in the `site/` directory (if it doesn't exist):

```bash
# In the site/ directory
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

**Replace `G-XXXXXXXXXX` with your actual Measurement ID.**

**Important:** Make sure `.env.local` is in your `.gitignore` file to keep your keys private!

### 4. For Production (Vercel)

Add the environment variable to your Vercel project:

1. Go to your project on [Vercel Dashboard](https://vercel.com/dashboard)
2. Go to **Settings** → **Environment Variables**
3. Add a new variable:
   - **Key:** `NEXT_PUBLIC_GA_MEASUREMENT_ID`
   - **Value:** Your GA4 Measurement ID (e.g., `G-XXXXXXXXXX`)
   - **Environment:** Production, Preview, Development (check all)
4. Click **Save**
5. Redeploy your site for the changes to take effect

## 🎯 What's Been Implemented

### 1. GoogleAnalytics Component (`components/GoogleAnalytics.tsx`)
- Loads the Google Analytics script
- Automatically tracks page views
- Only loads when a valid Measurement ID is provided

### 2. Analytics Helper Functions (`lib/analytics.ts`)
- `pageview(url)`: Track page views manually
- `event({ action, category, label, value })`: Track custom events

### 3. Root Layout Integration (`app/layout.tsx`)
- GoogleAnalytics component is added to track all pages automatically

## 📊 Using Custom Event Tracking

You can track custom events in your components:

```typescript
import { event } from '@/lib/analytics';

// Example: Track button clicks
event({
  action: 'click',
  category: 'Button',
  label: 'Become Reviewer CTA',
  value: 1,
});

// Example: Track form submissions
event({
  action: 'submit',
  category: 'Form',
  label: 'Reviewer Application',
});

// Example: Track purchases
event({
  action: 'purchase',
  category: 'Ecommerce',
  label: 'Profile Review',
  value: 25, // dollar amount
});
```

## 🧪 Testing Your Setup

1. Add your Measurement ID to `.env.local`
2. Run your development server: `npm run dev`
3. Open your site in a browser
4. Open Google Analytics (Real-Time reports)
5. Navigate around your site
6. You should see real-time visitors in GA!

### Debug Mode

To see GA events in your browser console, add this to your browser console:

```javascript
window.dataLayer
```

This will show you all events being tracked.

## 🔍 Common Issues

### Analytics Not Working?

1. **Check your Measurement ID format** - It should be `G-XXXXXXXXXX`
2. **Make sure the environment variable is set** - Check `.env.local` exists
3. **Restart your dev server** - Changes to `.env.local` require a restart
4. **Check browser console** - Look for any JavaScript errors
5. **Disable ad blockers** - They can block GA scripts
6. **Wait a few minutes** - Real-time data can take 1-2 minutes to appear

### Not Showing in Production?

1. **Verify environment variable is set in Vercel**
2. **Redeploy after adding the variable**
3. **Check the deployed site's source code** - Look for the GA script in the HTML

## 📈 What You'll Be Able to Track

Once set up, you'll automatically track:

- ✅ Page views
- ✅ User sessions
- ✅ Traffic sources
- ✅ User demographics
- ✅ Device types (mobile, desktop, tablet)
- ✅ Geographic data
- ✅ Real-time visitors
- ✅ Custom events (when you implement them)

## 📚 Additional Resources

- [GA4 Documentation](https://support.google.com/analytics/answer/9304153)
- [Next.js Analytics Guide](https://nextjs.org/docs/app/building-your-application/optimizing/analytics)
- [GA4 Event Tracking](https://developers.google.com/analytics/devguides/collection/ga4/events)

## 🎉 You're All Set!

Once you've added your Measurement ID, Google Analytics will start tracking your site automatically. Visit the GA4 dashboard to see your data!

