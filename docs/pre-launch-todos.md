# Pre-launch todo list

Last updated after notifications + payment hardening deploy.

## P0 — Before Stripe live / marketing

- [ ] **Vercel env vars** (Production + Preview): `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` — see [site/NOTIFICATIONS_SETUP.md](../site/NOTIFICATIONS_SETUP.md)
- [ ] **Confirm Supabase migration** `notification_deliveries` is applied on prod (applied 2026-05-29 via MCP; verify in dashboard if needed)
- [ ] **Reconcile decline refund DB sync** — E2E request `f7b01f0c` shows `refund_status=none` but Stripe may show refunded; run `/api/payments/refund` or manual DB sync after one fresh decline test
- [ ] **Fresh E2E: decline + refund** — paid → reviewer decline → `refund_status=refunded` + Stripe refund visible
- [ ] **Fresh E2E: timeout path** — backdate `paid`/`in_progress` → cron `process-timeout-refunds` → `status=timeout` + refund + reviewee/reviewer notifications

## P1 — Notifications verification

- [ ] Send test payment on staging/prod (test mode) and confirm **Resend** delivery for reviewer + reviewee receipt
- [ ] Opt in phone on request funnel; confirm **Twilio** SMS on “review ready”
- [ ] Check `notification_deliveries` rows for dedupe (no duplicate deadline warnings)
- [ ] Approve/deny a test reviewer application → applicant gets `reviewer_application_decision` email
- [ ] Submit reviewer rating → reviewer gets `reviewer_rating_received` email/SMS

## P2 — Polish

- [ ] Link to `/app/settings/notifications` from profile or app menu
- [ ] Spot-check auth emails still work (Supabase SMTP unchanged)
- [ ] Confirm crons in Vercel: 2am retry payouts, 3am timeout refunds, 4am deadline warnings
- [ ] Remove or secure local `test_accounts.txt` (credentials; not in repo)

## Done (reference)

- [x] Product notification layer (`notifyUser`, Resend, Twilio, `notification_deliveries`)
- [x] Timeout status + `handle_request_timeouts()` on prod
- [x] Timeout refund cron returns 200 on prod
- [x] Production deploy with notification routes + settings UI
- [x] Reviewee phone/SMS opt-in (AuthStep, checkout success)
- [x] Copy: “email and text” on request funnel
