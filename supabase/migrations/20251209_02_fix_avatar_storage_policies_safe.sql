-- Safe, non-destructive fix for avatar storage policies
-- This migration ADDS policies without dropping existing ones
-- Focuses on temp-uploads/ since that's where the files actually are

-- Allow authenticated users to SELECT (read) avatars from temp-uploads/
-- This is the key fix - allows reading the existing avatar files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'avatars_select_temp_uploads'
  ) THEN
    CREATE POLICY "avatars_select_temp_uploads"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'avatars' 
      AND name LIKE 'temp-uploads/%'
    );
  END IF;
END $$;

-- Allow authenticated users to INSERT (upload) avatars to temp-uploads/
-- For new reviewer signups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'avatars_insert_temp_uploads'
  ) THEN
    CREATE POLICY "avatars_insert_temp_uploads"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'avatars' 
      AND name LIKE 'temp-uploads/%'
    );
  END IF;
END $$;

-- Allow service role to do everything (for server-side operations)
-- This ensures API routes can move files and sign URLs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'avatars_service_role_all'
  ) THEN
    CREATE POLICY "avatars_service_role_all"
    ON storage.objects
    FOR ALL
    TO service_role
    USING (bucket_id = 'avatars')
    WITH CHECK (bucket_id = 'avatars');
  END IF;
END $$;

