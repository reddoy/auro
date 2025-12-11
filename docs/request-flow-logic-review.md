## Request Flow Logic Review

### 1. State Mutation During Render
```
725:729:site/app/request/page.tsx
    if (currentStep === 'payment' && !isAuthenticated) {
      // If somehow they got to payment without auth, redirect to auth
      setCurrentStep('auth');
      return null;
    }
```
- Calling `setCurrentStep` while React is rendering causes warnings and in React 18 strict mode can trigger render loops.
- Fix: gate the transition inside an effect that watches `currentStep`/`isAuthenticated`, or intercept earlier inside `nextStep`.

### 2. Flow State Never Cleared After Success
```
800:815:site/app/request/page.tsx
      <PaymentStep
        requestData={requestData}
        onSuccess={(requestId) => {
          updateRequestData({ requestId });
          nextStep();
        }}
```
- Local storage (`auro_request_flow_state`) persists photos, consent, creator choice indefinitely because nothing clears it after `download-app`.
- Returning users (or shared devices) reopen the page and land mid-flow with someone else’s data. Clear saved state once payment succeeds or when entering `download-app`.

### 3. Duplicate Anonymous Sign-In Attempts
```
499:516:site/app/request/page.tsx
      if (!isRealUser) {
        try {
          await client.auth.signInAnonymously();
        } catch (anonErr) {
          console.warn('Anonymous sign-in failed:', anonErr);
        }
      }
      
      // Now sign in anonymously for storage uploads (only if needed)
      try {
        const { data: { user } } = await client.auth.getUser();
        if (!user) {
          await client.auth.signInAnonymously();
        }
      } catch (anonErr) {
        console.warn('Anonymous sign-in failed:', anonErr);
      }
```
- The second block repeats anonymous sign-in immediately, even if the first call already signed the user in.
- Results in redundant Auth API traffic and intermittent auth errors when Supabase rejects fast repeated anonymous sessions.
- Fix: call `getUser` once, sign in anonymously only if `user` is missing, and reuse result for both cases.

### 4. Step Restoration Without Validation
- `restoreFlowState` trusts any `step` saved in local storage and calls `setCurrentStep(stepToRestore)` without verifying it’s part of `STEPS`.
- Malformed or tampered data can push users into non-existent steps, breaking rendering (switch returns `undefined`).
- Validate with `STEPS.includes(stepToRestore as Step)` before restoring, mirroring the guard used in the initializer.

### Additional Observations
- Auto-scroll effect targets multiple DOM nodes; when elements disappear between steps it occasionally throws and falls back—already caught by try/catch, so no action required.
- Supabase config guard correctly blocks rendering when env vars are missing.

### Recommended Next Actions
1. Move the payment/auth guard into an effect or `nextStep`.
2. Clear `auro_request_flow_state` once `requestId` is set or when the user reaches `download-app`.
3. Collapse duplicate anonymous sign-in logic.
4. Add `STEPS.includes` guard inside `restoreFlowState`.




