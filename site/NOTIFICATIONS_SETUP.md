# Product notifications (email + SMS)

Transactional notifications use Resend (email) and Twilio (SMS). Auth emails remain on Supabase SMTP.

## Vercel environment variables

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Resend API key for product emails |
| `RESEND_FROM_EMAIL` | Sender, e.g. `Auro <notifications@appauro.com>` |
| `TWILIO_ACCOUNT_SID` | Twilio account |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Twilio sender number (E.164) |

## Database

Apply migration `supabase/migrations/20260528120000_notification_deliveries.sql` and ensure `20260525120000_fix_timeout_status_and_rpc.sql` is applied on production.

## User preferences

Stored in `profiles.preferences`:

- `email_notifications` (default: on)
- `sms_notifications` (default: off until user opts in)
- `phone` (E.164 when saved via API)

Settings UI: `/app/settings/notifications`
