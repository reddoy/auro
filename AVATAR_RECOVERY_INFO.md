# Avatar File Recovery Information

## What Happened

Your avatar files were deleted by an automated cleanup job that runs nightly. Here's what happened:

1. **Files were uploaded to temporary storage**: When reviewers signed up, their avatars were uploaded to `temp-uploads/reviewer-signup-{timestamp}/avatar/`
2. **Database stored temp paths**: The database stored these temporary paths in the `avatar_url` column
3. **Files were never moved to permanent storage**: The reviewer signup code didn't move files from `temp-uploads/` to permanent storage (`users/{userId}/avatar/`)
4. **Cleanup job deleted them**: After 72 hours, a scheduled cleanup function (`scheduled-expirations`) automatically deleted all files in `temp-uploads/` older than 72 hours
5. **Database still points to deleted files**: The database still has paths pointing to files that no longer exist

## Can We Recover Them?

Unfortunately, **the files are likely permanently deleted** and cannot be recovered unless:
- Supabase has automatic backups enabled (check your Supabase dashboard)
- You have external backups of your storage bucket
- The files were cached somewhere else

## What I've Fixed

I've updated the code to **prevent this from happening again**:

1. **`site/app/api/reviewers/apply-signup/route.ts`**: Now moves avatars from `temp-uploads/` to `users/{userId}/avatar/` immediately when reviewers sign up
2. **`site/app/api/reviewers/apply/route.ts`**: Same fix for the apply endpoint
3. **`site/app/api/storage/signed-view/route.ts`**: Updated to handle directory paths and list files if needed
4. **`lib/profile.ts`**: Updated `getSignedAvatarUrl` to handle directory paths and list files

## What You Can Do Now

### Option 1: Ask Reviewers to Re-upload (Recommended)
Since the files are gone, the easiest solution is to ask reviewers to upload new profile pictures. The app will now properly save them to permanent storage.

### Option 2: Check Supabase Backups
1. Go to your Supabase dashboard
2. Check if you have automatic backups enabled
3. If yes, you might be able to restore the storage bucket from a backup

### Option 3: Clean Up Database
Update the database to remove invalid avatar URLs so the app shows initials instead of trying to load missing files:

```sql
-- Set avatar_url to NULL for reviewers with temp-uploads paths that don't exist
UPDATE profiles 
SET avatar_url = NULL 
WHERE avatar_url LIKE 'temp-uploads/%' 
  AND is_reviewer IN ('pending', 'approved');
```

### Option 4: Disable Cleanup for Avatars (Temporary)
You could temporarily disable the cleanup job or exclude the `avatars` bucket, but this is not recommended long-term as it will fill up storage with old temp files.

## Going Forward

✅ **New reviewer signups** will automatically move avatars to permanent storage  
✅ **The app handles missing avatars gracefully** (shows initials)  
✅ **Directory paths are handled** if they exist in the database

The issue is fixed for future uploads, but existing files that were deleted cannot be recovered.

