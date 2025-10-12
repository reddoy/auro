# Supabase Session Expiration Fix

## Issue
Users are getting "Your session has expired. Please sign out and try again." when reaching the phone number step during reviewer signup.

## Root Cause
The session validation logic was too strict and didn't attempt to refresh expired tokens before failing.

## Fix Applied
Updated `site/app/reviewers/apply/page.tsx` to:

1. **Try session refresh before failing**: Instead of immediately failing when a session is invalid, the code now attempts to refresh the session first.

2. **Improved auth state handling**: Added better handling for session expiration events in the auth state change listener.

## Changes Made

### Before:
```javascript
const { data: { session }, error: sessionError } = await supabase.auth.getSession();
if (sessionError || !session) {
  setError('Your session has expired. Please sign out and try again.');
  await supabase.auth.signOut();
  return;
}
```

### After:
```javascript
let { data: { session }, error: sessionError } = await supabase.auth.getSession();
if (sessionError || !session) {
  // Try to refresh the session before giving up
  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError || !refreshData.session) {
    setError('Your session has expired. Please sign out and try again.');
    await supabase.auth.signOut();
    return;
  }
  session = refreshData.session;
}
```

## Why This Happened
The security fixes we applied earlier changed the OTP expiry settings, which may have affected the token refresh timing. The original code didn't attempt to refresh tokens, causing legitimate users to be logged out unnecessarily.

## Testing
1. Try the reviewer signup process again
2. The session should now be automatically refreshed if needed
3. Users should no longer see the "session expired" error during normal signup flow

## Additional Recommendations
- Monitor session refresh success rates
- Consider implementing a more robust session management strategy
- Test the signup flow thoroughly after this change
