## Request Flow Automated Test Plan

### Unit Tests (React Testing Library + Jest)
1. **State Restoration Guard**
   - Mock `localStorage` with a valid `currentStep` to assert the component resumes that step.
   - Repeat with expired timestamp to confirm it resets to `intro` and clears storage.
2. **Auth Gate Transition**
   - Simulate `nextStep` from `consent` while `isAuthenticated=false`; expect `setCurrentStep('auth')`.
   - Ensure authenticated users proceed to `payment`.
3. **Creator Prefill**
   - Render with `window.location.search=?creatorSlug=tester`; verify `CreatorSelection` auto-selects slug and skips to `photo-upload`.
4. **Consent Persistence**
   - Fire `onConsentChange`; ensure `requestData.consent` and `localStorage` are updated.

### Integration Tests (Playwright)
1. **Happy Path (Web)**
   - Complete steps intro → payment using mock Supabase/Stripe.
   - Verify success screen and that local storage clears afterward.
2. **Deep Link From Mobile**
   - Start at `/request?creatorSlug=...&authCode=...`.
   - Confirm state restoration, automatic auth, and landing on `photo-upload`.
3. **OAuth Return**
   - Begin flow, pause at `auth`, simulate redirect with saved state, ensure flow resumes at `payment`.
4. **Upload Resilience**
   - Drop network mid-upload; confirm retry UI and no duplicate files left in storage bucket (mock storage API).
5. **Payment Failure**
   - Force Stripe failure; ensure user stays on `payment` with error message and no duplicate charge attempts.

### API Layer Tests (Supabase Edge Functions / Server Routes)
1. `/api/auth/app-session`
   - Exchange valid `authCode` → returns `accessToken`, `refreshToken`.
   - Invalid/expired code returns 4xx without session leakage.
2. `/api/auth/ensure-profile`
   - Creates missing profile and is idempotent.
3. Payment RPC
   - Valid payload creates request + Stripe intent.
   - Missing consent/photos rejects with actionable error.

### Tooling
- Reuse existing Jest config under `site/`.
- Playwright runs via `npx playwright test --config site/playwright.config.ts` (add if missing).
- Mock Supabase with `@supabase/supabase-js` spies; isolate storage interactions.

