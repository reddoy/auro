## Manual QA Script

### Devices & Builds
- Test on responsive web (desktop + mobile browsers: Chrome + Safari).
- Use production-like Supabase/Stripe sandbox with feature flags mirroring launch config.

### Core Journey
1. **New web visitor**
   - Load `/request` with clean storage; confirm intro renders after auth check.
   - Complete creator selection, upload photos, authenticate, pay (Stripe test card), confirm payment disclaimer is visible, land on checkout success then `/app/requests`.
2. **Mobile deep link**
   - Tap CTA from social/mobile browser: ensures URL parameters prefill reviewer and skip to photo upload where supported.
   - Verify iOS in-app browser messaging appears when checkout is blocked in embedded browser contexts.
3. **OAuth interruption**
   - Start from desktop, progress to auth, initiate Google sign-in, close browser, reopen link; ensure state restores and continues at payment.
4. **Payment failure + retry**
   - Simulate declined card; confirm error messaging, no double charges, retry succeeds.
5. **Back navigation**
   - Use browser back/forward between steps without losing uploaded assets.
6. **Offline / flaky network**
   - Toggle offline during upload or payment; ensure user-facing error and recoverable state.

### Edge Cases
- Missing reviewer (clear selection mid-flow) → user prompted again before upload.
- Consent toggle disabled until checkbox clicked; timestamp captured.
- Authenticated user returning to intro resumes at last valid step.
- Local storage cleared after successful request; verify new session starts clean.

## Launch Checklist
### Functional
- [ ] Supabase env vars (`NEXT_PUBLIC_SUPABASE_URL/ANON`) set for production build.
- [ ] `/api/auth/app-session` and `/api/auth/ensure-profile` deployed + tested.
- [ ] Stripe keys + webhook endpoint configured; live mode tested with $0.50 charge.
- [ ] Anonymous storage bucket CORS + size limits validated.

### Monitoring & Analytics
- [ ] Enable Sentry (web) with release tags.
- [ ] Verify analytics events for each step, including failures.
- [ ] Log payment attempt IDs + request IDs for reconciliation.

### Web Readiness
- [ ] Landing page, privacy policy, and support URL updated.
- [ ] Checkout guardrails for embedded iOS browser contexts verified.
- [ ] Mobile web routing tested from social and messaging links.

### Operations
- [ ] Runbook for support escalations linked in `docs/runbooks.md`.
- [ ] Manual refund instructions verified (`docs/payments-refunds.md`).
- [ ] On-call contact for launch window confirmed.

Full staging matrix: see [`staging-e2e-matrix.md`](staging-e2e-matrix.md).

### Reviewer app + API (staging)
- [ ] Sign in as the assigned reviewer; open `/app/requests/reviewer/<id>`; **Accept** moves request to in-progress (check `accept_by` / `deliver_by`).
- [ ] **Decline** on a paid test request refunds the customer (Stripe test refund + `requests` status/refund fields). Requires `CRON_SECRET` in Vercel so the server can call `/api/payments/refund` with `x-auro-internal`.
- [ ] **Submit review** completes the request and triggers `/api/payments/distribute-reviewer-payment` (watch logs for Connect errors on test accounts).
- [ ] After applying Supabase migration `20260413120000_requests_rls_and_update_guard.sql`, repeat the above from the browser (RLS + column trigger should still allow these flows via API routes; direct client updates to money columns should fail).

### Stripe webhook (staging dashboard)
- [ ] Webhook endpoint receives `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed` (latter two if you test async payment methods).










