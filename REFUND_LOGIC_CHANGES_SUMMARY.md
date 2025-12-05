# Refund Logic Changes - Summary

## Overview

Updated the refund timeout logic to implement the following deadlines:
- **14 days (2 weeks)** for reviewers to accept or deny requests when status is `paid`
- **48 hours** for reviewers to complete reviews after accepting (status `in_progress`)

---

## Changes Made

### 1. Database Migration ✅

**File:** `supabase/migrations/20250210000001_update_timeout_to_14_days_accept_48h_complete.sql`

**What it does:**
- Updates `handle_request_timeouts()` function to:
  - Check for 14-day timeout on `paid` status requests
  - Check for 48-hour timeout on `in_progress` status requests (using `deliver_by` deadline)
  - Fallback absolute timeout of 16 days
- Updates existing requests to set correct deadlines
- Updates column comments to reflect new timelines

**Key Changes:**
- Pending acceptance timeout: Changed from 48 hours to **14 days**
- Completion timeout: Kept at **48 hours** (from acceptance)

---

### 2. Stripe Webhook ✅

**File:** `site/app/api/stripe/webhook/route.ts`

**Change:**
- Updated `accept_by` deadline from 48 hours to **14 days** when payment completes
- Line 159: Changed from `48 * 60 * 60 * 1000` to `14 * 24 * 60 * 60 * 1000`

---

### 3. API Functions ✅

**File:** `lib/api.ts`

**Status:** Already correct! 
- The `updateRequestStatus()` function already sets `deliver_by` to 48 hours from acceptance
- No changes needed

---

### 4. App UI - Reviewer Screen ✅

**File:** `app/(tabs)/requests/reviewer/[id].tsx`

**Changes:**
- Added message for `paid` status: "You have 2 weeks to accept or deny this request. If no action is taken within 2 weeks, the requester will be automatically refunded."
- Kept existing message for `in_progress` status: "You have 48 hours to complete this review..."

---

### 5. App UI - Reviewee Screens ✅

**File:** `app/(tabs)/requests/[id].tsx`

**Changes:**
- Added message for `paid` status: "Awaiting reviewer approval. If declined or no response within 2 weeks, you will be automatically refunded."
- Kept existing message for `in_progress` status

**File:** `app/review/[id].tsx`

**Changes:**
- Updated `paid` status message: Changed from "48 hours" to "2 weeks"
- Updated `in_progress` status message: Clarified it's "after acceptance"

---

### 6. Web Request Flow ✅

**File:** `site/app/request/components/DownloadApp.tsx`

**Changes:**
- Updated timeline to show:
  1. Review Assignment (immediate notification)
  2. **Review Acceptance** (2 weeks to accept/deny)
  3. **Review Process** (48 hours to complete after acceptance)
  4. Notification (when ready)
- Added clear messaging about automatic refunds

**File:** `site/app/request/components/PaymentStep.tsx`

**Changes:**
- Updated security badge from "48 hour delivery" to "Guaranteed Timelines - Reviewer has 2 weeks to accept, then 48 hours to complete"

---

### 7. Documentation ✅

**File:** `docs/REFUND_TIMEOUT_LOGIC.md`

**New comprehensive documentation covering:**
- Complete timeout rules
- Database field explanations
- Automatic refund process
- User-facing messages
- Testing scenarios and commands
- Edge cases
- Monitoring queries

---

## Testing Checklist

### Before Deploying:

- [ ] Run the migration on staging database
- [ ] Test timeout detection with a test request:
  - [ ] Create request, complete payment
  - [ ] Verify `accept_by` is set to 14 days from payment
  - [ ] Manually trigger timeout (update database or wait)
  - [ ] Verify timeout is detected correctly
- [ ] Test refund processing:
  - [ ] Verify timeout requests get refunded
  - [ ] Check timeout_log entries
  - [ ] Verify Stripe refunds are created
- [ ] Test UI messages:
  - [ ] Reviewer sees 2-week deadline for pending acceptance
  - [ ] Reviewer sees 48-hour deadline for in-progress
  - [ ] Reviewee sees appropriate messages
  - [ ] Web flow shows correct timeline

### Manual Testing Commands:

```sql
-- Check deadline settings
SELECT id, status, created_at, accept_by, deliver_by,
  accept_by - created_at as accept_window,
  deliver_by - accept_by as deliver_window
FROM requests 
WHERE status IN ('paid', 'in_progress')
ORDER BY created_at DESC;

-- Trigger timeout manually (for testing)
UPDATE requests 
SET accept_by = NOW() - INTERVAL '1 day'
WHERE id = 'test-request-id' AND status = 'paid';

SELECT handle_request_timeouts();
```

```bash
# Trigger refund processing manually
curl -X POST https://www.appauro.com/api/payments/process-timeout-refunds \
  -H "Content-Type: application/json" \
  -d '{"processAll": false, "limit": 5}'
```

---

## User Experience Summary

### For Reviewers:

1. **After Payment (Status: `paid`):**
   - See: "You have 2 weeks to accept or deny this request..."
   - Action: Accept or Deny within 14 days
   - Consequence: Auto-refund if no action

2. **After Acceptance (Status: `in_progress`):**
   - See: "You have 48 hours to complete this review..."
   - Action: Complete review within 48 hours
   - Consequence: Auto-refund if not completed

### For Reviewees:

1. **After Payment (Status: `paid`):**
   - See: "Awaiting reviewer approval. If declined or no response within 2 weeks, you will be automatically refunded."

2. **After Acceptance (Status: `in_progress`):**
   - See: "Reviewer is working on your review. They have 48 hours to complete it or your money back."

---

## Key Points

1. ✅ **14 days** for reviewers to accept/deny (changed from 48 hours)
2. ✅ **48 hours** for reviewers to complete after acceptance (unchanged)
3. ✅ Clear messaging in app and web
4. ✅ Automatic refund processing via cron job
5. ✅ Comprehensive logging and monitoring

---

## Next Steps

1. Review the migration file and apply to staging
2. Test the timeout logic with test requests
3. Verify UI messages display correctly
4. Monitor timeout logs after deployment
5. Update customer support documentation if needed

---

## Files Changed

1. `supabase/migrations/20250210000001_update_timeout_to_14_days_accept_48h_complete.sql` (NEW)
2. `site/app/api/stripe/webhook/route.ts`
3. `app/(tabs)/requests/reviewer/[id].tsx`
4. `app/(tabs)/requests/[id].tsx`
5. `app/review/[id].tsx`
6. `site/app/request/components/DownloadApp.tsx`
7. `site/app/request/components/PaymentStep.tsx`
8. `docs/REFUND_TIMEOUT_LOGIC.md` (NEW)

---

## Notes

- The `lib/api.ts` file already had correct logic for setting `deliver_by` to 48 hours from acceptance - no changes needed
- All timeout/refund processing happens via the existing cron job at 3 AM UTC daily
- The migration will update existing requests in `paid` or `in_progress` status to have correct deadlines

