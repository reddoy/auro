# Staging E2E matrix (Stripe test mode)

Run on your Vercel **staging/preview** deployment with `sk_test_` keys. Do **not** enable Stripe live mode until every row passes.

Record for each run: `request_id`, Stripe Checkout Session ID, PaymentIntent ID, timestamps, pass/fail notes.

## Prerequisites

- [ ] `CRON_SECRET` set in Vercel (required for internal payout + maintenance)
- [ ] Stripe webhook (test) → `https://<staging>/api/stripe/webhook` with `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`
- [ ] Supabase migration `20260520120000_harden_requests_status_and_social_rls.sql` applied
- [ ] Two test accounts: reviewee + approved reviewer (reviewer has push token optional)

## Test matrix

| # | Scenario | Steps | Pass criteria |
|---|----------|-------|----------------|
| 1 | Full funnel | Home → Get reviewed → pick reviewer → photos → auth → pay (test card `4242…`) | `status=paid`, photos in storage, lands `/app/requests` |
| 2 | Deep link | `/request?creatorSlug=<approved>` | Lands on photo upload with reviewer preselected |
| 3 | OAuth interrupt | Start funnel → Google auth → return | Resumes at payment with state intact |
| 4 | Declined card | Use `4000 0000 0000 0002` | Stays on payment, no duplicate charge |
| 5 | Reviewer decline | Reviewer opens paid request → Decline | `status=rejected`, Stripe test refund, reviewee notification |
| 6 | Accept + submit | Accept → upload video → Submit | `status=completed`, reviewee push, `payment_distributed` or `payment_status=queued` (held) |
| 7 | Reviewee rates | Open completed request → rate 1–5 | `reviewer_reviews` row exists |
| 8 | No Connect | Reviewer without Stripe Connect submits | Submit OK; payout held; retry cron after Connect onboarding |
| 9 | Timeout cron | Set `accept_by` in past on test `paid` row → trigger GET `/api/payments/process-timeout-refunds` with `x-vercel-cron` | `status=timeout`, refund processed |
| 10 | Abandoned checkout | Create session, abandon Stripe | Reviewer **not** pushed until payment succeeds |

## Post-run reconciliation

- [ ] Every `paid` row has `stripe_payment_intent_id` and `accept_by`
- [ ] Every `completed` row has `review.media.videoUrl` and payout fields or explicit hold
- [ ] Every `rejected` / `timeout` has `refund_status` ≠ `none` or ops alert for `failed`

## Observability

- Vercel logs: filter `distribute-reviewer-payment`, `stripe/webhook`, `timeout-refunds`
- Stripe Dashboard (test): session, PI, refund, transfer
- Supabase: spot-check `requests` row fields above

## Stripe live gate (do not proceed until green)

See [`docs/root-guides/STRIPE_PRODUCTION_SETUP.md`](root-guides/STRIPE_PRODUCTION_SETUP.md). Only switch to live keys after this matrix is fully green on staging.
