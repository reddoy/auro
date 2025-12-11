# Refund Timeout Logic - Complete Guide

## Overview

This document explains the refund timeout logic for review requests. The system automatically refunds customers if reviewers don't meet specific deadlines.

---

## Timeout Rules

### Rule 1: Pending Acceptance (Status: `paid`)

**Timeline:** 14 days (2 weeks) from payment completion

**When it applies:**
- Request status is `paid` (payment completed, waiting for reviewer to accept/deny)
- Reviewer has not yet accepted or denied the request

**What happens:**
- After 14 days, if the reviewer has not accepted or denied, the request is automatically marked as `timeout`
- The customer is automatically refunded the full payment amount
- Refund reason: `timeout_no_acceptance`

**Example:**
- Payment completes: January 1, 2025 at 10:00 AM
- Deadline to accept/deny: January 15, 2025 at 10:00 AM
- If no action by deadline → Automatic refund

---

### Rule 2: Review Completion (Status: `in_progress`)

**Timeline:** 48 hours from acceptance

**When it applies:**
- Request status is `in_progress` (reviewer has accepted and is working on the review)
- Reviewer has accepted the request but has not yet submitted the review

**What happens:**
- After 48 hours from acceptance, if the review is not completed, the request is automatically marked as `timeout`
- The customer is automatically refunded the full payment amount
- Refund reason: `timeout_no_completion`

**Example:**
- Reviewer accepts: January 15, 2025 at 2:00 PM
- Deadline to complete: January 17, 2025 at 2:00 PM
- If review not completed by deadline → Automatic refund

---

### Rule 3: Absolute Timeout (Fallback)

**Timeline:** 16 days from payment

**When it applies:**
- Fallback safety mechanism
- Catches any edge cases where requests might have been missed

**What happens:**
- After 16 days from payment (14 days + 48 hours buffer), regardless of status, the request is marked as `timeout`
- The customer is automatically refunded
- Refund reason: `timeout_absolute`

---

## Database Fields

### `accept_by` (TIMESTAMPTZ)
- **Purpose:** Deadline for reviewer to accept or deny the request
- **Set when:** Payment is completed (via Stripe webhook)
- **Value:** `created_at + 14 days`
- **Used by:** Timeout detection for pending acceptance

### `deliver_by` (TIMESTAMPTZ)
- **Purpose:** Deadline for reviewer to complete the review
- **Set when:** Reviewer accepts the request (status changes to `in_progress`)
- **Value:** `accept_by + 48 hours` (or `accept_by` timestamp + 48 hours)
- **Used by:** Timeout detection for review completion

---

## Automatic Refund Process

### Step 1: Timeout Detection (Daily Cron Job)

**Schedule:** Daily at 3 AM UTC

**Endpoint:** `/api/payments/process-timeout-refunds`

**What it does:**
1. Runs `handle_request_timeouts()` database function
2. Finds all requests that have exceeded their deadlines
3. Marks them as `status = 'timeout'`
4. Logs timeout details in `timeout_log` table
5. Does NOT process refunds directly (separate step)

### Step 2: Refund Processing (Daily Cron Job)

**Schedule:** Daily at 3 AM UTC (same cron job)

**What it does:**
1. Queries for requests with `status = 'timeout'` and `refund_status = 'none'`
2. For each timeout request:
   - Creates Stripe refund via `/api/payments/refund`
   - Updates request with refund information:
     - `refunded_amount_cents` = full amount
     - `refund_status` = `'refunded'`
     - `refunded_at` = current timestamp
     - `stripe_refund_id` = Stripe refund ID
     - `payment_status` = `'refunded'`
3. Sends Slack alerts on failures

---

## User-Facing Messages

### For Reviewers

#### Status: `paid` (Pending Acceptance)
**Message shown:**
> "You have 2 weeks to accept or deny this request. If no action is taken within 2 weeks, the requester will be automatically refunded."

#### Status: `in_progress` (Working on Review)
**Message shown:**
> "You have 48 hours to complete this review. After 48 hours, the requester is refunded."

### For Reviewees (People Being Reviewed)

#### Status: `paid` (Awaiting Acceptance)
**Message shown:**
> "Awaiting reviewer approval. If declined or no response within 2 weeks, you will be automatically refunded."

#### Status: `in_progress` (Review in Progress)
**Message shown:**
> "Reviewer is working on your review. They have 48 hours to complete it or your money back."

**OR**

> "The reviewer accepted your request and now has 48 hours to submit your review, or you will be refunded."

---

## Web Request Flow Messages

### After Payment Success (DownloadApp.tsx)

**Timeline shown:**
1. **Review Assignment:** Your selected reviewer will be notified immediately
2. **Review Acceptance:** Your reviewer has 2 weeks to accept or deny your request. If no action is taken within 2 weeks, you will be automatically refunded.
3. **Review Process:** Once accepted, your reviewer will provide detailed feedback within 48 hours. If not completed within 48 hours, you will be automatically refunded.
4. **Notification:** You'll be notified via email and app when your review is ready

### Payment Step (PaymentStep.tsx)

**Security badge:**
> "Guaranteed Timelines - Reviewer has 2 weeks to accept, then 48 hours to complete"

---

## Testing the Logic

### Test Scenario 1: Pending Acceptance Timeout

**Setup:**
1. Create a review request and complete payment
2. Request status should be `paid`
3. `accept_by` should be set to `created_at + 14 days`

**Test:**
1. Wait 14 days (or manually update database to simulate)
2. Run timeout detection cron job
3. Verify request status changes to `timeout`
4. Verify timeout_log entry is created
5. Run refund processing cron job
6. Verify refund is created in Stripe
7. Verify request `refund_status` = `'refunded'`

