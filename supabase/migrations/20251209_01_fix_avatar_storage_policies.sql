-- Fix avatar storage policies to allow temp-uploads access
-- This migration updates the storage policies for the avatars bucket
-- to allow authenticated users to upload and read files from temp-uploads

-- First, drop existing policies if they exist (we'll recreate them with better rules)
DROP POLICY IF EXISTS "avatars_select_any_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_own_folder" ON storage.objects;

-- Allow authenticated users to SELECT (read) avatars from:
-- 1. temp-uploads/ (for files being uploaded)
-- 2. Any user's folder (for viewing other users' avatars)
CREATE POLICY "avatars_select_authenticated"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (
    name LIKE 'temp-uploads/%' 
    OR name LIKE 'users/%'
  )
);

-- Allow authenticated users to INSERT (upload) avatars to:
-- 1. temp-uploads/ (for initial uploads during signup)
-- 2. Their own folder (users/{user_id}/...)
CREATE POLICY "avatars_insert_authenticated"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (
    name LIKE 'temp-uploads/%'
    OR name LIKE 'users/' || auth.uid()::text || '/%'
  )
);

-- Allow authenticated users to UPDATE avatars only in:
-- 1. Their own folder (users/{user_id}/...)
-- Note: temp-uploads files shouldn't be updated, they should be moved instead
CREATE POLICY "avatars_update_own_folder"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND name LIKE 'users/' || auth.uid()::text || '/%'
)
WITH CHECK (
  bucket_id = 'avatars' 
  AND name LIKE 'users/' || auth.uid()::text || '/%'
);

-- Allow authenticated users to DELETE avatars only from:
-- 1. Their own folder (users/{user_id}/...)
-- Note: temp-uploads files are cleaned up by scheduled jobs, not user deletion
CREATE POLICY "avatars_delete_own_folder"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND name LIKE 'users/' || auth.uid()::text || '/%'
);

-- Also allow service role to do everything (for server-side operations)
-- This is needed for the API routes that move files from temp-uploads to permanent storage
CREATE POLICY "avatars_service_role_all"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

