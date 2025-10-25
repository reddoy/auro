# Reviewer Signup Flow - Test Plan

## Recent Fixes Applied (2025-01-27)

### Fixed Issues:
1. **User ID and email mismatch error** - Fixed in `/api/reviewers/apply-signup` endpoint
2. **Complex session handling** - Simplified to always use signup endpoint for step 5
3. **Better error messages** - More specific error handling throughout the flow
4. **Email validation** - Added client-side email format validation

### Key Changes:
- Removed strict email/ID matching that was causing 400 errors
- Simplified step 5 submission to always use the signup endpoint
- Added better error categorization and user-friendly messages
- Improved validation and error recovery

## Quick Test Checklist

### Test Case 1: Google OAuth Signup (Happy Path)
**Steps**:
1. Navigate to `https://www.appauro.com/reviewers/apply`
2. Complete Step 1 (intro) - click "Join Now"
3. On Step 2, click "Continue with Google"
4. Complete Google OAuth authentication
5. Verify redirect back to `/reviewers/apply?resume=true`
6. Verify you land on Step 4 (Phone Number) with your name/email pre-filled
7. Enter phone number (e.g., `+1 555-123-4567`)
8. Click "Continue"
9. Verify you reach Step 6 (Success page)

**Expected Result**: 
- ✅ No "session expired" errors
- ✅ Smooth flow from OAuth back to Step 4
- ✅ Phone number submission succeeds
- ✅ Success message displayed

**Console Logs to Check**:
```
[ReviewerApply] Resuming from OAuth, verifying session...
[ReviewerApply] Session verified, user: [user-id]
[ReviewerApply] Submitting application at step 4
[ReviewerApply] Initial session check: { hasSession: true, ... }
[ReviewerApply] User verified: [user-id]
[ReviewerApply] Submitting to API...
[ReviewerApply] Application submitted successfully
```

---

### Test Case 1.5: Email/Password Signup (Fixed Flow)
**Steps**:
1. Navigate to `/reviewers/apply`
2. Complete Step 1 (intro) - click "Join Now"
3. On Step 2, enter first name, last name, email (e.g., `test@example.com`)
4. Click "Continue" 
5. On Step 3, create a password (must meet requirements)
6. Click "Continue" - this creates the account
7. On Step 4, enter phone number (e.g., `+1 555-123-4567`)
8. Click "Continue"
9. On Step 5, optionally upload profile picture and add social handles
10. Click "Submit Application"

**Expected Result**:
- ✅ Account created successfully in step 3
- ✅ No "User ID and email mismatch" errors
- ✅ Smooth transition through all steps
- ✅ Application submitted successfully
- ✅ Confirmation email sent

**Console Logs to Check**:
```
[ReviewerApply] Account created successfully: [user-id]
[ReviewerApply] Submitting application at step 5
[ReviewerApply] Sending signup request with data: { userId: [user-id], email: test@example.com, ... }
[ApplySignup] User verified by ID: [user-id]
[ApplySignup] Successfully updated profile for user [user-id] with is_reviewer=true
[ReviewerApply] Application submitted successfully
```

---

### Test Case 2: Email/Password Signup (Legacy - should still work)
**Steps**:
1. Navigate to `/reviewers/apply`
2. Complete Step 1
3. On Step 2, enter first name, last name, email
4. Click "Continue" (should skip Google OAuth)
5. On Step 3, create a password
6. Click "Continue"
7. On Step 4, enter phone number
8. Click "Continue"

**Expected Result**:
- ✅ No session errors
- ✅ Password account created
- ✅ Phone submission succeeds

---

### Test Case 3: Already Authenticated User
**Steps**:
1. Sign in to the site elsewhere (e.g., at `/request`)
2. Navigate to `/reviewers/apply`
3. Verify Step 2 shows "Already Signed In!" message
4. Click "Continue"
5. Verify you skip directly to Step 4
6. Enter phone and submit

**Expected Result**:
- ✅ Recognizes existing session
- ✅ Skips unnecessary steps
- ✅ No duplicate accounts created

---

### Test Case 4: Session Refresh During Flow
**Steps**:
1. Start the OAuth flow
2. After reaching Step 4, open browser DevTools
3. Go to Application > Local Storage
4. Find `auro-auth-token` and modify/corrupt it slightly
5. Try to submit the phone number

