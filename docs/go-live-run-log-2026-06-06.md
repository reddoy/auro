# Go-live run log — 2026-06-06

## Automated verification (pre–live key flip)

**Script:** `node scripts/verify-live-readiness.mjs`  
**Production deploy:** `dpl_5YDaW8zwaMbUjsrq3mWwnSMREvdX` → https://www.appauro.com

| Check | Result |
|-------|--------|
| Homepage | PASS (200) |
| `/api/stripe/webhook` GET | PASS (405) |
| Webhook POST without signature | PASS (400) |
| `/auth/sign-in`, `/auth/forgot-password`, `/auth/callback`, `/auth/confirm` | PASS (200) |
| `/request`, `/app` | PASS (200) |
| `NEXT_PUBLIC_SITE_URL` | PASS (`https://www.appauro.com`) |
| Vercel crons (3) | PASS (2am / 3am / 4am) |
| Supabase `notification_deliveries` | PASS |
| Supabase `handle_request_timeouts()` | PASS |
| `requests_status_check` includes `timeout` | PASS |
| Stripe publishable key | **PENDING** — still `pk_test_` until Vercel update |

## Your dashboard steps (remaining)

1. Stripe Live → webhook at `https://www.appauro.com/api/stripe/webhook` + copy `whsec_`
2. Vercel Production → `sk_live_`, `pk_live_`, live `whsec_`, live `acct_` (`acct_1S0Fm0BQDAObfzKx` per Stripe MCP live account)
3. Supabase Auth → Site URL + redirect URLs (see [go-live-checklist.md](go-live-checklist.md))
4. **Redeploy** after env var change
5. Re-run `node scripts/verify-live-readiness.mjs` — should show `pk_live_`

## Live smoke test (manual — after key flip)

| Step | request_id | Pass/Fail | Notes |
|------|------------|-----------|-------|
| Pay smallest tier | | | |
| Webhook 200 in Stripe | | | |
| Accept + submit | | | |
| Decline + refund (optional) | | | |

## Notifications

Deferred at launch. Product email/SMS skip silently until `RESEND_API_KEY` + Twilio vars are set (use `RESEND_API_KEY`, not `Resend_API_key`).
