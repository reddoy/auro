# Reviewer Signup Session Management Fixes

## Problem Summary
Users were encountering "Your session has expired. Please sign out and try again." errors during the reviewer application flow at https://www.appauro.com/reviewers/apply, specifically when reaching the phone number step after Google OAuth authentication.

## Root Causes Identified

### 1. Overly Aggressive Auth State Listener
**Location**: `site/app/reviewers/apply/page.tsx` (lines 154-172)

**Issue**: The `onAuthStateChange` listener was catching `SIGNED_OUT` events and immediately showing an error, even during normal token refresh operations or session cleanup events.

**Original Code**:
```typescript
const sub = supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    setError('Your session has expired. Please sign out and try again.');
    return;
  }
  // ...
});
```

**Problem**: This would trigger false positives during:
- Token refresh failures
- Background session cleanup
- Initial page load without a session
- Any Supabase internal session management

### 2. Insufficient Session Refresh Logic
**Location**: `site/app/reviewers/apply/page.tsx` (step 4 submission, lines 353-421)

**Issue**: When submitting the phone number form, the session validation logic was basic and didn't properly handle:
- Expired tokens that needed refresh
- Missing session after OAuth redirect
- Timing issues between OAuth and form submission

**Original Code**:
```typescript
let { data: { session }, error: sessionError } = await supabase.auth.getSession();
if (sessionError || !session) {
  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError || !refreshData.session) {
    setError('Your session has expired. Please sign out and try again.');
    await supabase.auth.signOut(); // This could trigger the listener above!
    return;
  }
  session = refreshData.session;
}
```

### 3. Session Persistence Configuration
**Location**: `site/lib/supabase.ts`

**Issue**: The Supabase client wasn't explicitly configured for optimal session persistence, which could lead to sessions being lost during page navigation or long form fills.

## Solutions Implemented

### Fix 1: Improved Auth State Change Handler
```typescript
const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
  console.log('[ReviewerApply] Auth state change:', event, !!session);
  
  // Don't show error for token refresh events or initial null session
  // Only show error if user explicitly signs out while on this page
  if (event === 'SIGNED_OUT') {
    // Check if this is an intentional sign out (not just a session cleanup)
    // We'll only show error if they were previously authenticated on this page
    if (isGoogleAuthed || email) {
      console.warn('[ReviewerApply] User signed out during application');
      setError('Your session was ended. Please refresh and sign in again.');
    }
    return;
  }
  
  // Handle successful sign in or token refresh
  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
    if (session?.user) {
      // Update user info and clear any session-related errors
      // ...
    }
  }
});
```

**Benefits**:
- Only shows error for intentional sign-outs
- Handles TOKEN_REFRESHED events properly
- Clears errors when a valid session is restored
- Properly logs events for debugging

### Fix 2: Enhanced Session Refresh Logic at Step 4
```typescript
// Get current session and verify it's valid
let { data: { session }, error: sessionError } = await supabase.auth.getSession();

console.log('[ReviewerApply] Initial session check:', {
  hasSession: !!session,
  sessionError: sessionError?.message,
  expiresAt: session?.expires_at,
  now: Math.floor(Date.now() / 1000)
});

// If no session or error, try to refresh
if (sessionError || !session) {
  console.log('[ReviewerApply] No valid session, attempting refresh...');
  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
  
  if (refreshError) {
    console.error('[ReviewerApply] Session refresh failed:', refreshError);
    // Provide context-specific error messages
    if (isGoogleAuthed) {
      setError('Your session expired. Please click "Continue with Google" above to re-authenticate.');
    } else {
      setError('Your session expired. Please refresh the page and try again.');
    }
    return; // Don't sign out - let them try again
  }
  
  if (!refreshData.session) {
    console.error('[ReviewerApply] Session refresh returned no session');
    setError('Unable to verify your session. Please refresh the page and try again.');
    return;
  }
  
  session = refreshData.session;
  console.log('[ReviewerApply] Session refreshed successfully');
}

// Verify user still exists with the session
const { data: userData, error: userError } = await supabase.auth.getUser();

if (userError || !userData?.user) {
  console.error('[ReviewerApply] User verification failed:', userError);
  setError('Unable to verify your account. Please refresh the page and try again.');
  return;
}
```

