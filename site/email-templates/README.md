# Email Templates for Supabase

This directory contains HTML email templates for all authentication and security email types in Supabase.

## How to Use

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** > **Email Templates**
3. For each template type, click **Edit** and paste the corresponding HTML from the files below

## Template Mapping

### Authentication Emails

| Supabase Template Name | File Name | Description |
|------------------------|-----------|-------------|
| `confirm_signup` | `confirm-signup.html` | Email confirmation after signup |
| `invite_user` | `invite-user.html` | Invitation email for new users |
| `change_email` | `change-email.html` | Email change confirmation |
| `reset_password` | `reset-password.html` | Password reset link |
| `reauthentication` | `reauthentication.html` | Re-authentication verification |

### Security Notification Emails

| Supabase Template Name | File Name | Description |
|------------------------|-----------|-------------|
| `password_changed` | `password-changed.html` | Notification when password is changed |
| `email_changed` | `email-changed.html` | Notification when email is changed |
| `phone_changed` | `phone-changed.html` | Notification when phone is changed |
| `identity_linked` | `identity-linked.html` | Notification when identity is linked |
| `identity_unlinked` | `identity-unlinked.html` | Notification when identity is unlinked |
| `mfa_method_added` | `mfa-added.html` | Notification when MFA is added |
| `mfa_method_removed` | `mfa-removed.html` | Notification when MFA is removed |

## Supabase Template Variables

These templates use the following Supabase variables:

- `{{ .ConfirmationURL }}` - The confirmation/action URL
- `{{ .Token }}` - 6-digit OTP (if applicable)
- `{{ .SiteURL }}` - Your site URL
- `{{ .Email }}` - User's email address

## Design Notes

- All templates use your brand colors: purple gradient (#FF6F00 to #FF2D55)
- Dark theme background (#1A0B2E) with card background (#24123B)
- Responsive design that works on mobile and desktop
- Security notifications include prominent security warnings
- All templates include fallback text links in case buttons don't render

## Customization

You can customize:
- Colors: Update the hex codes in the `style` attributes
- Fonts: Change the `font-family` in the body tag
- Logo: Add an `<img>` tag with your logo URL
- Links: Update the redirect URLs in the API routes if needed

