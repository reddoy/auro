-- Allow 'queued' as a valid payment_status.
--
-- Background: the original payment_status migration (20250103000004) declared
-- 'queued' as one of the four valid values in the column comment, but a later
-- check constraint left it out. Distribute/retry routes write 'queued' on every
-- recoverable error (insufficient funds, payouts disabled, account retrieval
-- failed, generic transfer error). Without 'queued' in the constraint these
-- updates silently fail, which is exactly why payment_distribution_error stayed
-- NULL on stuck rows and reviewers had no UI signal that their payout failed.

ALTER TABLE requests
  DROP CONSTRAINT IF EXISTS requests_payment_status_check;

ALTER TABLE requests
  ADD CONSTRAINT requests_payment_status_check
  CHECK (payment_status = ANY (ARRAY['pending'::text, 'queued'::text, 'paid'::text, 'refunded'::text, 'failed'::text]));

COMMENT ON COLUMN requests.payment_status IS
  'Payment lifecycle: pending (awaiting customer pay), queued (paid but payout deferred / retrying), paid (distributed to reviewer), refunded (refunded to customer), failed (terminal payout failure).';
