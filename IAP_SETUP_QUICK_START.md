# IAP Product Setup - Quick Start Guide

## ✅ You're Using the Essential 37 Products Strategy

The app is now configured to use **37 essential price tiers** instead of 84. This covers 90% of likely reviewer rates and takes ~1 hour to set up instead of 3-4 hours.

---

## 📋 Step-by-Step Setup

### Step 1: Get Your Product List

Run this command to see all 37 products you need to create:

```bash
node scripts/list-essential-iap-products.js
```

This will show you:
- Product ID (e.g., `com.auro.app.review.75`)
- Web Price (e.g., $75)
- IAP Price (e.g., $108)

### Step 2: Go to App Store Connect

1. Visit: https://appstoreconnect.apple.com
2. Sign in with your Apple Developer account
3. Click "My Apps"
4. Select your app (Auro)
5. Click "Features" in the left sidebar
6. Click "In-App Purchases"

### Step 3: Create Each Product

For each of the 37 products:

1. Click the **"+"** button (top left)
2. Select **"Non-Consumable"** (or "Consumable" if you prefer)
3. Fill in the form:

   **Product Information:**
   - **Reference Name**: `Review Request - $75` (use the Web Price)
   - **Product ID**: `com.auro.app.review.75` (copy from script output)
   - **Price**: Select the IAP Price from the dropdown (e.g., $108.00)
   
   **Note:** If the exact IAP price isn't in the dropdown, select the closest one. The system will still work.

4. Click **"Save"**
5. Repeat for all 37 products

### Step 4: Submit for Review (Optional)

- Products can be created in "Ready to Submit" status
- You don't need to submit them individually
- They'll be available once your app is approved

---

## ⏱️ Time Estimate

- **Per Product**: ~2-3 minutes
- **Total Time**: ~1-1.5 hours for all 37 products

**Tips to Speed Up:**
- Keep the script output open in another window
- Copy/paste Product IDs
- Do it in batches (10 at a time, take breaks)

---

## ✅ Verification

After creating all products, verify:

1. Go to App Store Connect → Your App → In-App Purchases
2. You should see 37 products listed
3. Each should have:
   - Product ID matching: `com.auro.app.review.{tier}`
   - Status: "Ready to Submit" or "Approved"

---

## 🔄 Adding More Products Later

If you need to add more tiers later:

1. Add the tier to `lib/iapPriceTiers.ts`:
   ```typescript
   export const PRICE_TIERS = [
     // ... existing tiers ...
     1500, 2000,  // Add new tiers here
   ] as const;
   ```

2. Create the corresponding product in App Store Connect
3. Redeploy your app

**Note:** The app will automatically use new tiers once they're added to the code and created in App Store Connect.

---

## 🚨 Important Notes

1. **Product IDs Must Match Exactly**
   - Format: `com.auro.app.review.{tier}`
   - No spaces, correct capitalization
   - Example: `com.auro.app.review.75` ✓
   - Example: `com.auro.app.review.075` ✗ (wrong)

2. **IAP Prices Don't Need to Be Exact**
   - If $108 isn't available, use $109 or $107
   - The system will still work
   - The important part is the Product ID

3. **Web Checkout Still Works**
   - If a reviewer sets a rate not in the tier list
   - They can still use web checkout (Stripe)
   - IAP is just an option, not required

4. **Rates Outside Tier Range**
   - If reviewer sets $20 (below $25 tier)
   - It rounds to $25 (nearest tier)
   - If reviewer sets $2000 (above $1000 tier)
   - It rounds to $1000 (nearest tier)

---

## 📊 What Happens After Setup

Once all 37 products are created:

1. ✅ App can process IAP purchases
2. ✅ Reviewers can set rates in $25-$1000 range
3. ✅ Rates automatically round to nearest tier
4. ✅ IAP purchases work seamlessly
5. ✅ Web checkout still works for any price

---

## 🆘 Troubleshooting

### "Product ID not found" error
- Check Product ID matches exactly (no typos)
- Ensure product is created in App Store Connect
- Make sure product status is "Ready to Submit" or "Approved"

### "Price mismatch" error
- IAP price doesn't need to match exactly
- As long as Product ID is correct, it will work
- The price shown to users is calculated from the tier

### Can't find exact IAP price in dropdown
- Select the closest price available
- The system calculates prices dynamically
- Product ID is what matters most

---

## ✅ Checklist

Before submitting your app:

- [ ] Created all 37 products in App Store Connect
- [ ] Verified Product IDs match exactly
- [ ] Tested IAP purchase in sandbox
- [ ] Checked Vercel logs for receipt verification
- [ ] Verified web checkout still works

---

## 🎉 You're Done!

Once you've created all 37 products, you're ready to:
1. Test the IAP flow
2. Submit your app to the App Store
3. Add more tiers later if needed

**Remember:** You can always add more products later. Start with these 37, see what rates reviewers actually use, then expand as needed.
