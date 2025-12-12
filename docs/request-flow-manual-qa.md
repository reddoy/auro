## Manual QA Script

### Devices & Builds
- Test on iOS TestFlight + Android internal app + responsive web (Chrome + Safari).
- Use production-like Supabase/Stripe sandbox with feature flags mirroring launch config.

### Core Journey
1. **New web visitor**
   - Load `/request` with clean storage; confirm intro renders after auth check.
   - Complete creator selection, upload at least three photos, provide prompts, accept consent, authenticate, pay, reach download screen.
2. **Mobile deep link**
   - Tap CTA inside app: ensures URL parameters prefill reviewer and skip to photo upload.
   - Verify attribution flag `?src=ios` hides web purchase CTA if required.
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
- [ ] Enable Sentry (web + native) with release tags.
- [ ] Verify analytics events for each step, including failures.
- [ ] Log payment attempt IDs + request IDs for reconciliation.

### Store Readiness
- [ ] App metadata, screenshots, privacy policy, support URL updated.
- [ ] Review guidelines satisfied (no external purchase prompts in iOS flow if `src=ios`).
- [ ] Deep link routing tested via universal links/app links.

### Operations
- [ ] Runbook for support escalations linked in `docs/runbooks.md`.
- [ ] Manual refund instructions verified (`docs/payments-refunds.md`).
- [ ] On-call contact for launch window confirmed.





