# Apply Storage Policy Fix

## What This Does

This migration fixes the storage policies for the `avatars` bucket to allow:

1. **SELECT (Read)**: Authenticated users can read files from:
   - `temp-uploads/` (for files being uploaded)
   - `users/` (for viewing any user's avatar)

2. **INSERT (Upload)**: Authenticated users can upload files to:
   - `temp-uploads/` (for initial uploads during signup)
   - `users/{user_id}/` (their own folder)

3. **UPDATE**: Authenticated users can only update files in their own folder

4. **DELETE**: Authenticated users can only delete files from their own folder

5. **Service Role**: Full access for server-side operations (API routes)

## How to Apply

### Option 1: Using Supabase CLI (Recommended)

```bash
# Make sure you're linked to your Supabase project
supabase link --project-ref zxazjbduiistnfstnwka

# Apply the migration
supabase db push
```

### Option 2: Using Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/20251209_01_fix_avatar_storage_policies.sql`
4. Paste and run it

### Option 3: Manual Policy Update

If you prefer to update policies manually in the dashboard:

1. Go to **Storage** → **Policies** → **avatars** bucket
2. Delete the existing policies:
   - `avatars_select_any_authenticated`
   - `avatars_insert_own_folder`
   - `avatars_update_own_folder`
   - `avatars_delete_own_folder`
3. Create new policies with the SQL from the migration file

## Verification

After applying, you can verify the policies work by:

1. **Testing upload**: A reviewer should be able to upload an avatar during signup
2. **Testing read**: The avatar should be visible in the app
3. **Checking logs**: The API should successfully move files from `temp-uploads/` to `users/{user_id}/avatar/`

## Notes

- The code has already been updated to move files from `temp-uploads/` to permanent storage immediately
- This policy fix ensures the upload and move operations work correctly
- Service role has full access for server-side file operations (needed for the API routes)