**Expected Result**:
- ✅ System attempts to refresh the session
- ✅ If refresh succeeds, submission continues
- ✅ If refresh fails, clear error message without auto-logout
- ✅ Console shows refresh attempt: `[ReviewerApply] No valid session, attempting refresh...`

---

### Test Case 5: Token Refresh Events (Background)
**Steps**:
1. Complete OAuth and reach Step 4
2. Wait for 5-10 minutes at Step 4 (tokens usually refresh every 3600s but Supabase may refresh earlier)
3. Monitor browser console for auth events
4. Submit the phone number

**Expected Result**:
- ✅ No false "session expired" errors during wait
- ✅ Console may show: `[ReviewerApply] Auth state change: TOKEN_REFRESHED`
- ✅ Submission succeeds after refresh

---

### Test Case 6: User Already Completed Signup
**Steps**:
1. Complete the full signup flow once
2. Try to access `/reviewers/apply` again with the same account

**Expected Result**:
- ✅ Shows "Already Signed Up!" message
- ✅ Displays "You have already completed the reviewer application"
- ✅ Provides "Back to Home" button
- ✅ No ability to submit again

---

## Edge Cases to Test

### Edge Case 1: OAuth Cancellation
**Steps**:
1. Start Google OAuth
2. Cancel/close the OAuth popup before completing

**Expected Result**:
- User stays on Step 2
- No error message unless they try to proceed without auth

### Edge Case 2: Network Failure During Submission
**Steps**:
1. Complete OAuth and reach Step 4
2. Open DevTools > Network
3. Throttle connection to "Offline"
4. Try to submit phone number
5. Re-enable network

**Expected Result**:
- Shows network error, not session error
- User can retry after network restoration

### Edge Case 3: Invalid Phone Number
**Steps**:
1. Complete flow to Step 4
2. Enter invalid phone (e.g., "123")
3. Try to submit

**Expected Result**:
- Shows "Please enter a valid phone number"
- Does NOT show session error

---

## Browser Compatibility Testing

Test the flow in:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile Safari (iOS)
- ✅ Mobile Chrome (Android)

---

## Session Storage Verification

Check browser Application/Storage:

**After OAuth Completion**:
```
localStorage['auro-auth-token'] = { ... session data ... }
localStorage['auro_signup_user_id'] = '[user-id]'
localStorage['auro_signup_email'] = '[email]'
localStorage['auro_signup_first_name'] = '[name]'
localStorage['auro_signup_last_name'] = '[name]'
```

**After Page Reload at Step 4**:
- Session should persist
- User should still be authenticated
- Form should still be on Step 4

---

## API Integration Verification

### Check `/api/reviewers/apply` Response
**Expected Success Response** (after phone submission):
```json
{
  "success": true,
  "profile": { ... }
}
```

**Expected Auth Error** (401/403):
Should NOT happen with the fixes in place. If it does:
- Check console for session verification logs
- Verify token is being sent in Authorization header
- Check server logs for token validation

---

## Performance Checks

Monitor for:
- ✅ Page load time < 2s
- ✅ OAuth redirect time < 3s
- ✅ Step transitions smooth
- ✅ No unnecessary API calls
- ✅ Session checks don't block UI

---

## Rollback Plan

If issues are found after deployment:

1. **Immediate Rollback**:
   ```bash
   git revert <commit-hash>
   npm run build
   vercel deploy --prod
   ```

2. **Partial Rollback** (just auth listener):
   - Revert only the `onAuthStateChange` handler changes
   - Keep session refresh improvements

3. **Emergency Fix**:
   - Disable reviewer signup page temporarily
   - Add maintenance message
   - Debug in staging

---

## Success Metrics

After deployment, monitor:
- **Signup Completion Rate**: Should increase
- **"Session Expired" Errors**: Should decrease to near-zero
- **OAuth Success Rate**: Should remain high (>95%)
- **Phone Submission Success Rate**: Should be >99%
- **Support Tickets**: Should decrease for session issues

**Target Metrics**:
- 0 "Your session has expired" errors for valid sessions
- <1% OAuth callback failures
- >95% completion rate from Step 4 to Step 6

