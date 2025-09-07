# Auro Web (Public Creator Pages + Checkout)

This `site/` directory will host public creator pages and the web checkout flow. It is separate from the Expo app and intended for deployment on a public domain.

- Root site: appauro.com → serves files from `site/`
- App (Expo): app.appauro.com → serves your Expo web build (or mobile apps)

## Structure
- `app/c/[slug]/page.tsx` — public creator page
- `app/c/[slug]/request/page.tsx` — request form (requires sign-in)
- `app/checkout/success/page.tsx` — success page with deep link back to app
- `app/checkout/cancel/page.tsx` — cancel page
- `app/api/*` — route handlers (checkout, webhook, etc.)
- `index.html` — temporary static landing page (will be replaced by Next.js)
- `styles.css` — legacy styles; not used by Next.js

Assets referenced from the app repo:
- `../assets/images/favicon.png`
- `../auro_font_logo.png` or `../auro_mirror_logo.png`
- Placeholder screenshots currently use `../assets/images/icon.png` — replace with real iPhone screenshots when ready

## How to run locally
Open `site/index.html` directly in a browser, or serve with a simple static server:

```bash
# From repo root
npx serve site
# or
python -m http.server --directory site 5173
```

Then open `http://localhost:3000` (or the printed URL).

## Deployment
You can deploy the `site/` folder to any static host (Netlify, Vercel, Cloudflare Pages, S3+CloudFront, GitHub Pages). Two common setups:

### Vercel (Next.js)
- Project root: the repository root
- Framework: Next.js (App Router)
- Build command: `next build` (from `site/` package, see below)
- Output directory: `.vercel/output` (managed by Next.js)
- Domain: `creators.auro.<TLD>` → points to this project
- Universal links host: `app.auro.<TLD>`

### Netlify
- Base directory: `site`
- Build command: none
- Publish directory: `site`
- Domain: `appauro.com`

## Configure env
Create `.env` in `site/` (or Vercel Project Env):

```
NEXT_PUBLIC_CREATOR_WEB_BASE=https://creators.auro.<TLD>
NEXT_PUBLIC_APP_UNIVERSAL_LINK_HOST=app.auro.<TLD>
NEXT_PUBLIC_DEEP_LINK_SCHEME=auro
NEXT_PUBLIC_WEB_CHECKOUT_ENABLED=true
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PLATFORM_FEE_BPS=0
```

## Newsletter form
The hero form posts to `/api/newsletter`. Replace with your backend endpoint or a service (ConvertKit, Mailchimp, Resend, etc.).

```html
<form method="POST" action="https://your-api.example.com/newsletter">
```

Add any additional hidden fields or double opt‑in as needed.

## SEO
- Add meta tags in creator pages. Use `robots.txt` to allow crawling of creator profiles.

## TODOs
- Replace placeholder images with real iPhone UI screenshots.
- Point the newsletter form to your backend.
- Update the "Open the App" URL.

