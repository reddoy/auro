# Email Confirmation Troubleshooting Guide

If users are not receiving confirmation emails after sign-up, follow these steps to diagnose and fix the issue.

## Quick Checklist

### 1. Check Supabase Dashboard Settings

#### Email Confirmations Enabled
- Go to: **Supabase Dashboard** → **Authentication** → **Settings**
- Verify: **"Enable email confirmations"** is **ON** (enabled)
- If disabled, enable it and save

#### SMTP Configuration
- Go to: **Supabase Dashboard** → **Project Settings** → **Auth** → **SMTP Settings**
- Verify SMTP is configured with one of:
  - **Custom SMTP** (recommended for production)
  - **Supabase Email** (default, may have rate limits)

**Required SMTP Settings:**
- **Host**: Your SMTP server (e.g., `smtp.resend.com`, `smtp.sendgrid.net`)
- **Port**: Usually `587` (TLS) or `465` (SSL)
- **Username**: Your SMTP username/API key
- **Password**: Your SMTP password/API key
- **Sender email**: `rj@appauro.com` (as configured in `AUTH_EMAIL_SETUP.md`)
- **Sender name**: Optional (e.g., "Auro")

**Popular SMTP Providers:**
- **Resend**: `smtp.resend.com:587` (recommended)
- **SendGrid**: `smtp.sendgrid.net:587`
- **AWS SES**: `email-smtp.{region}.amazonaws.com:587`
- **Mailgun**: `smtp.mailgun.org:587`

### 2. Check Email Templates

- Go to: **Supabase Dashboard** → **Authentication** → **Email Templates**
- Verify **"Confirm Signup"** template exists and is enabled
- Check that the template includes: `{{ .ConfirmationURL }}`
- Verify redirect URL in template matches: `https://www.appauro.com/auth/confirm`

### 3. Check Environment Variables

Verify these are set in your production environment:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON=your_anon_key
NEXT_PUBLIC_SITE_URL=https://www.appauro.com
```

For the app (React Native):
```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 4. Check Email Logs

#### In Supabase Dashboard
- Go to: **Supabase Dashboard** → **Logs** → **Auth Logs**
- Look for email sending attempts
- Check for errors like:
  - `SMTP connection failed`
  - `Invalid credentials`
  - `Rate limit exceeded`
  - `Email template not found`

#### In Browser Console
- Open browser DevTools (F12)
- Check Console tab for `[Auth] Signup attempt:` logs
- Look for error messages related to email sending

### 5. Common Issues & Solutions

#### Issue: "Email not sent" but no error
**Solution:**
- Check spam/junk folder
- Verify email address is correct
- Check Supabase rate limits (default: 4 emails/hour per user)
- Verify SMTP credentials are correct

#### Issue: SMTP connection errors
**Solution:**
- Verify SMTP host and port are correct
- Check firewall/network restrictions
- Ensure SMTP credentials are valid
- Try different SMTP port (587 vs 465)

#### Issue: "Rate limit exceeded"
**Solution:**
- Wait for cooldown period (usually 60 seconds)
- Check Supabase rate limits in dashboard
- Consider upgrading Supabase plan for higher limits
- Use custom SMTP to avoid Supabase rate limits

#### Issue: Emails go to spam
**Solution:**
- Configure SPF/DKIM records for your domain
- Use a reputable SMTP provider (Resend, SendGrid)
- Avoid spam trigger words in email templates
- Set up proper "From" address with verified domain

### 6. Testing Email Configuration

#### Test SMTP Connection
1. Go to **Supabase Dashboard** → **Project Settings** → **Auth** → **SMTP Settings**
2. Click **"Send test email"** (if available)
3. Check if test email arrives

#### Test Sign-up Flow
1. Use a test email address
2. Complete sign-up form
3. Check browser console for `[Auth] Signup attempt:` log
4. Check email inbox (and spam folder)
5. Check Supabase Auth Logs for email sending status

#### Local Development Testing
- Use Inbucket (configured in `supabase/config.toml`)
- Access at: `http://localhost:54324`
- All emails sent during local dev are captured here

### 7. Verify Email Template Configuration

The confirmation email should:
- Include `{{ .ConfirmationURL }}` for the confirmation link
- Redirect to: `https://www.appauro.com/auth/confirm?type=signup`
- Be sent from: `rj@appauro.com`

To update templates:
1. Go to **Supabase Dashboard** → **Authentication** → **Email Templates**
2. Select **"Confirm Signup"** template
3. Ensure it matches the template in `site/email-templates/confirm-signup.html`
4. Save changes

### 8. Debugging Steps

1. **Check sign-up success:**
   ```javascript
   // In browser console after sign-up
   // Look for: [Auth] Signup attempt: { email, hasError, ... }
   ```

2. **Check user creation:**
   - Go to **Supabase Dashboard** → **Authentication** → **Users**
   - Verify user was created
   - Check if `email_confirmed_at` is null (means email not confirmed yet)

3. **Manually resend confirmation:**
   - Use the resend confirmation API: `/api/auth/resend-confirmation`
   - Or use Supabase Dashboard → **Authentication** → **Users** → Select user → **Resend confirmation email**

4. **Check email delivery:**
   - Verify email address is correct
   - Check spam/junk folder
   - Try a different email provider (Gmail, Outlook, etc.)

### 9. Production Checklist

Before going live, ensure:
- [ ] SMTP settings configured in Supabase Dashboard
- [ ] Email confirmations enabled in Auth settings
- [ ] Email templates configured and tested
- [ ] SPF/DKIM records set up for domain (if using custom domain)
- [ ] Test sign-up flow works end-to-end
- [ ] Check spam folder for test emails
- [ ] Monitor Supabase Auth Logs for email sending errors

### 10. Getting Help

If issues persist:
1. Check Supabase Auth Logs for specific error messages
2. Review browser console logs for `[Auth]` prefixed messages
3. Verify all environment variables are set correctly
4. Test with a different email address
5. Check Supabase status page for service issues
6. Contact Supabase support if SMTP configuration issues persist

## Related Files

- `site/AUTH_EMAIL_SETUP.md` - Email setup documentation
- `app/auth.tsx` - Sign-up flow with email confirmation
- `site/app/request/components/AuthStep.tsx` - Web sign-up component
- `site/app/api/auth/resend-confirmation/route.ts` - Resend confirmation API
- `site/email-templates/confirm-signup.html` - Email template

