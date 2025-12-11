-- Check storage policies for avatars bucket
-- Run this in Supabase SQL Editor to see the actual policy definitions

-- Check if policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname LIKE '%avatar%'
ORDER BY policyname;

-- Also check bucket policies
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE name = 'avatars';

