# Auro Marketing Site (Static)

This `site/` directory contains a standalone, static marketing page for Auro. It is separate from the Expo app and intended for deployment at the root domain.

- Root site: appauro.com → serves files from `site/`
- App (Expo): app.appauro.com → serves your Expo web build (or mobile apps)

## Structure
- `index.html` — single, semantic landing page with SEO tags
- `styles.css` — responsive styles using the Auro brand palette

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

### Vercel
- Project root: the repository root
- Framework preset: Other
- Build command: none
- Output directory: `site`
- Domain: `appauro.com` → points to this project
- Subdomain: `app.appauro.com` → point to your Expo web deployment (separate project) or redirect to the native app stores

### Netlify
- Base directory: `site`
- Build command: none
- Publish directory: `site`
- Domain: `appauro.com`

## Configure links
- "Open the App" links currently point to `/`. Update to your production app URL, for example:
  - `https://app.appauro.com/` (Expo Web), or
  - Deep link: `auro://` (mobile), or
  - Store links (App Store / Google Play)

Update both anchors in `index.html` (`#open-app` and `#footer-open-app`).

## Newsletter form
The hero form posts to `/api/newsletter`. Replace with your backend endpoint or a service (ConvertKit, Mailchimp, Resend, etc.).

```html
<form method="POST" action="https://your-api.example.com/newsletter">
```

Add any additional hidden fields or double opt‑in as needed.

## SEO
- Title and meta description are set in `index.html`.
- Add Open Graph/Twitter tags if you want rich link previews.

## TODOs
- Replace placeholder images with real iPhone UI screenshots.
- Point the newsletter form to your backend.
- Update the "Open the App" URL.

