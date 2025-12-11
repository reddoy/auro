-- Migration: Add trigger to automatically update reviewer rating_average
-- This ensures that when a reviewer_review is inserted or updated,
-- the reviewer's rating_average in the profiles table is automatically recalculated

-- Function to recalculate and update reviewer's average rating
CREATE OR REPLACE FUNCTION update_reviewer_rating_average()
RETURNS TRIGGER AS $$
DECLARE
  reviewer_profile_id UUID;
  avg_rating NUMERIC;
BEGIN
  -- Get the reviewer_id from the inserted/updated row
  reviewer_profile_id := COALESCE(NEW.reviewer_id, OLD.reviewer_id);
  
  -- Calculate the average rating for this reviewer
  SELECT COALESCE(AVG(rating), 0)
  INTO avg_rating
  FROM reviewer_reviews
  WHERE reviewer_id = reviewer_profile_id;
  
  -- Update the reviewer's profile with the new average rating
  -- Round to 1 decimal place
  UPDATE profiles
  SET rating_average = ROUND(avg_rating::numeric, 1)
  WHERE id = reviewer_profile_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Update rating_average when a reviewer_review is inserted
CREATE TRIGGER reviewer_reviews_insert_rating_update
  AFTER INSERT ON reviewer_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_reviewer_rating_average();

-- Trigger: Update rating_average when a reviewer_review is updated
CREATE TRIGGER reviewer_reviews_update_rating_update
  AFTER UPDATE ON reviewer_reviews
  FOR EACH ROW
  WHEN (OLD.rating IS DISTINCT FROM NEW.rating)
  EXECUTE FUNCTION update_reviewer_rating_average();

-- Trigger: Update rating_average when a reviewer_review is deleted
CREATE TRIGGER reviewer_reviews_delete_rating_update
  AFTER DELETE ON reviewer_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_reviewer_rating_average();

-- Add comment
COMMENT ON FUNCTION update_reviewer_rating_average() IS 'Automatically updates the rating_average field in profiles table when reviewer_reviews are inserted, updated, or deleted';

-- Backfill: Update rating_average for all existing reviewers who have reviews
-- This ensures existing reviews are reflected in the rating_average field
UPDATE profiles
SET rating_average = ROUND(
  (
    SELECT AVG(rating)
    FROM reviewer_reviews
    WHERE reviewer_reviews.reviewer_id = profiles.id
  )::numeric,
  1
)
WHERE id IN (
  SELECT DISTINCT reviewer_id
  FROM reviewer_reviews
)
AND is_reviewer = 'approved';

