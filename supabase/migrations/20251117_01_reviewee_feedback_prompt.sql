-- Track when a reviewee has viewed their completed review
ALTER TABLE requests
ADD COLUMN IF NOT EXISTS review_viewed_at TIMESTAMPTZ;

COMMENT ON COLUMN requests.review_viewed_at IS 'Timestamp when the reviewee first opened or watched their completed review.';











