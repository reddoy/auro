-- Migration: Add notifications for reviewers
-- This migration sets up notifications for:
-- 1. New review requests (handled in API route)
-- 2. Payment received (handled in API route)
-- 3. Review completed (handled via trigger)

-- Note: The actual notification sending is done via Supabase Edge Functions
-- This migration documents the notification flow but the actual HTTP calls
-- are made from the API routes and client code

-- Function to send notification when review is completed
-- This will be called from the client-side submitRequestReview function
-- or can be triggered via database trigger if pg_net extension is available

COMMENT ON TABLE requests IS 'Review requests table. Notifications are sent when: 1) New request created (to reviewer), 2) Payment distributed (to reviewer), 3) Review completed (to reviewer about submission success)';

