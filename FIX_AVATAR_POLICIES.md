# Fix Avatar Storage Policies

## The Problem

Your storage policies for the `avatars` bucket are likely restricting access to files in `temp-uploads/`. The policies you mentioned:

- `avatars_delete_own_folder` - DELETE for authenticated users
- `avatars_insert_own_folder` - INSERT for authenticated users  
- `avatars_select_any_authenticated` - SELECT for authenticated users
- `avatars_update_own_folder` - UPDATE for authenticated users

The "own_folder" policies suggest users can only access files in their own folder (like `users/{userId}/avatar/`), which means:
- ✅ Files in `users/{userId}/avatar/` work
- ❌ Files in `temp-uploads/` don't work (not in user's own folder)

## The Solution

You have two options:

### Option 1: Update Policies to Allow temp-uploads (Temporary Fix)

Add a policy that allows authenticated users to SELECT from temp-uploads:

```sql
-- Allow authenticated users to read files in temp-uploads
CREATE POLICY "avatars_select_temp_uploads"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (name LIKE 'temp-uploads/%' OR name LIKE 'users/' || auth.uid()::text || '/%')
);
```

### Option 2: Move Files Immediately (Better - Already Fixed in Code)

I've already updated the code to move files from `temp-uploads/` to `users/{userId}/avatar/` immediately when reviewers sign up. This is the better solution because:
- Files are in permanent storage immediately
- No need to change policies
- Files won't get deleted by cleanup jobs
- Matches the "own_folder" policy structure

## Current Status

✅ **Code is fixed** - New reviewer signups will move files to permanent storage  
⚠️ **Existing files are missing** - They were likely deleted or never moved  
✅ **App handles missing files** - Shows initials when avatars can't load

## Next Steps

1. **For new uploads**: The code will automatically move files to permanent storage ✅
2. **For existing reviewers**: They'll need to re-upload their avatars
3. **Optional**: Update policies if you want to allow temp-uploads access (not recommended)

The app should now work correctly for new reviewer signups!

