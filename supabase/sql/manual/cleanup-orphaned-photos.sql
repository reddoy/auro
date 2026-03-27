-- ============================================================================
-- SQL to identify and delete photos in Supabase Storage that don't have 
-- an associated profile
-- ============================================================================
--
-- Photos are stored in Supabase Storage buckets:
-- 1. 'avatars' - profile avatars (path format: {user_id}/{timestamp}.{ext})
-- 2. 'request-media' - request photos (path format: {user_id}/requests/{timestamp}_{category}.{ext})
--
-- This script queries storage.objects to find photos where the user_id 
-- extracted from the path doesn't exist in the profiles table.
-- ============================================================================

-- FIRST: View orphaned photos (DRY RUN)
-- Run this first to see what will be deleted
WITH storage_objects AS (
  SELECT 
    o.bucket_id,
    o.name as object_path,
    CASE 
      WHEN o.bucket_id = 'avatars' THEN 
        -- Extract user_id from path like: {user_id}/{timestamp}.{ext}
        (regexp_match(o.name, '^([a-f0-9\-]{36})/'))[1]
      WHEN o.bucket_id = 'request-media' AND o.name LIKE '%/requests/%' THEN
        -- Extract user_id from path like: {user_id}/requests/{timestamp}_{category}.{ext}
        (regexp_match(o.name, '^([a-f0-9\-]{36})/requests/'))[1]
      ELSE NULL
    END as extracted_user_id
  FROM storage.objects o
  WHERE o.bucket_id IN ('avatars', 'request-media')
    AND o.name NOT LIKE 'temp-uploads/%'  -- Exclude temp uploads
),
orphaned_photos AS (
  SELECT 
    so.bucket_id,
    so.object_path,
    so.extracted_user_id
  FROM storage_objects so
  WHERE so.extracted_user_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 
      FROM public.profiles p 
      WHERE p.id::text = so.extracted_user_id
    )
)
SELECT 
  bucket_id,
  object_path,
  extracted_user_id,
  'Orphaned - profile does not exist' as reason
FROM orphaned_photos
ORDER BY bucket_id, object_path;

-- ============================================================================
-- SECOND: Delete orphaned photos
-- ⚠️ WARNING: This will permanently delete storage objects!
-- Only run these after reviewing the results from the FIRST query above
-- ============================================================================

-- Delete orphaned photos from avatars bucket
DELETE FROM storage.objects
WHERE bucket_id = 'avatars'
  AND name NOT LIKE 'temp-uploads/%'
  AND (regexp_match(name, '^([a-f0-9\-]{36})/'))[1] IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM public.profiles p 
    WHERE p.id::text = (regexp_match(name, '^([a-f0-9\-]{36})/'))[1]
  );

-- Delete orphaned photos from request-media bucket
DELETE FROM storage.objects
WHERE bucket_id = 'request-media'
  AND name NOT LIKE 'temp-uploads/%'
  AND name LIKE '%/requests/%'
  AND (regexp_match(name, '^([a-f0-9\-]{36})/requests/'))[1] IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM public.profiles p 
    WHERE p.id::text = (regexp_match(name, '^([a-f0-9\-]{36})/requests/'))[1]
  );

-- ============================================================================
-- VERIFICATION: Count how many were deleted
-- Run this after the deletion to verify the cleanup
-- ============================================================================
-- SELECT COUNT(*) as deleted_count FROM storage.objects WHERE bucket_id IN ('avatars', 'request-media') AND ...;

-- ============================================================================
-- ALTERNATIVE: If storage.objects is not accessible, use this approach:
-- ============================================================================
-- 1. Use Supabase Storage API to list all objects
-- 2. Extract user_ids from paths
-- 3. Check against profiles table
-- 4. Delete orphaned objects via Storage API
--
-- See: https://supabase.com/docs/guides/storage#delete-files
-- ============================================================================

