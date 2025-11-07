-- Migration: Add reviewer_reviews table
-- This allows reviewees to review reviewers after viewing their review

-- Create reviewer_reviews table
CREATE TABLE IF NOT EXISTS reviewer_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Ensure one review per request
  UNIQUE(request_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_reviewer_reviews_reviewer_id ON reviewer_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviewer_reviews_reviewee_id ON reviewer_reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviewer_reviews_request_id ON reviewer_reviews(request_id);

-- Add RLS policies
ALTER TABLE reviewer_reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view reviewer reviews (for public display)
CREATE POLICY "reviewer_reviews_select_public" ON reviewer_reviews
  FOR SELECT
  USING (true);

-- Policy: Reviewees can insert their own reviewer review for their completed request
CREATE POLICY "reviewer_reviews_insert_reviewee" ON reviewer_reviews
  FOR INSERT
  WITH CHECK (
    auth.uid() = reviewee_id AND
    EXISTS (
      SELECT 1 FROM requests
      WHERE requests.id = reviewer_reviews.request_id
      AND requests.user_id = auth.uid()
      AND requests.status = 'completed'
      AND requests.review IS NOT NULL
    )
  );

-- Policy: Reviewees can update their own reviewer review
CREATE POLICY "reviewer_reviews_update_reviewee" ON reviewer_reviews
  FOR UPDATE
  USING (auth.uid() = reviewee_id)
  WITH CHECK (auth.uid() = reviewee_id);

-- Policy: Reviewers can view reviews about them
CREATE POLICY "reviewer_reviews_select_reviewer" ON reviewer_reviews
  FOR SELECT
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reviewer_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER reviewer_reviews_updated_at
  BEFORE UPDATE ON reviewer_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_reviewer_reviews_updated_at();

-- Add comment
COMMENT ON TABLE reviewer_reviews IS 'Reviews that reviewees submit about reviewers after viewing their review';

