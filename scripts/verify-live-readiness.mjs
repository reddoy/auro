#!/usr/bin/env node
/**
 * Post go-live verification for Auro production.
 * Run after updating Stripe live keys + webhook in Vercel/Stripe dashboards.
 *
 * Usage:
 *   node scripts/verify-live-readiness.mjs
 *   SITE_URL=https://auro-pearl.vercel.app node scripts/verify-live-readiness.mjs
 */

const SITE_URL = (process.env.SITE_URL || 'https://auro-pearl.vercel.app').replace(/\/$/, '');

const checks = [];

function pass(name, detail) {
  checks.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail) {
  checks.push({ name, ok: false, detail });
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ''}`);
}

async function fetchStatus(url, init) {
  const res = await fetch(url, { ...init, redirect: 'follow' });
  return { status: res.status, ok: res.ok };
}

async function main() {
  console.log(`\nAuro live readiness check — ${SITE_URL}\n`);

  try {
    const home = await fetchStatus(`${SITE_URL}/`);
    if (home.status === 200) pass('Homepage', `HTTP ${home.status}`);
    else fail('Homepage', `HTTP ${home.status}`);
  } catch (e) {
    fail('Homepage', e.message);
  }

  try {
    const webhook = await fetchStatus(`${SITE_URL}/api/stripe/webhook`, { method: 'GET' });
    if (webhook.status === 405) pass('Stripe webhook route', 'GET returns 405 (POST-only, expected)');
    else fail('Stripe webhook route', `GET returned ${webhook.status}, expected 405`);
  } catch (e) {
    fail('Stripe webhook route', e.message);
  }

  try {
    const webhookPost = await fetchStatus(`${SITE_URL}/api/stripe/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    if (webhookPost.status === 400) pass('Stripe webhook POST guard', 'Missing signature returns 400');
    else if (webhookPost.status === 500) fail('Stripe webhook POST guard', '500 — check STRIPE_WEBHOOK_SECRET on Vercel');
    else fail('Stripe webhook POST guard', `HTTP ${webhookPost.status}`);
  } catch (e) {
    fail('Stripe webhook POST guard', e.message);
  }

  for (const path of ['/auth/sign-in', '/auth/forgot-password', '/request', '/app']) {
    try {
      const r = await fetchStatus(`${SITE_URL}${path}`);
      if (r.status >= 200 && r.status < 400) pass(`Route ${path}`, `HTTP ${r.status}`);
      else fail(`Route ${path}`, `HTTP ${r.status}`);
    } catch (e) {
      fail(`Route ${path}`, e.message);
    }
  }

  // Optional: read pulled Vercel env if present (local only)
  try {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const envPath = path.join(process.cwd(), 'site/.env.vercel.production');
    if (fs.existsSync(envPath)) {
      const raw = fs.readFileSync(envPath, 'utf8');
      const get = (key) => {
        const m = raw.match(new RegExp(`^${key}="([^"]*)"`, 'm'));
        return m?.[1] ?? '';
      };
      const pk = get('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
      const platform = get('STRIPE_PLATFORM_ACCOUNT_ID');
      const site = get('NEXT_PUBLIC_SITE_URL');

      if (site === 'https://auro-pearl.vercel.app') pass('NEXT_PUBLIC_SITE_URL', site);
      else fail('NEXT_PUBLIC_SITE_URL', site || 'missing — set https://auro-pearl.vercel.app');

      if (pk.startsWith('pk_live_')) pass('Stripe publishable key mode', 'live');
      else if (pk.startsWith('pk_test_')) fail('Stripe publishable key mode', 'still pk_test_ — update in Vercel Production');
      else fail('Stripe publishable key mode', pk ? 'unrecognized prefix' : 'empty in env pull');

      if (platform.startsWith('acct_')) {
        if (pk.startsWith('pk_live_')) pass('STRIPE_PLATFORM_ACCOUNT_ID', platform);
        else pass('STRIPE_PLATFORM_ACCOUNT_ID (test)', platform);
      } else fail('STRIPE_PLATFORM_ACCOUNT_ID', 'missing');
    } else {
      console.log('ℹ Skipping Vercel env pull checks (run: cd site && npx vercel env pull .env.vercel.production --environment=production)');
    }
  } catch {
    // ignore
  }

  console.log('\nManual dashboard steps (cannot automate):');
  console.log('  1. Stripe Live → Webhook → https://auro-pearl.vercel.app/api/stripe/webhook');
  console.log('  2. Vercel Production → sk_live_, pk_live_, live whsec_, live acct_');
  console.log('  3. Supabase Auth → Site URL + redirect URLs for auro-pearl.vercel.app');
  console.log('  4. Redeploy production after env changes');
  console.log('  5. Live smoke: smallest tier payment → webhook 200 in Stripe dashboard\n');

  const failed = checks.filter((c) => !c.ok);
  if (failed.length) {
    console.error(`${failed.length} check(s) failed.\n`);
    process.exit(1);
  }
  console.log('All automated checks passed.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
