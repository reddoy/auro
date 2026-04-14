<!-- Payments & Refunds audit – generated 2025-11-21 -->
# Payments, Refunds & Stripe Logic

## Architecture Overview
- **Client payment capture**
  - Uses Stripe Checkout from web/mobile web flows.
  - Requests checkout sessions through `site/app/api/checkout/create-session/route.ts`.
  - Requires `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and server-side `STRIPE_SECRET_KEY`.
- **Request lifecycle**
  - Successful payment populates `requests` row with Stripe metadata (session, payment_intent, amount, application_fee, etc.).
  - Reviewer accepts → completes review → `submitRequestReview` in `lib/api.ts` calls authenticated `POST /api/reviews/submit`, which updates `requests` with the service role and then calls `distribute-reviewer-payment`.
  - Payment distribution checks Connect account, available balance, and updates `requests.payment_status`, `payment_distributed`, `stripe_transfer_id`.
- **Refund handling**
  - `site/app/api/payments/refund/route.ts` supports manual + automatic refunds (full or partial) using `requests` data. **Auth:** callers must be (a) Vercel cron (`x-vercel-cron`), (b) trusted internal (`x-auro-internal: CRON_SECRET`), (c) the reviewer assigned to the request (Supabase JWT), or (d) a configured admin. Set `CRON_SECRET` in Vercel so server routes (e.g. dispute resolution, reviewer decline) can invoke refunds safely.
  - Timeout automation: `site/app/api/payments/process-timeout-refunds` refunds requests stuck in `status=timeout` (uses Stripe directly, not the refund route).
  - Reviewer denial: `POST /api/reviews/deny` updates status then calls `/api/payments/refund` with `x-auro-internal`.
- **Ops & Recovery**
  - `site/app/api/payments/retry-distribution` & `retry-failed-distributions` reprocess failed transfers with balance checks.
  - Scripts under `scripts/*.js` (e.g., `test-payment-api.js`, `check-reviewer-payments.js`) help validate Stripe accounts locally (requires `.env` with Stripe keys).
  - Next.js `site/app/api/stripe/webhook` handles Checkout completion, async payment success/failure, and refund-related events; keep `webhook_events` idempotency table in sync. Supabase Edge `stripe-webhook` may still exist for legacy paths—deduplicate endpoints in Stripe Dashboard so only one stack owns each event type in production.

## Data & Secrets
- `requests` table fields involved: `amount_cents`, `application_fee_cents`, `stripe_session_id`, `stripe_payment_intent_id`, `payment_distributed`, `reviewer_amount_cents`, `payment_status`, `refund_status`, `refunded_amount_cents`, `payment_distribution_error`, `payment_distribution_attempts`, `refund_reason`.
- Environment variables:
  - **Client**: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  - **Supabase Functions**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
  - **Next.js backend**: `STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `EXPO_ACCESS_TOKEN` (for push), optional `SLACK_WEBHOOK`.
  - **Stripe Connect**: Reviewer onboarding endpoints rely on `connect-express-onboarding/login` functions; confirm `EXPO_PUBLIC_SUPABASE_FN_*` overrides in production if using custom domains.
- Hard-coded values:
  - `distribute-reviewer-payment` uses `auroAccountId = 'acct_1S0FmFBCrjcqavov'` (test). Must replace with live account before launch.
  - Notification + payment distribution hits `https://www.appauro.com` even in non-prod builds; consider staging toggles.

## Testing Checklist
1. **PaymentSheet Happy Path**
   - Create request as reviewee; ensure PaymentSheet initializes and completes using live publishable key.
   - Verify `requests` row updates (`status='paid'`, `payment_status='paid'`, Stripe IDs stored).
2. **Error Handling**
   - Simulate declined card → ensure PaymentSheet error surfaces to user and no request created / remains pending.
   - Pull network mid-payment; confirm retries or fail-safe instructions.
3. **Reviewer Acceptance & Distribution**
   - Complete review; confirm `submitRequestReview` triggers distribution API, `payment_distributed` flips true, and reviewer receives push + Connect payout.
   - Test reviewer lacking Connect account to ensure helpful error (NO_CONNECT_ACCOUNT) and statuses remain `payment_status='queued'`.
4. **Insufficient Funds Scenario**
   - Temporarily reduce platform balance (Stripe test) to hit `INSUFFICIENT_FUNDS`; ensure error stored in `requests.payment_distribution_error` and manual retry path documented.
5. **Refund Triggers**
   - Reviewer denies request: `denyRequest` should switch status to `rejected`, call refund API, set `refund_status`.
   - Timeout auto refund: Set up cron hitting `/api/payments/process-timeout-refunds`; verify limited to `status='timeout'`.
   - Partial refund path with `amountCents` parameter; confirm cumulative limits enforced.
6. **Retry Jobs**
   - Add failed distribution row, call `/api/payments/retry-distribution` (single) and `/api/payments/retry-failed-distributions` (batch). Ensure rate limits respected (200ms delay).
   - Observe logging/alerts for persistent failures.
7. **Stripe Webhooks**
   - Send test `payment_intent.succeeded` to Supabase function; verify signature validation and plan enhancement to update `requests`.
8. **Embedded Browser Compliance**
   - Confirm embedded iOS in-app browsers show fallback messaging and do not allow blocked checkout paths where applicable.
9. **Security**
   - Ensure `SUPABASE_SERVICE_ROLE_KEY` only used server-side (Next.js APIs). Mobile app must never embed it.
   - Run through `scripts/test-*` utilities with live keys in a secure environment to confirm Connect accounts & balances prior to launch.

## Findings & Gaps
- Publishable key placeholder + hard-coded platform account ID block production readiness.
- Payment distribution endpoint references static test account; needs environment-specific value + secret storage (ENV).
- Stripe webhook handler currently noop; without status syncing, manual reconciliation required. Implement DB update or rely solely on API flow but document.
- Missing automated scheduler to call `/api/payments/process-timeout-refunds` & `/api/payments/retry-failed-distributions`; set up cron (e.g., Vercel cron, Supabase Scheduled Functions, or external job).
- Need alerts/monitoring when `payment_distribution_error` or `refund_status='failed'` occurs (Slack/email).
- Verify `?src=ios` guardrails still work for embedded browser contexts on mobile web.

## Next Actions
- Replace placeholder Stripe keys and `auroAccountId`, store via secure secrets (EAS, Vercel, Supabase).
- Document runbooks for refunds and payouts (link to scripts) to hand to support/on-call.
- Add integration tests (can be Postman/Thunder Client collection) covering payment + refund endpoints with mock data.

