<!-- QA matrix & launch plan – generated 2025-11-21 -->
# QA Matrix & Launch Playbook

## QA Matrix
| Area | Test Cases | Environments | Devices |
| --- | --- | --- | --- |
| Auth & Signup | Email signup/login, Google OAuth, forgot password, email confirmation deep links, MFA add/remove | Supabase staging + production (with test accounts) | iPhone 15 Pro (iOS 18), iPhone SE 3 (iOS 16), Android Pixel 7 (Android 14), Web (Safari/Chrome) |
| Onboarding | Push permission flows, role selection, reviewee & reviewer branches, resume after crash, profile media upload | Expo Go (dev), EAS internal build, TestFlight | Same as above + low-memory Android |
| Payments | PaymentSheet init, decline handling, network loss retry, request creation, UI states | Supabase staging with Stripe test keys | Native devices only (Stripe RN) |
| Refunds | Reviewer deny auto-refund, timeout refunds job, manual partial refund via API, status updates | Staging + scripted production dry run (small amount) | Server-side |
| Reviews | Reviewer submission, duplicate guard, reviewee viewing, reviewer reviews (rating/comment), media playback | Staging data seeding | iOS/Android |
| Notifications | Expo push token capture, review submission push, payment payout push, email templates rendering | Staging + production (test segment) | Physical devices + email clients |
| Webhooks & Ops | Stripe webhook signature validation, retry endpoints, cron/scheduler triggers, logging/alerts | Staging → production dry run | Server-side |

### Additional Scenarios
- Localization/timezone sanity (dates in onboarding + review timestamps).
- Accessibility (VoiceOver, Dynamic Type) on auth/onboarding screens.
- Offline handling (airplane mode) when viewing requests or submitting reviews.
- Deep link flows: `auro://auth/callback`, universal link `https://app.appauro.com/…`.

## Launch Playbook
1. **Pre-Launch (T-7 to T-2 days)**
   - Freeze schema + run Supabase migrations on staging, then prod.
   - Replace Stripe placeholders (publishable, secret, platform account envs) and confirm via dashboard.
   - Update Expo/EAS secrets (Supabase URL/key, Stripe publishable, API URL).
   - Verify Apple App Store metadata, screenshots, privacy policy URLs.
   - Ensure marketing site handles `?src=ios` logic for purchase CTA suppression.
2. **Build & QA (T-2 to T-1)**
   - Kick off EAS production build (iOS + Android); install TestFlight / Internal App Sharing.
   - Execute QA matrix; log results + screenshots.
   - Run automated or scripted API tests for payments/refunds.
   - Dry-run cron jobs (`process-timeout-refunds`, `retry-failed-distributions`) with staging data.
3. **Go/No-Go Checklist (Launch Day)**
   - Confirm Supabase + Vercel deployments healthy (no pending migrations).
   - Stripe dashboard: available balance > target threshold, webhook status green.
   - Monitoring dashboards (log drain, error tracking, analytics) displaying real-time data.
   - Support team briefed with runbooks (refunds, payouts, reviewer onboarding).
4. **Release Steps**
   - Submit App Store build for review (if not already approved) or schedule phased release.
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
     - Revert to previous app version (App Store phased release can be halted).
     - Communicate to users via email/push if needed.

## Deliverables Tracking
- Inventory (`docs/inventory.md`)
- Signup/Onboarding validation (`docs/signup-onboarding.md`)
- Payments & refunds audit (`docs/payments-refunds.md`)
- Reviews data integrity (`docs/reviews-data.md`)
- Stripe ops plan (`docs/stripe-ops.md`)

Keep these docs updated as fixes land; attach to release PR/App Store submission package.

