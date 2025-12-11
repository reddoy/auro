# Apply Safe Storage Policies - NO DESTRUCTIVE OPERATIONS

## What This Does

This migration **ONLY ADDS** new policies - it does NOT drop or modify existing ones. It's completely safe to run.

## The Fix

Adds policies to allow:
- ✅ Authenticated users to **read** from `temp-uploads/` (so avatars can load)
- ✅ Authenticated users to **upload** to `temp-uploads/` (for new signups)
- ✅ Service role full access (for API routes)

## How to Apply

### Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard/project/zxazjbduiistnfstnwka
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the ENTIRE contents of:
   ```
   supabase/migrations/20251209_02_fix_avatar_storage_policies_safe.sql
   ```
5. Click **Run** (or press Cmd+Enter)
6. Wait for "Success" message

### Or Supabase CLI

```bash
cd /Users/rohanomalley/Desktop/auro
supabase db push
```

## Why This is Safe

- Uses `IF NOT EXISTS` - won't error if policies already exist
- Only ADDS policies - doesn't remove or modify anything
- Focuses on `temp-uploads/` where your files actually are
- No `DROP` statements - completely non-destructive

## After Applying

1. Restart your Expo app
2. Check the "Discover Reviewers" page
3. Avatars should now load! 🎉

The files are there in `temp-uploads/` - we just need to allow access to them.

