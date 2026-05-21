# Stripe live mode gate

**Status: blocked** — do not enable Stripe live keys or live webhooks until staging E2E is green.

## Required before live

1. Staging E2E matrix complete — [`staging-e2e-matrix.md`](staging-e2e-matrix.md)
2. P0 fixes deployed: payout on submit, timeout cron marks + refunds, secured maintenance
3. Copy/terms aligned with 14-day accept / 48-hour complete rules
4. [`docs/root-guides/STRIPE_PRODUCTION_SETUP.md`](root-guides/STRIPE_PRODUCTION_SETUP.md) checklist

## When approved

- Replace `sk_test_` / `pk_test_` with live keys in Vercel production only
- Single webhook endpoint: `https://<production>/api/stripe/webhook`
- Keep Supabase edge `stripe-webhook` disabled unless explicitly split by event type
- Confirm `CRON_SECRET`, `STRIPE_PLATFORM_ACCOUNT_ID`, Connect strategy
