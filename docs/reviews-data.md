<!-- Reviews & Data Integrity audit – generated 2025-11-21 -->
# Review Storage & Data Integrity

## Entities & Schema
- **Requests table (`requests`)**
  - Core fields: `photos` (string[]), `notes`, `review` (JSON payload containing ratings, section notes, optional `media.videoUrl`/`imageUrl`), `status`, `payment_status`, `review_viewed_at`.
  - Migrations add lifecycle helpers: `review_viewed_at` (`20251117_01_reviewee_feedback_prompt.sql`), payout tracking columns, refund metadata, etc.
  - RLS assumed from Supabase defaults (not shown here); verify review JSON is protected so only request owner + assigned reviewer can read.
- **Reviewer reviews (`reviewer_reviews` table)**
  - Created via `20250127_01_reviewer_reviews.sql`.
  - One row per request (UNIQUE `request_id`), linking reviewer and reviewee.
  - RLS policies allow: public SELECT, reviewee INSERT/UPDATE after request completion, reviewer visibility.
- **Legacy reviews (`reviews` table)**
  - Used for general platform reviews (authored vs subject). Accessed in `lib/profile.ts` (`getReviewsGiven`, `getReviewsReceived`).
- **Storage buckets**
  - Request media uploaded to `request-media` bucket via `lib/uploads.ts` with signed URLs cached/renewed.
  - Avatars stored in `avatars` bucket (see `lib/profile.ts`).

## App Logic Touchpoints
- `lib/api.ts`
  - `mapRequestRow` normalizes DB shape.
  - `submitRequestReview` enforces:
    - Valid `requestId`, rating bounds, presence of review object.
    - Race-condition guard: ensures request exists, not already completed, statuses limited to `in_progress` or `paid`.
    - Adds media metadata and atomically updates request (Supabase `.in('status', ['in_progress','paid'])`).
    - Triggers push notifications + payment distribution; logs errors without failing review.
  - `getRequestsByReviewer`, `getRequestsByUser`, `markReviewAsViewed`, `acceptRequest`, `denyRequest`, etc.
- `lib/profile.ts`
  - Handles `profiles.preferences` used for onboarding progress and for gating review creation/resume.
  - Provides `getReviewsGiven/Received` with pagination and archived filters.
- `supabase/functions` & migrations
  - Ensure DB-level constraints (CHECK rating 1-5, trigger for `updated_at`).
  - Additional migrations (e.g., `20250121_01_reviewer_count_function.sql`) used for analytics; confirm executed.

## UI Surfaces
- `app/(tabs)/requests/[id].tsx` (not opened here) displays review content using components like `VideoReviewSection`, `ReviewerReviewModal`, `ReviewStatusCard`.
- Reviewee feedback on reviewer triggered in `ReviewerReviewModal` -> `submitReviewerReview` (Lib API).
- Storage viewers: `PhotoCarousel`, `ImageGalleryModal`, `ZoomableImage` ensure signed URLs display safely.

## Integrity & Privacy Considerations
- `submitRequestReview` returns existing review if already completed, preventing duplicate writes (idempotence).
- JSON review stored inline; no schema validation server-side. Consider Supabase `jsonschema` validation or migration to structured tables for analytics.
- Reviewer reviews table enforces `UNIQUE(request_id)` but relies on DB constraint only—client also checks via `getReviewerReviewByRequestId`.
- Media uploads rely on signed URLs cached for 30 days; ensure background job cleans up orphaned files (`cleanup-orphaned-photos.sql` exists—schedule it).
- Need RLS confirmation:
  - Requests: ensure only owner/reviewer/service role can read `photos` + `review` fields.
  - Reviewer reviews: currently `SELECT` policy uses `true` (public). If data should be partially private, tighten policy.
- Data retention: specify policy for deleting requests/reviews upon user request (GDPR). Implement cascade deletes (requests -> reviewer_reviews ON DELETE CASCADE already set).

## Testing Checklist
1. **Create & Complete Request**
   - Upload multiple photos via `uploadRequestMedia`; verify files in `request-media` bucket and metadata stored in `requests.photos`.
   - Reviewer submits review; confirm `requests.review` JSON matches schema (ratings, section notes, `media` block).
   - Confirm `review_viewed_at` updates when reviewee opens content.
2. **Duplicate Submission Guard**
   - Attempt to submit review twice; expect API to return original row with warning and no state change.
3. **Reviewer Reviews**
   - As reviewee, submit rating/comment; ensure row inserted into `reviewer_reviews`, `rating_average` on reviewer profile recalculates.
   - Update existing reviewer review; check trigger updates `updated_at`.
4. **Permissions**
   - Attempt to fetch another user’s request via Supabase client; confirm RLS denies.
   - Ensure reviewer cannot edit review after submission (should require admin intervention).
5. **Media Lifecycle**
   - Revoke access (archived request) and validate signed URLs expire/resign.
   - Run `cleanup-orphaned-photos.sql` on staging to verify it only removes unused media.
6. **Archiving**
   - Archive/unarchive requests via `archiveRequest`/`unarchiveRequest`; ensure UI hides archived items unless toggled.
7. **Data Export/Delete**
   - Simulate privacy request: delete user via Supabase auth; confirm `requests` cascade (or plan manual cleanup).

## Findings & Recommendations
- Reviewer reviews table is publicly readable; if anonymity/privacy required, tighten SELECT policy or expose sanitized view.
- Review JSON stored inline limits analytics; consider migrating to structured tables or at least define JSON schema contract in docs/tests.
- No automated job enforces orphaned media cleanup—schedule script or Supabase Function to run nightly.
- Ensure `review_viewed_at` is set server-side for tamper-proof analytics (currently client-driven).
- Add monitoring for `requests.payment_distribution_error` + review submission errors (log aggregation).

