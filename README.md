# Auro

Honest dating-profile feedback from real women. Users upload their dating-app photos and prompts, pick a reviewer, pay, and get back actionable feedback on how they come across.

**Live:** [auro-pearl.vercel.app](https://auro-pearl.vercel.app)

**Status:** Inactive.

## Background

Auro was a dating-profile feedback service I tried to launch. The TikTok videos for it got a few million views, but that turned into only two sales, and one of those was refunded. I also learned how strict Apple's App Store rules are while trying to get the companion iOS app approved.

## Features

- **Request flow:** choose a reviewer, upload photos, answer prompts, consent, sign in, and pay. Progress is saved locally, so an OAuth round trip doesn't lose anything.
- **Reviewer side:** reviewers apply, get approved by an admin, accept or deny requests, save drafts, and submit reviews before a deadline.
- **Payments:** Stripe Checkout for buyers and Stripe Connect Express payouts for reviewers. Requests that time out are refunded automatically, and disputes can be raised and resolved.
- **Admin dashboard:** manage requests, reviewers, users, manual payments, and failed payouts.
- **Notifications:** transactional email through Resend, plus push and SMS through Supabase Edge Functions.

## Tech stack

- [Next.js 14](https://nextjs.org) (App Router), React 18, TypeScript, Tailwind CSS
- [Supabase](https://supabase.com): Postgres, auth, storage, and Edge Functions
- [Stripe](https://stripe.com) Checkout and Connect
- [Resend](https://resend.com) for email
- Deployed on [Vercel](https://vercel.com), with GitHub Actions running a typecheck and build on every push

## Getting started

```bash
npm install --prefix site
cp site/.env.local.example site/.env.local   # then fill in values from Vercel → Settings → Environment Variables
npm run dev                                   # http://localhost:3000
```

The site also needs the Supabase and Stripe keys from the Vercel project's environment variables.

## Project structure

| Path | What's in it |
|---|---|
| `site/` | The Next.js app: pages in `site/app/`, API routes in `site/app/api/` |
| `supabase/` | Database migrations, SQL, and Edge Functions (push, SMS, Stripe Connect, scheduled expirations) |
| `scripts/` | One-off maintenance and diagnostic scripts for storage, avatars, and Stripe |
| `docs/` | Launch playbook, runbooks, payment and refund logic, request-flow notes, and QA logs |
| `docs/root-guides/` | Setup and troubleshooting guides for deployment, admin, credentials, and storage policies |

## Docs worth reading first

- [`docs/request-flow-overview.md`](docs/request-flow-overview.md): how a request moves from upload to payment
- [`docs/payments-refunds.md`](docs/payments-refunds.md): charges, payouts, and refunds
- [`docs/launch-playbook.md`](docs/launch-playbook.md) and [`docs/go-live-checklist.md`](docs/go-live-checklist.md)
- [`docs/runbooks.md`](docs/runbooks.md): what to do when something breaks
