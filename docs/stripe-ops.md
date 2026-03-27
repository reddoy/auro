<!-- Stripe ops + monitoring plan – generated 2025-11-21 -->
# Stripe Ops, Webhooks, and Monitoring

## Key Inventory
- **Secrets**
  - `STRIPE_SECRET_KEY` — required in Supabase Edge (`payments-create-sheet`, `stripe-webhook`) and Next.js API routes under `site/app/api/payments/**`.
  - `STRIPE_PUBLISHABLE_KEY` — configured for web via `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
  - `STRIPE_WEBHOOK_SECRET` — used in `supabase/functions/stripe-webhook`.
  - `STRIPE_PLATFORM_ACCOUNT_ID` — platform account the payout retries use (replaces hard-coded acct id).
  - `OPERATIONS_WEBHOOK_URL` (or `SLACK_WEBHOOK_URL`) — Slack channel for alerts triggered by cron jobs / failures.
  - `CRON_SECRET` (optional) — shared token to manually trigger cron endpoints outside of Vercel.
- **Edge Functions**
  - `payments-create-sheet` → creates customers, PaymentIntents, ephemeral keys.
  - `connect-express-login` / `connect-express-onboarding` → Connect flows.
  - `stripe-webhook` → now updates `requests` on `payment_intent.succeeded/failed`, charge refunds, and disputes with idempotency via `webhook_events`.
- **Next.js API routes (`site/app/api/payments/*`)**
  - Handle reviewer payment distribution, refunds, timeout refunds, retries.
  - Depend on Supabase service key for DB updates and emit ops alerts on failure.
- **Node scripts (`scripts/*.js`)**
  - Diagnostics: account status, balances (`test-stripe-balance.js`), payouts (`test-payout*.js`), transfers.
  - Use `STRIPE_SECRET_KEY` via `.env`; run locally for recovery.

## Webhook Strategy
1. **Supabase `stripe-webhook`**
   - Endpoint: `https://<project-ref>.functions.supabase.co/stripe-webhook`.
   - Validates signatures, records idempotent events, and updates `requests` on `payment_intent.succeeded/failed`, `charge.refunded`, and `charge.dispute.created`.
2. **Next.js/Vercel endpoint (optional)**
   - If marketing site also needs webhooks (e.g., for Checkout sessions), add `/api/webhooks/stripe`.
3. **Connect Events**
   - Subscribe to `account.updated`, `payout.failed`, `charge.dispute.created` to monitor reviewer accounts.
4. **Testing**
   - Use `stripe trigger` CLI against Supabase function URL; confirm `webhookSecret` matches dashboard.

## Monitoring & Alerting Plan
- **Logging**
  - All payment/refund API routes log to server console (Vercel). Ensure logs ship to monitoring (e.g., Logtail, Datadog) for alerting on errors containing `payment_distribution_error`, `INSUFFICIENT_FUNDS`, etc.
  - Supabase Edge logs accessible via `supabase functions logs`; document SOP for on-call.
- **Metrics**
  - Track:
    - Payments initiated vs succeeded.
    - Transfers queued vs completed (fields in `requests`).
    - Refund counts/reasons.
    - Connect onboarding completion (profiles with `stripe_connect_account_id` + `payouts_enabled`).
  - Build Supabase SQL views for dashboards (e.g., in Metabase, Grafana).
- **Cron jobs & Alerts**
  - Vercel `vercel.json` schedules:
    - `/api/payments/retry-failed-distributions` hourly (retries failed reviewer payouts).
    - `/api/payments/process-timeout-refunds` every 30 minutes (auto-refunds expired requests).
  - Both endpoints accept GET (cron) and POST (manual) and emit Slack alerts via `OPERATIONS_WEBHOOK_URL` when processed or when failures occur.
  - Additional alerts:
    - `payment_distribution_error` not null.
    - `refund_status='failed'`.
    - Webhook signature failures.
    - Balance shortfalls (scripts or Stripe balance webhook).
  - Consider Stripe Radar alerts for disputes/chargebacks.
- **Runbooks**
  - Document manual steps using scripts (`check-stripe-account-status.js`, `test-payment-api.js`, etc.) to validate accounts/balances before large releases.
  - Add README in `scripts/` referencing required env vars and typical troubleshooting flow.

## Key Checks Before Launch
1. **Secret Rotation**
   - Rotate Stripe keys; store in:
     - Supabase project secrets (`supabase secrets set`).
     - Vercel/host env for Next.js.
    - Web host env vars for public publishable key and secure server secrets.
2. **Webhook Verification**
   - Confirm production webhook endpoint is reachable (HTTP 200) and secret matches Stripe dashboard.
   - Add dead-letter queue / logging for failed webhook processing.
3. **Connect Readiness**
   - Run `scripts/check-stripe-account-status.js <acct>` for seed reviewers to ensure `charges_enabled` and `payouts_enabled`.
   - Validate onboarding URLs (Edge functions) produce live-mode links.
4. **Balance Sources**
   - Payment distribution uses platform available balance; ensure funding cadence (Stripe payouts) keeps balance positive.
   - Configure alert when available balance < threshold (e.g., $200).
5. **Disaster Recovery**
   - Keep list of manual payout steps in case automation fails (Stripe Dashboard transfer, then update `requests` row).
   - Implement idempotency keys for transfer/retry endpoints (currently relies on DB checks; consider `idempotency_key = requestId` header).
6. **Compliance**
   - Document PCI responsibilities (Stripe handles card data; ensure no card info stored).
   - Provide support instructions for disputes, refunds beyond automated flows.

## Outstanding Gaps
- Ensure `STRIPE_PLATFORM_ACCOUNT_ID`/`CRON_SECRET`/`OPERATIONS_WEBHOOK_URL` are set in each environment.
- Consider persisting cron run results (e.g., `ops_events` table) for audit retention beyond Slack.
- Extend webhook coverage for `payment_intent.canceled`, Connect `payout.failed`, and add automatic retries for disputes after resolution.
- Scripts rely on local `.env`; add sample `.env.example` outlining required variables and warn against committing secrets.
- Confirm embedded iOS browser guardrails are working for `?src=ios` links on mobile web.

