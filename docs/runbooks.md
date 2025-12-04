<!-- Ops runbooks – generated 2025-11-21 -->
# Ops Runbooks

## Cron Jobs Overview
| Job | Endpoint | Schedule (UTC) | Purpose | Alert Path |
| --- | --- | --- | --- | --- |
| Retry reviewer payouts | `GET /api/payments/retry-failed-distributions` | Daily at 2 AM (`0 2 * * *`) | Replays failed reviewer transfers and distributes held payments once Stripe Connect is set up | Slack via `OPERATIONS_WEBHOOK_URL` |
| Timeout refunds | `GET /api/payments/process-timeout-refunds` | Daily at 3 AM (`0 3 * * *`) | Automatically refunds review requests stuck in `status=timeout` | Slack via `OPERATIONS_WEBHOOK_URL` |
| Reviewer deadline warnings | `GET /api/notifications/send-reviewer-deadline-warnings` | Daily at 4 AM (`0 4 * * *`) | Sends notifications to reviewers about upcoming deadlines | N/A |

Both endpoints also accept `POST` for manual runs. Add `?token=<CRON_SECRET>` to bypass the cron header when running from Postman/cURL.

## Payout Retry Runbook
1. **Alert surfaces**
   - Slack message from `[Cron] Retry payouts` summarises processed/success/failed.
   - Errors list request IDs and failure reason (insufficient funds, missing Connect account, DB update failure).
2. **Immediate actions**
   - If `error: Insufficient funds` → top up Stripe platform balance or wait for settlement, then re-run via `POST /api/payments/retry-failed-distributions` with `{ "limit": 25 }`.
   - If `error: Reviewer has no Stripe Connect account` → notify reviewer to finish onboarding (use `scripts/check-stripe-account-status.js`).
   - If DB update failed → inspect Supabase logs and re-run once issue resolved.
3. **Validation**
   - Query `requests` table for affected `id` to confirm `payment_distributed=true`, `payment_status='paid'`.
   - For manual verification, check Stripe dashboard → Transfers → search by `transfer_group=review_<id>`.
4. **Escalation**
   - If retries continually fail (>3 cron runs) escalate to finance lead; attach Slack thread + relevant logs.

## Timeout Refund Runbook
1. **Alert surfaces**
   - Slack `[Cron] Timeout refunds` summary with counts and first few errors.
2. **Immediate actions**
   - For Stripe errors (`amount_too_large`, `invalid_request`) verify `amount_cents` and `stripe_payment_intent_id` on the request record.
   - If refund failed because PaymentIntent missing → set `refund_status='failed'`, contact support to manually refund via dashboard.
3. **Manual re-run**
   - `POST /api/payments/process-timeout-refunds` with `{ "limit": 50 }` after fixing data/Stripe issue.
4. **Verification**
   - Ensure `requests.refund_status='refunded'`, `payment_status='refunded'`, `stripe_refund_id` populated.
   - Check Stripe dashboard → Payments → refunded state for the customer.

## Webhook Failure Runbook
1. Supabase `stripe-webhook` logs every event in `webhook_events` with statuses `processing/completed/failed`.
2. If alerts show `webhook signature verification failed` or events stuck in `failed`:
   - Fetch `webhook_events` rows for `status='failed'` and note `stripe_event_id`.
   - Re-run event with `stripe events resend <event_id> <endpoint>` after fixing cause (e.g., missing env keys).
3. The function updates `requests` on `payment_intent.succeeded/failed`, `charge.refunded`, disputes. Cross-check affected request rows to ensure statuses match Stripe.

## Support / On-call Checklist
1. **Before shift**
   - Verify Slack webhook alive (`OPERATIONS_WEBHOOK_URL`).
   - Confirm Vercel cron jobs enabled via `vercel cron ls`.
   - Run `scripts/check-stripe-account-status.js <acct>` for top reviewers if onboarding is in progress.
2. **During incident**
   - Capture: Stripe dashboard screenshot, relevant Supabase rows, API response (if manual re-run).
   - Update Slack thread with resolution + timestamp.
3. **After incident**
   - File ticket if code/data change required.
   - Document lessons learned in `docs/runbooks.md` (append section).

## Helpful Commands
```
# Manual payout retry of 5 records
curl -X POST https://www.appauro.com/api/payments/retry-failed-distributions \
  -H "Authorization: Bearer <service token>" \
  -H "Content-Type: application/json" \
  -d '{"limit":5}'

# Manual timeout refund sweep
curl -X POST https://www.appauro.com/api/payments/process-timeout-refunds \
  -H "Authorization: Bearer <service token>" \
  -H "Content-Type: application/json" \
  -d '{"limit":20}'
```