**Benefits**:
- Comprehensive logging for debugging
- Better error messages based on context (Google OAuth vs email/password)
- Doesn't force sign-out on refresh failures
- Validates both session and user before proceeding
- Clearer error messages that guide users to resolution

### Fix 3: OAuth Resume Session Verification
```typescript
if (shouldResume) {
  // Verify we have a valid session after OAuth redirect
  const verifyOAuthSession = async () => {
    try {
      console.log('[ReviewerApply] Resuming from OAuth, verifying session...');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.error('[ReviewerApply] No valid session after OAuth:', error);
        setError('Authentication failed. Please try signing in again.');
        return;
      }
      
      console.log('[ReviewerApply] Session verified, user:', session.user.id);
      
      // Restore state and proceed to step 4
      // ...
    } catch (e) {
      console.error('[ReviewerApply] Failed to verify OAuth session:', e);
      setError('Failed to complete authentication. Please try again.');
    }
  };
  
  verifyOAuthSession();
}
```

**Benefits**:
- Verifies session immediately after OAuth redirect
- Catches session issues early in the flow
- Provides clear error messages if OAuth didn't complete properly

### Fix 4: Enhanced Supabase Client Configuration
```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Store session in localStorage for better persistence across page loads
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    // Reduce chance of session expiration issues during long forms
    storageKey: 'auro-auth-token',
  },
});
```

**Benefits**:
- Explicit localStorage storage ensures sessions persist across page loads
- Custom storage key prevents conflicts with other apps
- SSR-safe configuration (checks for window)

### Fix 5: Removed Duplicate Step 5 Logic
The code had a complete duplicate of the session validation and submission logic at step 5, which was never reached since the flow goes directly from step 4 to step 6. This was removed to:
- Reduce code complexity
- Eliminate potential confusion
- Prevent maintenance issues

## Testing Recommendations

### Manual Testing Flow
1. **Fresh Google OAuth Sign-up**:
   - Go to /reviewers/apply
   - Click "Continue with Google"
   - Complete OAuth
   - Verify redirect back to step 4
   - Enter phone number
   - Submit and verify success

2. **Session Expiration Simulation**:
   - Start the flow
   - Authenticate with Google
   - Wait at step 4 for session to expire (or manually clear in DevTools)
   - Try to submit
   - Verify error message is helpful and doesn't auto-sign-out

3. **Token Refresh During Flow**:
   - Start the flow
   - Authenticate
   - Monitor network tab for token refresh events
   - Verify no false "session expired" errors appear

4. **Already Authenticated User**:
   - Sign in elsewhere on the site
   - Navigate to /reviewers/apply
   - Verify it recognizes existing session
   - Complete the flow

### Browser Console Monitoring
All session operations now log to console with `[ReviewerApply]` prefix for easier debugging:
- Session verification steps
- Token refresh attempts
- User verification
- API submission

## Additional Improvements Made

1. **Better Error Messages**: Context-aware messages that guide users to specific actions
2. **Comprehensive Logging**: All session operations logged for debugging
3. **Graceful Degradation**: Failed session refresh doesn't force sign-out
4. **State Preservation**: OAuth state properly restored after redirect
5. **TypeScript Safety**: Proper listener cleanup and type handling

## Files Modified

1. `site/app/reviewers/apply/page.tsx`
   - Fixed onAuthStateChange listener (lines 154-190)
   - Enhanced step 4 session logic (lines 355-470)
   - Improved OAuth resume verification (lines 32-94)
   - Removed duplicate step 5 logic (line 472)

2. `site/lib/supabase.ts`
   - Added explicit localStorage storage configuration
   - Added custom storage key
   - Added SSR safety check

## Deployment Notes

- No database migrations required
- No environment variable changes needed
- Changes are backward compatible
- No breaking changes to API contracts

## Monitoring

After deployment, monitor for:
- Decrease in "session expired" errors
- Successful completion rate at step 4
- OAuth callback success rate
- Console logs with `[ReviewerApply]` prefix in production (consider removing later)

## Future Enhancements

Consider implementing:
1. Session expiration warning (e.g., "Your session will expire in 5 minutes")
2. Automatic session refresh button in error state
3. Save draft functionality to preserve progress across sessions
4. Session health check before each step transition

