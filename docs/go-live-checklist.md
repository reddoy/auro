# Go-live checklist (Stripe live + production)

Use this after flipping Stripe to live mode. Dashboard steps you do manually; automated checks via `node scripts/verify-live-readiness.mjs`.

## Current infra status (verified 2026-06-06)

| Item | Status |
|------|--------|
| Production URL | `https://www.appauro.com` (200) |
| `NEXT_PUBLIC_SITE_URL` in Vercel | `https://www.appauro.com` |
| Vercel crons | 2am payouts, 3am timeout refunds, 4am deadline warnings |
| Supabase migrations | `notification_deliveries`, timeout status + RPC applied |
| Webhook route | `/api/stripe/webhook` live (GET → 405) |
| Stripe keys in Vercel | **Still test** (`pk_test_…`, `acct_1S0FmFBCrjcqavov`) — flip before taking live payments |

**Live Stripe account ID** (from Stripe dashboard, Live mode): `acct_1S0Fm0BQDAObfzKx`  
**Test platform account ID** (currently in Vercel): `acct_1S0FmFBCrjcqavov`  
Update `STRIPE_PLATFORM_ACCOUNT_ID` to the **live** account when you swap keys.

---

## 1. Stripe Dashboard (Live mode)

1. Toggle **Live mode** (top right).
2. **Developers → Webhooks → Add endpoint**
   - URL: `https://www.appauro.com/api/stripe/webhook`
   - Events:
     - `checkout.session.completed`
     - `checkout.session.async_payment_succeeded`
     - `checkout.session.async_payment_failed`
     - `charge.refunded`
     - `charge.refund.updated`
3. Copy signing secret (`whsec_…`) → Vercel `STRIPE_WEBHOOK_SECRET` (Production only).
4. **Developers → API keys** → copy `sk_live_…` and `pk_live_…`.
5. **Settings → Account** → copy live `acct_…` → Vercel `STRIPE_PLATFORM_ACCOUNT_ID`.

Do **not** enable the Supabase edge webhook unless you intend dual handlers.

---

## 2. Vercel → Project `auro` → Environment Variables (Production)

| Variable | Value |
|----------|--------|
| `STRIPE_SECRET_KEY` | `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | Live `whsec_…` from step 1 |
| `STRIPE_PLATFORM_ACCOUNT_ID` | Live `acct_…` (must match secret key account) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_…` |
| `NEXT_PUBLIC_SITE_URL` | `https://www.appauro.com` (already set) |
| `CRON_SECRET` | Keep existing (required for payout/timeout crons) |

**Leave off:** `STRIPE_CONNECT_DESTINATION_CHARGES` (default platform checkout is safer at launch).

**Deferred:** `RESEND_API_KEY`, `TWILIO_*` — product emails/SMS skip silently until added. Code expects `RESEND_API_KEY` (not `Resend_API_key`).

After saving env vars → **Redeploy production** (Deployments → … → Redeploy, or push to master).

---

## 3. Supabase Dashboard → Auth → URL Configuration

- **Site URL:** `https://www.appauro.com`
- **Redirect URLs** (add all):
  - `https://www.appauro.com/auth/confirm`
  - `https://www.appauro.com/auth/callback`
  - `https://www.appauro.com/auth/reset-password`
  - `https://appauro.com/auth/confirm` (optional, if non-www redirects)
  - `auro://auth/callback` (legacy mobile deep link)

Google Cloud OAuth (if enabled): same redirect URIs.

Auth emails use **Supabase SMTP**, not Resend — see [`site/AUTH_EMAIL_SETUP.md`](../site/AUTH_EMAIL_SETUP.md).

---

## 4. Redeploy + verify

```bash
cd site && npx vercel env pull .env.vercel.production --environment=production --yes
cd .. && node scripts/verify-live-readiness.mjs
```

---

## 5. Live smoke test (~15 min, real card)

1. Smallest tier checkout on www → lands `/app/requests` with `status=paid`.
2. Stripe → Webhooks → live endpoint → `checkout.session.completed` **200**.
3. Reviewer accept → submit video → `status=completed`.
4. (Recommended) Second request → reviewer decline → Stripe refund + DB `refund_status=refunded`.
5. Reviewers who onboarded in **test mode** must re-run Connect onboarding in live.

Monitor Vercel logs: `stripe-webhook`, `distribute-reviewer-payment`, `process-timeout-refunds`.

---

## Known risks (first 48h)

- Decline refund DB sync was flaky in May E2E — reconcile via `/api/payments/refund` if needed.
- Payouts queue until reviewers complete **live** Connect onboarding (2am retry cron).
- No user email on disputes — watch Stripe Dashboard manually.
