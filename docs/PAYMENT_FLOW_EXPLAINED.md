# Payment Collection & Distribution Flow - Complete Explanation

## Overview
This document explains how payments are collected from customers, held, and distributed to reviewers, including the logic for handling reviewers who haven't set up Stripe Connect yet.

---

## 1. Payment Collection Flow

### Step 1: Customer Initiates Payment
- Customer creates a review request and pays via **Stripe PaymentSheet**
- Payment is processed through `/api/payments/create-sheet` (Supabase Edge Function)
- PaymentIntent is created and customer completes payment

### Step 2: Payment Captured
- Once payment succeeds, the `requests` table is updated with:
  - `status = 'paid'`
  - `payment_status = 'paid'`
  - `stripe_payment_intent_id` (Stripe PaymentIntent ID)
  - `stripe_session_id` (Stripe Checkout Session ID)
  - `amount_cents` (total amount customer paid)
  - `application_fee_cents` (Auro's platform fee - 20% of total)
  
### Step 3: Money Held in Auro Account
- **All customer payments are held in Auro's Stripe platform account**
- Money sits in Auro's available balance until distribution
- This happens regardless of reviewer's Stripe Connect status

---

## 2. Payment Distribution Flow

### Step 1: Reviewer Completes Review
- When reviewer submits review via `submitRequestReview()` in `lib/api.ts`
- Request status changes to `status = 'completed'`
- Immediately triggers payment distribution attempt

### Step 2: Distribution Attempt (`/api/payments/distribute-reviewer-payment`)

The distribution logic follows this flow:

#### A. Initial Checks
1. **Already Distributed?** → If `payment_distributed = true`, skip (prevents double-payment)
2. **Request Completed?** → Must have `status = 'completed'`
3. **Atomic Lock** → Updates `payment_distribution_attempts` to prevent race conditions

#### B. Stripe Connect Account Check
```typescript
const connectAccountId = reviewer.stripe_connect_account_id;
if (!connectAccountId) {
  // PAYMENT HELD - Not an error, just waiting
  // Stores error message: "Payment held: Reviewer has not set up Stripe Connect account..."
  // payment_distributed remains false
  // Returns success with held: true
}
```

**Key Point**: If reviewer hasn't set up Stripe Connect:
- Payment is **NOT marked as failed**
- Error message is stored: `"Payment held: Reviewer has not set up Stripe Connect account. Payment will be distributed once Stripe is connected."`
- `payment_distributed` remains `false`
- `payment_distribution_attempts` is incremented
- Money stays in Auro's account until Stripe is set up

#### C. Account Validation (if Connect account exists)
- Checks if account has `payouts_enabled = true`
- Verifies account requirements are met
- If payouts disabled → marks as failed with specific error

#### D. Balance Check
- Checks Auro's **available balance** (not pending)
- Only uses available funds for transfers
- If insufficient → marks as failed with `INSUFFICIENT_FUNDS` error

#### E. Transfer Creation
- Creates Stripe Transfer to reviewer's Connect account
- Amount: `reviewerAmount = totalAmount - auroFee` (80% of total)
- Updates `requests` table:
  - `payment_distributed = true`
  - `payment_distributed_at = timestamp`
  - `stripe_transfer_id = transfer.id`
  - `reviewer_amount_cents = reviewerAmount`
  - `payment_status = 'paid'`
  - Clears any previous errors

#### F. Notification
- Sends push notification to reviewer: "You Just Got Paid! 💰"

---

## 3. Held Payments & Automatic Retry

### How Held Payments Work

When a reviewer completes a review but hasn't set up Stripe Connect:

1. **Initial Attempt** (during review submission):
   - Distribution attempted immediately
   - Detects missing `stripe_connect_account_id`
   - Stores error: `"Payment held: Reviewer has not set up Stripe Connect account..."`
   - `payment_distributed = false`
   - Money remains in Auro's account

2. **Reviewer Sets Up Stripe**:
   - Reviewer completes Stripe Express onboarding
   - `stripe_connect_account_id` is saved to their profile
   - **No automatic trigger** - relies on cron job

3. **Daily Cron Job Retry**:
   - **Schedule**: Daily at 2 AM UTC (`0 2 * * *`)
   - **Endpoint**: `/api/payments/retry-failed-distributions`
   - **Query Logic**:
     ```sql
     WHERE status = 'completed'
       AND payment_distributed = false
       AND payment_distribution_attempts < maxRetries
       AND (
         payment_distribution_failed_at IS NOT NULL
         OR payment_distribution_error ILIKE '%Payment held%'
       )
     ```
   - Finds all held payments and failed distributions
   - For each request:
     - Checks if reviewer now has `stripe_connect_account_id`
     - If yes → attempts distribution
     - If no → skips (will retry next day)
   - Processes up to 10 requests per run (configurable via `RETRY_FAILED_DISTRIBUTIONS_LIMIT`)

### Retry Behavior
- **Max Retries**: 3 attempts (configurable via `RETRY_FAILED_DISTRIBUTIONS_MAX`)
- **Rate Limiting**: 200ms delay between each retry
- **Success**: Payment distributed, `payment_distributed = true`
- **Failure**: Increments `payment_distribution_attempts`, stores error
- **Held Payments**: Will keep retrying daily until Stripe is set up (no max limit for held payments)

---

## 4. Payment Calculation

### Simple Model
- **Customer pays**: `$X` (e.g., $100)
- **Auro fee**: 20% = `$X * 0.20` (e.g., $20)
- **Reviewer receives**: 80% = `$X * 0.80` (e.g., $80)
- **Stripe processing fee**: Absorbed by Auro (deducted from Auro's fee)

### Formula
```typescript
const totalAmount = request.amount_cents;        // e.g., 10000 cents ($100)
const auroFee = request.application_fee_cents;    // e.g., 2000 cents ($20)
const reviewerAmount = totalAmount - auroFee;     // e.g., 8000 cents ($80)
```

---

## 5. Cron Job Configuration

### Current Setup (Daily - Correct for Hobby Plan)
Located in `site/vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/payments/retry-failed-distributions",
      "schedule": "0 2 * * *"  // Daily at 2 AM UTC
    },
    {
      "path": "/api/payments/process-timeout-refunds",
      "schedule": "0 3 * * *"  // Daily at 3 AM UTC
    },
    {
      "path": "/api/notifications/send-reviewer-deadline-warnings",
      "schedule": "0 4 * * *"  // Daily at 4 AM UTC
    }
  ]
}
```

**✅ All cron jobs run DAILY** - Perfect for Supabase Hobby plan (daily limit)

### What Each Cron Does

1. **Retry Failed Distributions** (2 AM UTC)
   - Retries held payments (waiting for Stripe setup)
   - Retries failed distributions (insufficient funds, etc.)
   - Processes up to 10 requests per run
   - Sends Slack alerts on failures

2. **Process Timeout Refunds** (3 AM UTC)
   - Refunds requests stuck in `status = 'timeout'`
   - Processes up to 25 requests per run
   - Sends Slack alerts on failures

3. **Send Reviewer Deadline Warnings** (4 AM UTC)
   - Sends notifications to reviewers about upcoming deadlines

---

## 6. Error Handling & Edge Cases

### Insufficient Funds
- **Error**: `INSUFFICIENT_FUNDS`
- **Behavior**: Payment marked as failed, will retry when balance is available
- **Resolution**: Top up Stripe account or wait for settlement, then retry

### Missing Stripe Connect Account
- **Error**: `NO_CONNECT_ACCOUNT` (stored as "Payment held...")
- **Behavior**: Payment held, not marked as failed
- **Resolution**: Reviewer sets up Stripe, cron job picks it up next day

### Payouts Disabled
- **Error**: `PAYOUTS_DISABLED`
- **Behavior**: Payment marked as failed
- **Resolution**: Reviewer completes account requirements, then retry

### Transfer Failed
- **Error**: `TRANSFER_FAILED`
- **Behavior**: Payment marked as failed, will retry
- **Resolution**: Check Stripe account status, fix issues, retry

### Race Conditions
- **Protection**: Atomic database updates using `.eq('payment_distributed', false)`
- **Locking**: Increments `payment_distribution_attempts` before transfer
- **Idempotency**: Checks `payment_distributed` before and after transfer

---

## 7. Database Fields Reference

### `requests` Table - Payment Fields
- `amount_cents`: Total amount customer paid (in cents)
- `application_fee_cents`: Auro's platform fee (20% of total)
- `reviewer_amount_cents`: Amount sent to reviewer (80% of total)
- `payment_distributed`: Boolean - whether payment was sent to reviewer
- `payment_distributed_at`: Timestamp of successful distribution
- `stripe_transfer_id`: Stripe Transfer ID (if distributed)
- `payment_status`: Status ('paid', 'queued', 'refunded')
- `payment_distribution_attempts`: Number of distribution attempts
- `payment_distribution_error`: Error message if distribution failed/held
- `payment_distribution_failed_at`: Timestamp of last failure

### `profiles` Table - Reviewer Fields
- `stripe_connect_account_id`: Stripe Connect account ID (required for payouts)
- `pending_payout_balance_cents`: Balance waiting for distribution (tracked by triggers)

---

## 8. Testing Checklist

Before launch, verify:

- [ ] Cron jobs are configured in Vercel (check `vercel cron ls`)
- [ ] `STRIPE_PLATFORM_ACCOUNT_ID` is set in environment variables
- [ ] `STRIPE_SECRET_KEY` is set in environment variables
- [ ] `OPERATIONS_WEBHOOK_URL` is set for Slack alerts
- [ ] Test payment collection flow
- [ ] Test payment distribution with Stripe Connect set up
- [ ] Test payment holding when Stripe Connect not set up
- [ ] Test cron job retry picking up held payments after Stripe setup
- [ ] Test insufficient funds scenario
- [ ] Test race condition prevention (concurrent distribution attempts)

---

## 9. Key Takeaways

1. **All payments are held in Auro's account** until distributed
2. **Held payments are not errors** - they're waiting for Stripe setup
3. **Daily cron job** automatically retries held payments once Stripe is set up
4. **Money is safe** - it stays in Auro's account until reviewer is ready
5. **No manual intervention needed** - cron job handles everything automatically
6. **Max 3 retry attempts** for failed distributions (unlimited for held payments)
7. **Atomic operations** prevent double-payments and race conditions

---

## 10. Monitoring & Alerts

- **Slack Alerts**: Sent via `OPERATIONS_WEBHOOK_URL` on:
  - Cron job completion (success/failure counts)
  - Payment distribution failures
  - Timeout refund failures
- **Logs**: Check Vercel function logs for detailed error messages
- **Stripe Dashboard**: Monitor transfers and account balance
- **Database**: Query `requests` table for `payment_distributed = false` to see held/failed payments

---

## Questions?

If you need to manually trigger a retry:
```bash
curl -X POST https://www.appauro.com/api/payments/retry-failed-distributions \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}'
```

Or check held payments:
```sql
SELECT id, influencer_id, amount_cents, payment_distribution_error
FROM requests
WHERE status = 'completed'
  AND payment_distributed = false
  AND payment_distribution_error ILIKE '%Payment held%';
```

