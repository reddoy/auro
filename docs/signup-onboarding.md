<!-- Signup & Onboarding deep dive – generated 2025-11-21 -->
# Signup & Onboarding Validation Notes

## Flow Map
1. **Entry Screen** `app/auth.tsx`
   - Tabs for Login / Sign Up / Forgot password.
   - Auth methods: Email+password (Supabase) and Google OAuth (`supabase.auth.signInWithOAuth`).
   - Signup collects name, DOB (18+ validation), phone, password with strong policy.
   - Metadata persisted via Supabase `signUp.options.data`, profile row ensured via `ensureProfileForCurrentUser()`.
2. **Email Confirmation** `app/auth/confirm.tsx`
   - Handles OTP verification by reading `token_hash` + `type` query params.
   - On success ensures profile, then routes to `/onboarding/push-notifications`.
   - Uses `site/email-templates/confirm-signup.html` copy and `supabase.auth.resend` for retries/rate limits.
3. **Onboarding Funnel** (`app/onboarding/**`)
   - `push-notifications` → `enable-notifications` (permission prompt & fallback) → `role-selection`.
   - Branch:
     - **Reviewee path** `onboarding/reviewee/*` for profile pic, goals, sample photos.
     - **Reviewer path** `onboarding/reviewer/*` for bio, skills, pricing, availability, Stripe Connect linking.
   - State tracked in `profiles.preferences` via `updateProfilePreferences`: `onboarding_step`, `onboarding_role`, `onboarding_completed`.
4. **Post-Onboarding**
   - Routes to `(tabs)/requests` or reviewer dashboards.
   - MFA flows available under `app/two-factor-*` (optional but ensure templates `site/email-templates/mfa-added.html`, etc. are wired).

## Data Touchpoints
- **Supabase Auth**: email confirmation, Google OAuth, password reset (redirect to web auth routes).
- **Profiles table**: `ensureProfileForCurrentUser()` seeds row; `lib/profile.ts` manages preferences & metadata.
- **Storage**: avatar uploads via Supabase Storage bucket `avatars` (configurable through `EXPO_PUBLIC_SUPABASE_AVATAR_BUCKET`).
- **Notifications**: onboarding prompts rely on Expo push; backend endpoints at `https://www.appauro.com/api/notifications/*`.
- **Email templates**: HTML under `site/email-templates/`; follow instructions in `site/AUTH_EMAIL_SETUP.md` to keep Supabase templates synced.

## Manual Test Checklist
1. **Initial Signup (Email)**
   - Happy path: new email → receives confirmation template (desktop & mobile mail clients) → deep link returns to app and advances to onboarding.
   - Negative tests: weak password, underage DOB, duplicate email, rate limit/resend throttle.
   - Ensure metadata (name, phone) visible in Supabase `auth.users` + `profiles`.
2. **Google OAuth**
   - Confirm redirect URI for web (`https://app.appauro.com/auth/callback`) works on desktop and mobile browsers.
   - Validate unverified Google emails trigger confirm screen (see `handleGoogleSignIn` logic).
3. **Forgot Password**
   - Trigger from login tab; confirm Supabase email uses correct branding and recovery deep link.
   - Validate cooldown messaging when throttled.
4. **Onboarding Path – Reviewee**
   - Run through each screen under `app/onboarding/reviewee/*`, verifying that abandoning/resuming respects `preferences.onboarding_step`.
   - Confirm `updateProfilePreferences` writes expected flags (inspect via Supabase dashboard).
   - Validate media uploads (profile photos) reach Supabase Storage and signed URLs render in app.
5. **Onboarding Path – Reviewer**
   - Walk through `onboarding/reviewer/*` screens, including package creation and Stripe Connect linking flows.
   - Ensure Connect onboarding uses the correct environment (test vs live) before production.
6. **Notification Permissions**
   - Mobile web: verify notification prompts and fallback instructions where browser permissions are supported.
   - Backend: confirm Expo push tokens stored and `send-push-notification` Edge function can reach device.
7. **MFA / Security**
   - Add/remove MFA flows (`app/two-factor-setup.tsx`, templates `site/email-templates/mfa-*`). Confirm QR + backup codes stored securely.
8. **Crash/Cold Start Resilience**
   - Force close mid-onboarding; relaunch to ensure resume at correct step and cannot access `(tabs)` before onboarding_complete (unless user taps “Skip”).

## Findings & Gaps
- `app.json` still uses placeholder Stripe publishable key; update before shipping (also affects payment setup screens during onboarding).
- OAuth + email flows rely on production URLs (`https://www.appauro.com`) even in dev; double-check staging base to avoid triggering live automations while testing.
- No automated e2e coverage—consider adding Detox/Playwright runs for signup and onboarding form validation.
- Need explicit QA notes for `profiles.preferences` migrations (latest `20251117_01_reviewee_feedback_prompt.sql`); ensure production DB migrated before onboarding tests.
- Confirm SendGrid/Resend keys configured so `site/email-templates` render correctly in Supabase auth + transactional emails.

## Suggested Tooling
- Supabase Auth log viewer for monitoring OTP/resend events.
- Expo Go for quick UI smoke tests + EAS internal builds for push/notifications.
- Feature flag via `profiles.preferences.debug_skip_onboarding` (add if missing) to unblock testers without compromising analytics.

