# Secure Admin Setup Guide

## Overview

We've implemented a **database-based admin system** that's more secure than email-based checks. Here's how it works:

## Security Improvements

### ✅ Database-Flagged Admins (Recommended)
- Admin status stored in `profiles.is_admin` column
- Can only be set via direct database access (no self-promotion)
- Audit trail possible
- More secure than environment variables

### ⚠️ Environment Variable Fallback (Temporary)
- Still supports `MASTER_ADMIN_EMAILS` for backward compatibility
- Use during migration period only

---

## Setup Instructions

### Step 1: Run the Migration

The migration adds the `is_admin` column to your profiles table:

```sql
-- Run this migration first
-- File: supabase/migrations/20250210000002_add_admin_flag.sql
```

### Step 2: Set Yourself as Admin

**Option A: By User ID (Recommended)**

1. Find your user ID:
   ```sql
   SELECT id, email, username FROM profiles WHERE email = 'your-email@example.com';
   ```

2. Set yourself as admin:
   ```sql
   UPDATE profiles SET is_admin = true WHERE id = 'YOUR_USER_ID_HERE';
   ```

**Option B: By Email**

```sql
UPDATE profiles SET is_admin = true WHERE email = 'your-email@example.com';
```

### Step 3: Verify Admin Access

1. Go to: `https://www.appauro.com/admin/manual-payments`
2. Sign in with your account
3. You should now have access!

---

## Security Best Practices

### ✅ DO:
- **Use database flags** - Set `is_admin = true` in database
- **Limit admin access** - Only give admin to trusted accounts
- **Monitor admin actions** - Check logs for admin access
- **Use strong passwords** - For your admin account
- **Enable 2FA** - If available in Supabase Auth

### ❌ DON'T:
- Don't expose admin emails in code
- Don't allow self-promotion to admin
- Don't share admin credentials
- Don't commit admin user IDs to git

---

## How to Add Additional Admins

```sql
-- By email
UPDATE profiles SET is_admin = true WHERE email = 'admin2@example.com';

-- By user ID
UPDATE profiles SET is_admin = true WHERE id = 'user-id-here';

-- Verify admins
SELECT id, email, username, is_admin FROM profiles WHERE is_admin = true;
```

---

## How to Remove Admin Access

```sql
-- Remove admin by email
UPDATE profiles SET is_admin = false WHERE email = 'old-admin@example.com';

-- Remove admin by user ID
UPDATE profiles SET is_admin = false WHERE id = 'user-id-here';
```

---

## Migration Path

### Current State (Environment Variables)
```bash
MASTER_ADMIN_EMAILS=your-email@example.com
```

### Target State (Database Flags)
```sql
UPDATE profiles SET is_admin = true WHERE email = 'your-email@example.com';
```

### During Migration
- Both methods work (database flag OR environment variable)
- Database flag takes precedence
- Once all admins are in database, you can remove env vars

---

## Troubleshooting

### "Access Denied" Error

1. **Check if you're signed in:**
   - Make sure you're logged into the site

2. **Verify admin flag:**
   ```sql
   SELECT id, email, is_admin FROM profiles WHERE email = 'your-email@example.com';
   ```
   - Should show `is_admin = true`

3. **Check environment variable (fallback):**
   - Make sure `MASTER_ADMIN_EMAILS` includes your email
   - Format: `email1@example.com,email2@example.com`

### Admin Access Not Working

1. Run the migration to add the column:
   ```sql
   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false NOT NULL;
   ```

2. Set yourself as admin:
   ```sql
   UPDATE profiles SET is_admin = true WHERE email = 'your-email@example.com';
   ```

3. Clear browser cache and sign out/in again

---

## Security Considerations

### Why Database Flags Are Better

1. **No code changes needed** - Add/remove admins via SQL
2. **Audit trail** - Can track who has admin access
3. **Not in environment** - Admin list not in env vars
4. **Prevents self-promotion** - Can't promote yourself via API
5. **Granular control** - Easy to see all admins at once

### Additional Security Measures

Consider adding:
- **Audit logging** - Log all admin actions
- **Rate limiting** - Prevent brute force on admin endpoints
- **IP restrictions** - Only allow admin from certain IPs
- **Session timeout** - Force re-authentication after X minutes
- **MFA requirement** - Require 2FA for admin accounts

---

## Quick Reference

```sql
-- Check current admins
SELECT id, email, username, is_admin FROM profiles WHERE is_admin = true;

-- Add admin
UPDATE profiles SET is_admin = true WHERE email = 'admin@example.com';

-- Remove admin
UPDATE profiles SET is_admin = false WHERE email = 'admin@example.com';

-- Check if specific user is admin
SELECT is_admin FROM profiles WHERE id = 'user-id-here';
```

---

## Next Steps

1. ✅ Run the migration
2. ✅ Set yourself as admin in database
3. ✅ Test admin access
4. ⏳ (Optional) Remove environment variable fallback later

