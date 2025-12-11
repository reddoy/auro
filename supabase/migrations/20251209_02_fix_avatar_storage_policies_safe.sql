-- Safe, non-destructive fix for avatar storage policies
-- This migration ADDS policies without dropping existing ones
-- Files are in: avatars/temp-uploads/... OR avatars/{user_id}/...

-- Allow authenticated users to SELECT (read) avatars from:
-- 1. temp-uploads/ (reviewer signups)
-- 2. {user_id}/ (reviewee avatars - UUID pattern)
-- This is the key fix - allows reading the existing avatar files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'avatars_select_authenticated'
  ) THEN
    CREATE POLICY "avatars_select_authenticated"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'avatars' 
      AND (
        name LIKE 'temp-uploads/%'
        OR name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'  -- UUID pattern for user_id/
      )
    );
  END IF;
END $$;

-- Allow authenticated users to INSERT (upload) avatars to:
-- 1. temp-uploads/ (for reviewer signups)
-- 2. Their own folder {user_id}/ (for reviewees)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'avatars_insert_authenticated'
  ) THEN
    CREATE POLICY "avatars_insert_authenticated"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'avatars' 
      AND (
        name LIKE 'temp-uploads/%'
        OR name LIKE auth.uid()::text || '/%'
      )
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

