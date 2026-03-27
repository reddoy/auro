<!-- QA matrix & launch plan – generated 2025-11-21 -->
# QA Matrix & Launch Playbook (Web + Mobile Web)

## QA Matrix
| Area | Test Cases | Environments | Devices |
| --- | --- | --- | --- |
| Auth & Signup | Email signup/login, Google OAuth, forgot password, email confirmation links, MFA add/remove | Supabase staging + production (with test accounts) | Web desktop + mobile browsers (Safari/Chrome) |
| Onboarding | Role selection, reviewee & reviewer branches, resume after refresh, profile media upload | Web staging + production | Desktop + mobile web |
| Payments | Stripe Checkout init, decline handling, network loss retry, request creation, UI states | Supabase staging with Stripe test keys | Desktop + mobile web |
| Refunds | Reviewer deny auto-refund, timeout refunds job, manual partial refund via API, status updates | Staging + scripted production dry run (small amount) | Server-side |
| Reviews | Reviewer submission, duplicate guard, reviewee viewing, reviewer reviews (rating/comment), media playback | Staging data seeding | Desktop + mobile web |
| Notifications | Email notifications and in-app web states | Staging + production (test segment) | Desktop + mobile web + email clients |
| Webhooks & Ops | Stripe webhook signature validation, retry endpoints, cron/scheduler triggers, logging/alerts | Staging → production dry run | Server-side |

### Additional Scenarios
- Localization/timezone sanity (dates in onboarding + review timestamps).
- Accessibility (VoiceOver, Dynamic Type) on auth/onboarding screens.
- Offline handling (airplane mode) when viewing requests or submitting reviews.
- Mobile web routing flows: `https://app.appauro.com/...`.

## Launch Playbook
1. **Pre-Launch (T-7 to T-2 days)**
   - Freeze schema + run Supabase migrations on staging, then prod.
   - Replace Stripe placeholders (publishable, secret, platform account envs) and confirm via dashboard.
   - Verify web env vars and secrets (Supabase URL/key, Stripe publishable, API URL).
   - Validate landing, privacy policy, terms, and support pages for current web messaging.
2. **Build & QA (T-2 to T-1)**
   - Deploy staging and production preview builds for the web app.
   - Execute QA matrix; log results + screenshots.
   - Run automated or scripted API tests for payments/refunds.
   - Dry-run cron jobs (`process-timeout-refunds`, `retry-failed-distributions`) with staging data.
3. **Go/No-Go Checklist (Launch Day)**
   - Confirm Supabase + Vercel deployments healthy (no pending migrations).
   - Stripe dashboard: available balance > target threshold, webhook status green.
   - Monitoring dashboards (log drain, error tracking, analytics) displaying real-time data.
   - Support team briefed with runbooks (refunds, payouts, reviewer onboarding).
4. **Release Steps**
   - Enable marketing campaigns + update landing pages.
   - Announce to beta group; monitor metrics (signup rate, payment success) hourly for first 24h.
5. **Post-Launch Monitoring**
   - Alerts for payment/refund failures piped to Slack/on-call.
   - Track Supabase resource usage (connections, row limits).
   - Review Crashlytics/Sentry for spikes; triage within SLA.
6. **Rollback Plan**
   - If critical issue:
     - Pause marketing + disable signup CTA (feature flag or maintenance screen).
     - For payments, disable PaymentSheet by toggling `webCheckoutEnabled` or returning maintenance message from Edge function.
    - Roll back to previous web deployment.
     - Communicate to users via email/push if needed.

## Deliverables Tracking
- Inventory (`docs/inventory.md`)
- Signup/Onboarding validation (`docs/signup-onboarding.md`)
- Payments & refunds audit (`docs/payments-refunds.md`)
- Reviews data integrity (`docs/reviews-data.md`)
- Stripe ops plan (`docs/stripe-ops.md`)

Keep these docs updated as fixes land; attach to release PR.

