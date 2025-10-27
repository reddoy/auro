# Payment Distribution System Fixes

## Issues Identified and Fixed

### 1. **Total Earned Amount Not Updating**
**Problem**: The profile screen was using `net_amount_cents` to calculate total earnings, but this field wasn't being properly set when reviews were completed.

**Solution**: Updated the earnings calculation in `app/(tabs)/profile/index.tsx` to:
- Use `reviewer_amount_cents` if available (set by the payment distribution API)
- Fallback to `amount_cents - application_fee_cents` for proper calculation
- This ensures accurate earnings display that matches actual payments

### 2. **Pending Payout Balance Calculation Mismatch**
**Problem**: The database trigger was using a hardcoded 80% calculation, but the actual fee structure uses `amount - auro_fee`.

**Solution**: Updated the database trigger in `supabase/migrations/20250103000001_fix_pending_payout_calculation.sql` to:
- Use `amount_cents - application_fee_cents` instead of `amount_cents * 0.8`
- This matches the calculation used in the distribute-reviewer-payment API
- Recalculates existing pending balances with the correct formula

### 3. **Payment Distribution API Integration**
**Problem**: The payment distribution API wasn't being called with the correct base URL from the mobile app.

**Solution**: Updated `lib/api.ts` to:
- Use the correct base URL (`https://www.appauro.com`) for API calls
- Add proper error handling and logging
- Ensure the API is called when reviews are submitted

### 4. **Manual Payment Distribution Tool**
**Solution**: Created `site/app/api/admin/distribute-payment/route.ts` for:
- Manual payment distribution when automatic fails
- Force distribution for testing/debugging
- Better error reporting and status checking

## How the System Now Works

### Payment Flow:
1. **Customer pays** → Funds held in Auro's Stripe account
2. **Reviewer completes review** → Status changes to 'completed'
3. **Automatic payout triggered** → API calculates `amount - auro_fee`
4. **Stripe transfer created** → Money sent to reviewer's Connect account
5. **Database updated** → `payment_distributed = true`, `reviewer_amount_cents` set
6. **Pending balance reduced** → Trigger subtracts the distributed amount
7. **Total earnings updated** → Profile screen shows correct earnings

### Fee Structure:
- **Customer pays**: Full amount (e.g., $50)
- **Auro platform fee**: Set in `application_fee_cents` (e.g., $7.50)
- **Reviewer receives**: `amount_cents - application_fee_cents` (e.g., $42.50)

## Testing the System

### 1. **Test Payment Distribution**
```bash
# Test normal distribution (requires completed review)
node scripts/test-payout.js <request-id>

# Test forced distribution (bypasses completion check)
node scripts/test-payout.js <request-id> --force
```

### 2. **Check Database Status**
```sql
-- Check pending payments
SELECT 
  id,
  status,
  amount_cents,
  application_fee_cents,
  reviewer_amount_cents,
  payment_distributed,
  payment_distributed_at,
  stripe_transfer_id
FROM requests 
WHERE influencer_id = '<reviewer-id>'
ORDER BY created_at DESC;

-- Check reviewer's pending balance
SELECT 
  id,
  username,
  pending_payout_balance_cents,
  stripe_connect_account_id
FROM profiles 
WHERE id = '<reviewer-id>';
```

### 3. **Verify Stripe Transfers**
- Check Stripe Dashboard → Transfers
- Look for transfers with `transfer_group: review_<request-id>`
- Verify amounts match the calculated `reviewer_amount_cents`

## Migration Required

Run the new migration to fix the pending payout calculation:

```bash
supabase db push
```

This will:
- Update the trigger function with correct fee calculation
- Recalculate all existing pending payout balances
- Ensure consistency between pending balance and actual payments

## Monitoring

### Success Indicators:
- ✅ Total earned amount increases after review completion
- ✅ Pending payout balance reduces after review completion
- ✅ Stripe transfers appear in dashboard
- ✅ `payment_distributed = true` in database
- ✅ `reviewer_amount_cents` populated

### Error Scenarios:
- ❌ Reviewer without Stripe Connect account
- ❌ Insufficient funds in Auro account
- ❌ Network failures during API calls
- ❌ Invalid fee calculations

## Next Steps

1. **Deploy the migration** to fix existing data
2. **Test with a real review** to verify the flow
3. **Monitor the logs** for any payment distribution errors
4. **Set up alerts** for failed payment distributions
5. **Consider adding retry logic** for failed API calls

The system should now properly:
- Calculate and display correct earnings
- Automatically distribute payments to reviewers
- Track pending vs distributed amounts accurately
- Provide manual override capabilities for edge cases
