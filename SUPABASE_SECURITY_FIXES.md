# Supabase Security Issues - Fix Implementation Guide

This document outlines the fixes for the security issues identified in your Supabase project.

## Issues Fixed

### 1. ✅ Function Search Path Mutable
**Files:** `can_complete_reviewer_signup`, `get_reviewer_signup_status`
**Fix:** Added `set search_path = public, pg_temp` to both functions
**Migration:** `20250120_02_fix_function_search_paths.sql`

### 2. ✅ Extension in Public Schema
**Issue:** `pg_net` extension installed in public schema
**Fix:** Removed pg_net extension from public schema
**Migration:** `20250120_03_fix_extension_security.sql`

### 3. ✅ Auth OTP Long Expiry
**Issue:** OTP expiry exceeds recommended threshold
**Fix:** Set OTP expiry to 1 hour (3600 seconds) in config
**Files:** `supabase/config.toml`, `20250120_04_fix_auth_security.sql`

### 4. ✅ Leaked Password Protection Disabled
**Issue:** Leaked password protection is currently disabled
**Fix:** Enabled password validation and breach protection
**Files:** `supabase/config.toml`, `20250120_04_fix_auth_security.sql`

### 5. ⚠️ Postgres Version Security Patches
**Issue:** Postgres version has security patches available
**Fix:** Requires manual upgrade in Supabase Dashboard

## Implementation Steps

### Step 1: Apply Database Migrations
Run the following migrations in order:

```bash
# Apply the security fixes
supabase db reset
# OR apply individual migrations:
supabase migration up
```

### Step 2: Update Supabase Configuration
The `supabase/config.toml` file has been created with secure defaults. Key settings:

```toml
# OTP expiry set to 1 hour (recommended)
otp_exp = 3600

# Password protection enabled
enable_password_validation = true
enable_breach_protection = true
```

### Step 3: Configure Auth Settings in Supabase Dashboard
Navigate to your Supabase project dashboard and update these settings:

1. **Authentication > Settings > Password Policy**
   - Enable "Enable password validation"
   - Set minimum password length to 8 characters
   - Enable "Check passwords against common breach databases"

2. **Authentication > Settings > OTP Settings**
   - Set OTP expiry to 1 hour (3600 seconds)
   - Enable "Secure password change"

### Step 4: Upgrade Postgres Version (Manual)
This requires manual intervention in the Supabase Dashboard:

1. Go to **Settings > Database**
2. Check for available Postgres version updates
3. Schedule the upgrade during a maintenance window
4. Follow Supabase's upgrade process

### Step 5: Verify Fixes
After applying all changes:

1. Run your Supabase security scan again
2. Verify that all issues are resolved
3. Test your application functionality to ensure nothing is broken

## Important Notes

### pg_net Extension
If your application uses the `pg_net` extension for HTTP requests:
1. Check if you're using any `pg_net` functions in your code
2. If needed, reinstall the extension in a dedicated schema:
   ```sql
   CREATE SCHEMA IF NOT EXISTS network;
   CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA network;
   ```
3. Update your code to reference `network.pg_net` instead of `pg_net`

### Testing
After applying these fixes:
1. Test user registration and login flows
2. Verify SMS/Email OTP functionality works with new expiry settings
3. Test password validation with weak passwords
4. Ensure all existing functionality continues to work

### Monitoring
Monitor your application after deployment for:
- Any authentication failures
- Performance impact from new security measures
- User experience with stricter password requirements

## Files Created/Modified

### New Migration Files:
- `supabase/migrations/20250120_02_fix_function_search_paths.sql`
- `supabase/migrations/20250120_03_fix_extension_security.sql`
- `supabase/migrations/20250120_04_fix_auth_security.sql`

### New Configuration:
- `supabase/config.toml`

### Documentation:
- `SUPABASE_SECURITY_FIXES.md` (this file)

## Next Steps

1. Apply the migrations to your development environment first
2. Test thoroughly before applying to production
3. Monitor the Supabase Dashboard for any new security recommendations
4. Consider implementing additional security measures like:
   - Rate limiting
   - IP allowlisting for admin functions
   - Enhanced logging and monitoring