**Manual Test (Fast):**
```sql
-- Set accept_by to past date to trigger timeout
UPDATE requests 
SET accept_by = NOW() - INTERVAL '1 day'
WHERE id = 'your-request-id' AND status = 'paid';

-- Run timeout function
SELECT handle_request_timeouts();

-- Check timeout_log
SELECT * FROM timeout_log WHERE request_id = 'your-request-id';
```

### Test Scenario 2: Review Completion Timeout

**Setup:**
1. Create a review request and complete payment
2. Reviewer accepts the request (status → `in_progress`)
3. `accept_by` should be set to acceptance timestamp
4. `deliver_by` should be set to `accept_by + 48 hours`

**Test:**
1. Wait 48 hours from acceptance (or manually update database)
2. Run timeout detection cron job
3. Verify request status changes to `timeout`
4. Verify timeout_log entry shows `timeout_type = 'no_completion'`
5. Run refund processing cron job
6. Verify refund is created

**Manual Test (Fast):**
```sql
-- Set deliver_by to past date to trigger timeout
UPDATE requests 
SET deliver_by = NOW() - INTERVAL '1 hour'
WHERE id = 'your-request-id' AND status = 'in_progress';

-- Run timeout function
SELECT handle_request_timeouts();
```

### Test Scenario 3: Normal Flow (No Timeout)

**Setup:**
1. Create a review request and complete payment
2. Reviewer accepts within 14 days
3. Reviewer completes review within 48 hours

**Expected:**
- No timeout occurs
- Request proceeds to `completed` status
- No refund is issued

---

## Manual Testing Commands

### Trigger Timeout Detection

```bash
# Via cron endpoint (requires auth token)
curl "https://www.appauro.com/api/payments/process-timeout-refunds?token=YOUR_CRON_SECRET"

# Or via POST for manual trigger
curl -X POST https://www.appauro.com/api/payments/process-timeout-refunds \
  -H "Content-Type: application/json" \
  -d '{"processAll": true, "limit": 10}'
```

### Check Pending Timeouts

```sql
-- Find requests approaching acceptance deadline (paid status)
SELECT 
  id,
  status,
  created_at,
  accept_by,
  NOW() - created_at as time_since_payment,
  accept_by - NOW() as time_until_deadline
FROM requests
WHERE status = 'paid'
  AND accept_by IS NOT NULL
  AND accept_by > NOW()
ORDER BY accept_by ASC;

-- Find requests approaching completion deadline (in_progress status)
SELECT 
  id,
  status,
  accept_by,
  deliver_by,
  NOW() - accept_by as time_since_acceptance,
  deliver_by - NOW() as time_until_deadline
FROM requests
WHERE status = 'in_progress'
  AND deliver_by IS NOT NULL
  AND deliver_by > NOW()
ORDER BY deliver_by ASC;
```

### Check Timeout Logs

```sql
-- Recent timeout logs
SELECT 
  request_id,
  timeout_type,
  timeout_reason,
  amount_cents,
  customer_email,
  created_at
FROM timeout_log
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

### Check Refunded Requests

```sql
-- Requests that were refunded due to timeout
SELECT 
  id,
  status,
  refund_status,
  refund_reason,
  refunded_at,
  amount_cents,
  refunded_amount_cents
FROM requests
WHERE refund_status = 'refunded'
  AND refund_reason LIKE 'timeout_%'
ORDER BY refunded_at DESC;
```

---

## Edge Cases & Notes

### Edge Case 1: Reviewer Denies Request

- When reviewer denies, request status → `rejected`
- Automatic refund is triggered immediately (not a timeout)
- Refund reason: `requested_by_customer`
- **No timeout occurs** - denial happens before deadline

### Edge Case 2: Payment Fails

- If payment fails, request status stays as `pending`
- No deadlines are set
- No timeout logic applies

### Edge Case 3: Request Completed

- Once status is `completed`, timeout logic no longer applies
- Refunds cannot occur after completion
- Payment is distributed to reviewer

### Edge Case 4: Multiple Concurrent Requests

- Each request has its own independent deadlines
- Timeouts are checked per-request
- No impact on other requests

---

## Monitoring & Alerts

### Slack Alerts

The cron job sends Slack alerts when:
- Timeout refunds are processed (summary of counts)
- Refund failures occur (individual request errors)

### Dashboard Queries

**Pending Timeouts (Next 24 Hours):**
```sql
SELECT COUNT(*) 
FROM requests
WHERE status = 'paid' 
  AND accept_by BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
UNION ALL
SELECT COUNT(*) 
FROM requests
WHERE status = 'in_progress' 
  AND deliver_by BETWEEN NOW() AND NOW() + INTERVAL '24 hours';
```

**Timeouts Today:**
```sql
SELECT COUNT(*)
FROM timeout_log
WHERE created_at::date = CURRENT_DATE
  AND timeout_type != 'summary';
```

---

## Summary

1. **Pending Acceptance:** 14 days from payment to accept/deny
2. **Review Completion:** 48 hours from acceptance to complete
3. **Automatic Refunds:** Processed daily via cron job at 3 AM UTC
4. **Clear Messaging:** Users see deadlines in app and web
5. **Comprehensive Logging:** All timeouts logged in `timeout_log` table

---

## Questions?

For manual refund testing:
```bash
curl -X POST https://www.appauro.com/api/payments/refund \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "your-request-id",
    "reason": "manual_test",
    "partial": false
  }'
```

