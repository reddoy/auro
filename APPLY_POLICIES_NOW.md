# Apply Storage Policies - URGENT FIX

## The Problem
Files exist in Supabase Storage, but the app can't access them because storage policies are blocking access to `temp-uploads/`.

## The Solution
Apply the storage policy migration to allow authenticated users to read from `temp-uploads/`.

## How to Apply

### Option 1: Supabase Dashboard (FASTEST - DO THIS NOW)

1. Go to https://supabase.com/dashboard/project/zxazjbduiistnfstnwka
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the ENTIRE contents of `supabase/migrations/20251209_01_fix_avatar_storage_policies.sql`
5. Click **Run** (or press Cmd+Enter)
6. Wait for "Success" message

### Option 2: Supabase CLI

```bash
cd /Users/rohanomalley/Desktop/auro
supabase db push
```

## What This Does

The migration will:
- ✅ Allow authenticated users to SELECT (read) from `temp-uploads/` and `users/`
- ✅ Allow authenticated users to INSERT (upload) to `temp-uploads/` and their own folder
- ✅ Allow service role full access (for API routes)

## After Applying

1. Restart your Expo app
2. Check the "Discover Reviewers" page
3. Avatars should now load!

The files are there - we just need to allow access to them.

