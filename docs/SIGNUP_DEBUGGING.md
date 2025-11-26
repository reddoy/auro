# Sign-Up Debugging Guide

If users are not being created in Supabase during sign-up, follow these steps to diagnose the issue.

## Quick Diagnosis Steps

### 1. Check Browser Console

After attempting sign-up, check the browser console (F12 → Console tab) for:

- `[AuthStep] Signup attempt:` - Shows sign-up attempt details
- `[AuthStep] Signup error details:` - Shows any errors that occurred
- `[AuthStep] Signup catch block:` - Shows caught errors

**Look for:**
- `hasError: true` - Indicates an error occurred
- `errorMessage` - The specific error message
- `userCreated: false` - User was not created
- `errorCode` or `status` - HTTP error codes

### 2. Check Supabase Dashboard

1. **Go to:** Supabase Dashboard → Authentication → Users
2. **Check if user exists:**
   - Search by email address
   - If user doesn't exist, sign-up failed completely
   - If user exists but `email_confirmed_at` is null, email confirmation is the issue

### 3. Check Supabase Auth Settings

1. **Go to:** Supabase Dashboard → Authentication → Settings
2. **Verify:**
   - ✅ **"Enable signup"** is **ON** (enabled)
   - ✅ **"Enable email confirmations"** is configured correctly
   - ✅ **"Site URL"** is set to your production URL
   - ✅ **"Redirect URLs"** includes your confirmation URL

### 4. Check Environment Variables

Verify these are set in your production environment:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON=your-anon-key-here
NEXT_PUBLIC_SITE_URL=https://www.appauro.com
```

**To check in browser console:**
```javascript
// Run in browser console
console.log({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.NEXT_PUBLIC_SUPABASE_ANON ? 'Present' : 'Missing'
});
```

### 5. Common Error Codes & Solutions

#### Error: "User already registered" (422)
- **Cause:** User with this email already exists
- **Solution:** User should sign in instead, or use a different email

#### Error: "Invalid email address" (400)
- **Cause:** Email format is invalid
- **Solution:** Validate email format before submission

#### Error: "Password is too weak" (400)
- **Cause:** Password doesn't meet requirements
- **Solution:** Ensure password meets Supabase requirements (min 6 chars by default)

#### Error: "Signup is disabled" (403)
- **Cause:** Sign-up is disabled in Supabase settings
- **Solution:** Enable sign-up in Supabase Dashboard → Authentication → Settings

#### Error: "Rate limit exceeded" (429)
- **Cause:** Too many sign-up attempts
- **Solution:** Wait for cooldown period, or check rate limits in Supabase

#### Error: "Network error" or "Failed to fetch"
- **Cause:** Network connectivity issue or Supabase URL incorrect
- **Solution:** 
  - Check internet connection
  - Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
  - Check Supabase status page

#### Error: "Supabase client is null"
- **Cause:** Environment variables not loaded or Supabase client not initialized
- **Solution:**
  - Verify environment variables are set
  - Check that `site/lib/supabase.ts` is properly exporting the client
  - Restart the Next.js server if environment variables were just added

### 6. Testing Sign-Up Flow

#### Step 1: Test with Browser Console Open
1. Open browser DevTools (F12)
2. Go to Console tab
3. Attempt sign-up
4. Look for `[AuthStep]` log messages
5. Check for any red error messages

#### Step 2: Test Supabase Connection
```javascript
// Run in browser console after page loads
const { supabase } = await import('/lib/supabase');
console.log('Supabase client:', supabase);
console.log('Supabase auth:', supabase?.auth);
```

#### Step 3: Test Sign-Up Directly
```javascript
// Run in browser console (replace with test credentials)
const { supabase } = await import('/lib/supabase');
const { data, error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'testpassword123',
  options: {
    emailRedirectTo: 'https://www.appauro.com/auth/confirm?type=signup'
  }
});
console.log('Sign-up result:', { data, error });
```

### 7. Check Supabase Logs

1. **Go to:** Supabase Dashboard → Logs → Auth Logs
2. **Filter by:** Recent time period
3. **Look for:**
   - Sign-up attempts
   - Error messages
   - Rate limit warnings
   - SMTP/email sending errors

### 8. Verify Code Flow

The sign-up flow should:
1. ✅ Validate form fields (email, password, fullName)
2. ✅ Check Supabase client is initialized
3. ✅ Call `supabase.auth.signUp()` with email, password, and options
4. ✅ Check for errors in response
5. ✅ Verify `data.user` exists
6. ✅ Create profile via `/api/auth/ensure-profile`
7. ✅ Proceed to next step

**If any step fails, check the console logs for where it stopped.**

### 9. Production Checklist

Before going live, ensure:
- [ ] `NEXT_PUBLIC_SUPABASE_URL` is set to production Supabase URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON` is set to production anon key
- [ ] Sign-up is enabled in Supabase Dashboard
- [ ] Email confirmations are configured
- [ ] SMTP settings are configured (if using custom SMTP)
- [ ] Redirect URLs are whitelisted in Supabase
- [ ] Test sign-up flow works end-to-end
- [ ] Check browser console for any errors
- [ ] Verify user appears in Supabase Dashboard after sign-up

### 10. Getting Help

If sign-up still fails:

1. **Collect Debug Information:**
   - Browser console logs (all `[AuthStep]` messages)
   - Supabase Auth Logs (from dashboard)
   - Network tab (check for failed requests)
   - Environment variables (verify they're set)

2. **Check:**
   - Supabase project status (not paused/disabled)
   - API rate limits not exceeded
   - Network connectivity
   - CORS settings (if applicable)

3. **Test:**
   - Try a different email address
   - Try a different browser
   - Try incognito/private mode
   - Check if it works in local development

## Related Files

- `site/app/request/components/AuthStep.tsx` - Sign-up component
- `site/lib/supabase.ts` - Supabase client initialization
- `site/app/request/page.tsx` - Request page with auth flow
- `docs/EMAIL_TROUBLESHOOTING.md` - Email confirmation issues

