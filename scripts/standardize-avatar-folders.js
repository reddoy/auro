#!/usr/bin/env node
/* eslint-disable no-console */
const { createClient } = require('@supabase/supabase-js');

function slugPart(value) {
  if (!value) return '';
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function shortId(value) {
  if (!value) return '';
  return String(value).replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toLowerCase();
}

function normalizeAvatarPath(value) {
  if (!value) return '';
  const raw = String(value).trim();
  if (!/^https?:\/\//i.test(raw)) return raw.replace(/^avatars\//, '');
  const match = raw.match(/\/(?:storage\/v1\/)?object\/(?:public|sign)\/avatars\/([^?]+)/);
  return match && match[1] ? decodeURIComponent(match[1]) : raw;
}

function buildDestinationPath(profile, sourcePath) {
  const first = slugPart(profile.first_name);
  const last = slugPart(profile.last_name);
  const emailName = profile.email && profile.email.includes('@') ? slugPart(profile.email.split('@')[0]) : '';
  const baseName = [first, last].filter(Boolean).join('-') || emailName || 'user';
  const suffix = shortId(profile.id) || 'anon';
  const ext = (String(sourcePath).split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  return `profiles/${baseName}-${suffix}/profile.${ext}`;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const apply = process.argv.includes('--apply');
  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : 500;

  if (!url || !key) {
    console.error('Missing env vars. Required: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const admin = createClient(url, key);
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET || 'avatars';

  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);
  console.log(`Bucket: ${bucket}`);

  const { data: profiles, error } = await admin
    .from('profiles')
    .select('id, first_name, last_name, email, avatar_url')
    .not('avatar_url', 'is', null)
    .limit(limit);

  if (error) {
    console.error('Failed to fetch profiles:', error.message);
    process.exit(1);
  }

  if (!profiles || profiles.length === 0) {
    console.log('No profiles with avatar_url found.');
    return;
  }

  let changed = 0;
  let skipped = 0;
  let failed = 0;

  for (const profile of profiles) {
    const sourcePath = normalizeAvatarPath(profile.avatar_url);
    if (!sourcePath || /^https?:\/\//i.test(sourcePath)) {
      console.log(`SKIP ${profile.id}: unsupported avatar_url format (${profile.avatar_url})`);
      skipped += 1;
      continue;
    }

    // Already standardized in the new flat format.
    if (/^profiles\/[^/]+\/profile\.[a-z0-9]+$/i.test(sourcePath)) {
      skipped += 1;
      continue;
    }

    const destinationPath = buildDestinationPath(profile, sourcePath);

    if (destinationPath === sourcePath) {
      skipped += 1;
      continue;
    }

    if (!apply) {
      console.log(`PLAN ${profile.id}: ${sourcePath} -> ${destinationPath}`);
      changed += 1;
      continue;
    }

    const { error: copyError } = await admin.storage.from(bucket).copy(sourcePath, destinationPath);
    if (copyError) {
      console.error(`FAIL COPY ${profile.id}: ${copyError.message}`);
      failed += 1;
      continue;
    }

    const { error: updateError } = await admin
      .from('profiles')
      .update({ avatar_url: destinationPath })
      .eq('id', profile.id);

    if (updateError) {
      console.error(`FAIL UPDATE ${profile.id}: ${updateError.message}`);
      failed += 1;
      continue;
    }

    console.log(`OK ${profile.id}: ${sourcePath} -> ${destinationPath}`);
    changed += 1;
  }

  console.log('\nSummary');
  console.log(`Changed: ${changed}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed:  ${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

