# Auth Email Setup Guide

This document outlines the authentication email pages and API routes that have been created, and what needs to be configured in Supabase.

## Pages Created

All pages are located in `site/app/auth/`:

1. **Forgot Password** - `/auth/forgot-password`
   - Allows users to request a password reset email
   - API route: `/api/auth/forgot-password`

2. **Resend Confirmation** - `/auth/resend-confirmation`
   - Allows users to resend their email confirmation link
   - API route: `/api/auth/resend-confirmation`

3. **Magic Link Sign In** - `/auth/magic-link`
   - Allows users to sign in via a one-time magic link
   - API route: `/api/auth/magic-link`

4. **Change Email Address** - `/auth/change-email`
   - Allows authenticated users to change their email address
   - Requires authentication
   - API route: `/api/auth/change-email`

5. **Reauthenticate** - `/auth/reauthenticate`
   - Allows authenticated users to re-authenticate before sensitive actions
   - Requires authentication
   - API route: `/api/auth/reauthenticate`

6. **Invite User** - `/auth/invite`
   - Allows authenticated users to invite others to sign up
   - Requires authentication
   - API route: `/api/auth/invite`

## Email Templates to Configure in Supabase Dashboard

The following email templates need to be customized in your Supabase dashboard (Authentication > Email Templates):

### Authentication Emails

1. **Confirm Signup** (`confirm_signup`)
   - Sent when users sign up
   - Template variables: `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .SiteURL }}`, `{{ .Email }}`
   - Redirect URL: `https://www.appauro.com/auth/confirm`

2. **Invite User** (`invite_user`)
   - Sent when inviting a user
   - Template variables: `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .SiteURL }}`, `{{ .Email }}`
   - Redirect URL: `https://www.appauro.com/auth/confirm`

3. **Magic Link** (`magic_link`)
   - Sent for magic link sign-in
   - Template variables: `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .SiteURL }}`, `{{ .Email }}`
   - Redirect URL: `https://www.appauro.com/auth/callback`

4. **Change Email Address** (`change_email`)
   - Sent when user changes email
   - Template variables: `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .SiteURL }}`, `{{ .Email }}`
   - Redirect URL: `https://www.appauro.com/auth/confirm?type=email_change`

5. **Reset Password** (`reset_password`)
   - Sent for password reset
   - Template variables: `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .SiteURL }}`, `{{ .Email }}`
   - Redirect URL: `https://www.appauro.com/auth/confirm?type=recovery`

6. **Reauthentication** (`reauthentication`)
   - Sent for reauthentication
   - Template variables: `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .SiteURL }}`, `{{ .Email }}`
   - Redirect URL: `https://www.appauro.com/auth/confirm?type=reauthentication`

### Security Notification Emails

These are automatically sent by Supabase when the corresponding actions occur. Customize these templates in the Supabase dashboard:

1. **Password Changed** (`password_changed`)
   - Sent when password is changed
   - Template variables: `{{ .SiteURL }}`, `{{ .Email }}`

2. **Email Address Changed** (`email_changed`)
   - Sent when email address is changed
   - Template variables: `{{ .SiteURL }}`, `{{ .Email }}`

3. **Phone Number Changed** (`phone_changed`)
   - Sent when phone number is changed
   - Template variables: `{{ .SiteURL }}`, `{{ .Email }}`

4. **Identity Linked** (`identity_linked`)
   - Sent when a new identity is linked
   - Template variables: `{{ .SiteURL }}`, `{{ .Email }}`

5. **Identity Unlinked** (`identity_unlinked`)
   - Sent when an identity is unlinked
   - Template variables: `{{ .SiteURL }}`, `{{ .Email }}`

6. **Multi-Factor Authentication Method Added** (`mfa_method_added`)
   - Sent when MFA method is added
   - Template variables: `{{ .SiteURL }}`, `{{ .Email }}`

7. **Multi-Factor Authentication Method Removed** (`mfa_method_removed`)
   - Sent when MFA method is removed
   - Template variables: `{{ .SiteURL }}`, `{{ .Email }}`

## Email Configuration

Emails are sent from: **rj@appauro.com**

This email address should already be configured in your Supabase project settings. If not, configure it in:
- Supabase Dashboard > Project Settings > Auth > SMTP Settings

## Testing

To test the email flows:

1. **Local Development**: Use Inbucket (configured in `supabase/config.toml`)
   - Access at: `http://localhost:54324`
   - This captures all emails sent during local development

2. **Production**: Emails will be sent to the actual email addresses

## Redirect/Confirmation Pages

These pages handle users landing from email links:

1. **Confirm Email** - `/auth/confirm`
   - Handles: signup, invite, magic link, email change, reauthentication
   - Automatically verifies tokens and shows appropriate success messages

2. **Reset Password** - `/auth/reset-password`
   - Allows users to set a new password after clicking reset link
   - Includes password strength validation and confirmation field

3. **Security Notification Pages** - `/auth/security/*`
   - `/auth/security/password-changed` - Password changed notification
   - `/auth/security/email-changed` - Email changed notification
   - `/auth/security/phone-changed` - Phone changed notification
   - `/auth/security/identity-linked` - Identity linked notification
   - `/auth/security/identity-unlinked` - Identity unlinked notification
   - `/auth/security/mfa-added` - MFA method added notification
   - `/auth/security/mfa-removed` - MFA method removed notification

## Notes

- All authentication-required pages (change-email, reauthenticate, invite) require the user to be signed in
- The API routes use the Supabase service role key for admin operations
- Security notification emails are sent automatically by Supabase - no API routes needed
- All redirect URLs point to `https://www.appauro.com` (or your configured `NEXT_PUBLIC_SITE_URL`)
- The confirm page (`/auth/confirm`) handles multiple confirmation types based on the `type` query parameter
- Password reset redirects to `/auth/reset-password` where users can set their new password

