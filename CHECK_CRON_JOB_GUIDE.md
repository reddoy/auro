# How to Check if Cron Job Ran & Verify Payment Distribution

## Quick Check - Did the Payment Get Distributed?

### Step 1: Check the Request Status

Run this SQL query (replace `REQUEST_ID_HERE` with the actual request ID):

```sql
SELECT 
  id,
  status,
  payment_distributed,
  payment_distributed_at,
  stripe_transfer_id,
  payment_distribution_error,
  payment_distribution_attempts
FROM requests
WHERE id = 'REQUEST_ID_HERE';
```

**What to look for:**
- ✅ `payment_distributed = true` → Payment was distributed! Check `payment_distributed_at` for when it happened
- ❌ `payment_distributed = false` → Payment not yet distributed, check the error column

---

## How to Check if the Cron Job Ran

### Option 1: Check Vercel Function Logs

1. Go to your Vercel dashboard
2. Navigate to your project
3. Click on **"Functions"** or **"Logs"** tab
4. Look for the function: `/api/payments/retry-failed-distributions`
5. Filter by time (around 6 PM your timezone)
6. Look for log entries like:
   - `[retry-distributions] Processing X failed distributions`
   - `[retry-distributions] Successfully retried distribution for request...`

### Option 2: Check Slack Alerts (if configured)

If you have `OPERATIONS_WEBHOOK_URL` set up, you should receive Slack alerts:
- `[Cron] Retry payouts — processed X, success Y, failed Z, skipped W`
- If nothing to process: `[Cron] Retry payouts — nothing to process`

### Option 3: Check Database for Payment Distribution Timestamp

```sql
-- Check when payments were distributed in the last 24 hours
SELECT 
  id,
  payment_distributed_at,
  stripe_transfer_id,
  reviewer_amount_cents / 100.0 as amount_dollars
FROM requests
WHERE payment_distributed = true
  AND payment_distributed_at > NOW() - INTERVAL '24 hours'
ORDER BY payment_distributed_at DESC;
```

If you see recent `payment_distributed_at` timestamps around 6 PM, the cron job ran!

---

## Manual Trigger - Test Payment Distribution Now

You can manually trigger the cron job to process payments immediately:

### Option 1: Using cURL (Command Line)

```bash
curl -X POST https://www.appauro.com/api/payments/retry-failed-distributions \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}'
```

Or if you have a CRON_SECRET token:

```bash
curl "https://www.appauro.com/api/payments/retry-failed-distributions?token=YOUR_CRON_SECRET"
```

### Option 2: Using Postman/Thunder Client

**POST** request to:
```
https://www.appauro.com/api/payments/retry-failed-distributions
```

**Body (JSON):**
```json
{
  "limit": 10,
  "retryAll": false,
  "maxRetries": 3
}
```

**Or GET request:**
```
GET https://www.appauro.com/api/payments/retry-failed-distributions?token=YOUR_CRON_SECRET
```

### Option 3: Check Response

The API will return something like:

```json
{
  "success": true,
  "message": "Processed X failed distributions",
  "results": {
    "processed": 1,
    "successful": 1,
    "failed": 0,
    "skipped": 0,
    "errors": []
  }
}
```

---

## Complete Verification Steps

### Step 1: Verify Reviewer Has Stripe Account

```sql
SELECT 
  id,
  username,
  stripe_connect_account_id,
  CASE 
    WHEN stripe_connect_account_id IS NULL THEN '❌ No Stripe - Payment will be held'
    ELSE '✅ Has Stripe - Ready for payment'
  END as status
FROM profiles
WHERE id = 'REVIEWER_ID_HERE';  -- Replace with reviewer's ID
```

**If `stripe_connect_account_id` is NULL:**
- The payment will be **held** (not an error)
- The cron job will **skip** it until Stripe is set up
- Once Stripe is set up, the next cron run will process it

**If `stripe_connect_account_id` is NOT NULL:**
- Payment should be processed immediately (or on next cron run)

### Step 2: Check Request Status

