## Request Flow Overview

### Step Sequence
1. `intro` → hero messaging. Advances via `IntroStep.onNext`.
2. `creator-selection` → `CreatorSelection` fetches `profiles` to choose reviewer; persists `creatorId/creatorSlug`.
3. `photo-upload` → `PhotoUpload` uploads to Supabase Storage within `uploadSessionId`; requires anonymous auth for temp uploads.
4. `prompt-answers` → `PromptAnswers` writes long-form context and fetches reviewer metadata when needed.
5. `consent` → `ConsentForm` locks the legal acknowledgement (`shareOnSocial` + timestamp) before checkout.
6. `auth` → `AuthStep` handles email/password, OAuth, or deep-link auth (`authCode`). Blocks payment.
7. `payment` → `PaymentStep` charges via Stripe + Supabase RPC, sets `requestId`.
8. `download-app` → `DownloadApp` provides platform handoff after success.

### Entry Paths & Shortcuts
- Default web traffic enters `intro` then `creator-selection`.
- Deep links from mobile send `creatorSlug|creatorId` (and optional `authCode`), skipping straight to `photo-upload`.
- OAuth return restores state from `localStorage.auro_request_flow_state` if <30 minutes old, preventing data loss.

### State Management
- `requestData` keeps creator info, photos, message, consent, IDs. Saved on every change plus step change via `saveFlowState`.
- `currentStep` restored from local storage; refs ensure persistence across async auth callbacks.
- `uploadSessionId` persists per-browser for grouping temp files; generated once.

### Access Control
- Browsing allowed through `consent` without login. Attempting to advance to `payment` while unauthenticated automatically diverts to `auth`.
- Auth listener auto-advances to `payment` once a real (non-anon) Supabase user session exists.
- Anonymous sign-in occurs for storage even when a real session is absent, ensuring uploads work.

### External Dependencies
- Supabase auth + storage (deep link session exchange via `/api/auth/app-session`, profile ensure via `/api/auth/ensure-profile`).
- Stripe integration inside `PaymentStep`.
- Creator data from `profiles` table with `is_reviewer='approved'`.

### Edge Handling
- Scroll reset on step change for consistent UX.
- Expired saved state (>30 min) purged to avoid stale data.
- If configuration missing (`supabaseClient` null), renders blocking error page.
- Intro rendering waits until `authChecked` to prevent flicker for deep links.