```sql
SELECT 
  r.id,
  r.status,
  r.payment_distributed,
  r.payment_distributed_at,
  r.stripe_transfer_id,
  r.payment_distribution_error,
  r.payment_distribution_attempts,
  p.stripe_connect_account_id
FROM requests r
LEFT JOIN profiles p ON p.id = r.influencer_id
WHERE r.id = 'REQUEST_ID_HERE';
```

### Step 3: Check for Errors

```sql
SELECT 
  id,
  payment_distribution_error,
  payment_distribution_attempts,
  payment_distribution_failed_at
FROM requests
WHERE id = 'REQUEST_ID_HERE'
  AND payment_distributed = false
  AND payment_distribution_error IS NOT NULL;
```

Common errors:
- `"Payment held: Reviewer has not set up Stripe Connect account..."` → Reviewer needs to set up Stripe
- `"Insufficient funds"` → Need to add funds to Stripe account
- Other errors → Check Stripe dashboard or logs

### Step 4: Verify in Stripe Dashboard

1. Go to Stripe Dashboard → **Transfers**
2. Search for transfer with `transfer_group = review_REQUEST_ID`
3. Or search by reviewer's Stripe Connect account ID
4. Check transfer status and amount

---

## Troubleshooting

### Payment Not Distributed After Stripe Setup

1. **Check if Stripe account ID is saved:**
   ```sql
   SELECT stripe_connect_account_id FROM profiles WHERE id = 'REVIEWER_ID';
   ```

2. **Manually trigger the cron job:**
   ```bash
   curl -X POST https://www.appauro.com/api/payments/retry-failed-distributions \
     -H "Content-Type: application/json" \
     -d '{"limit": 10}'
   ```

3. **Check the response** - it should show if it processed your request

4. **Re-check the database:**
   ```sql
   SELECT payment_distributed, payment_distributed_at FROM requests WHERE id = 'REQUEST_ID';
   ```

### Cron Job Not Running

1. **Check Vercel cron configuration:**
   - Go to Vercel Dashboard → Project Settings → Cron Jobs
   - Verify the schedule matches your expectation
   - Note: Times are in UTC, so 6 PM your time might be different in UTC

2. **Check Vercel function logs** around the scheduled time

3. **Manually trigger** to test if the endpoint works

---

## Quick Reference Queries

### Find All Unpaid Completed Reviews

```sql
SELECT 
  r.id,
  r.amount_cents / 100.0 as total_dollars,
  r.created_at as completed_at,
  p.username,
  p.stripe_connect_account_id IS NOT NULL as has_stripe
FROM requests r
JOIN profiles p ON p.id = r.influencer_id
WHERE r.status = 'completed'
  AND r.payment_distributed = false
ORDER BY r.created_at DESC;
```

### Find Payments Distributed Today

```sql
SELECT 
  r.id,
  r.reviewer_amount_cents / 100.0 as paid_dollars,
  r.payment_distributed_at,
  r.stripe_transfer_id
FROM requests r
WHERE r.payment_distributed = true
  AND r.payment_distributed_at::date = CURRENT_DATE
ORDER BY r.payment_distributed_at DESC;
```

### Check Cron Job Activity (Last 7 Days)

```sql
SELECT 
  DATE(payment_distributed_at) as date,
  COUNT(*) as payments_distributed,
  SUM(reviewer_amount_cents) / 100.0 as total_dollars
FROM requests
WHERE payment_distributed = true
  AND payment_distributed_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(payment_distributed_at)
ORDER BY date DESC;
```

---

## Summary

✅ **Payment was distributed if:**
- `payment_distributed = true`
- `payment_distributed_at` has a timestamp
- `stripe_transfer_id` is set

❌ **Payment NOT distributed if:**
- `payment_distributed = false`
- Check `payment_distribution_error` for reason

⏸️ **Payment held if:**
- Reviewer doesn't have Stripe Connect set up yet
- Will be processed automatically once Stripe is set up

🚀 **To force processing:**
- Manually trigger the cron job endpoint
- Check if reviewer has Stripe account
- Verify no errors in database

