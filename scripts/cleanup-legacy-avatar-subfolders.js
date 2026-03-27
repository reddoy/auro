#!/usr/bin/env node
/* eslint-disable no-console */
const { createClient } = require('@supabase/supabase-js');

function toLegacyPath(flatPath) {
  // profiles/name-id/profile.jpg -> profiles/name-id/avatar/profile.jpg
  const m = String(flatPath).match(/^(profiles\/[^/]+)\/(profile\.[a-z0-9]+)$/i);
  if (!m) return null;
  return `${m[1]}/avatar/${m[2]}`;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const apply = process.argv.includes('--apply');
  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : 500;
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET || 'avatars';

  if (!url || !key) {
    console.error('Missing env vars. Required: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const admin = createClient(url, key);
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);
  console.log(`Bucket: ${bucket}`);

  const { data: profiles, error } = await admin
    .from('profiles')
    .select('id, avatar_url')
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

  let candidates = 0;
  let removed = 0;
  let skipped = 0;
  let failed = 0;

  for (const p of profiles) {
    const flatPath = String(p.avatar_url || '').replace(/^avatars\//, '');
    if (!/^profiles\/[^/]+\/profile\.[a-z0-9]+$/i.test(flatPath)) {
      skipped += 1;
      continue;
    }

    const legacyPath = toLegacyPath(flatPath);
    if (!legacyPath) {
      skipped += 1;
      continue;
    }

    candidates += 1;

    // Only remove legacy if the new flat object exists.
    const newDir = flatPath.substring(0, flatPath.lastIndexOf('/') + 1);
    const newFile = flatPath.substring(flatPath.lastIndexOf('/') + 1);
    const { data: newFiles, error: newListErr } = await admin.storage.from(bucket).list(newDir, { limit: 100 });
    const hasNew = !newListErr && Array.isArray(newFiles) && newFiles.some((f) => f.name === newFile);
    if (!hasNew) {
      console.log(`SKIP ${p.id}: new flat file not found (${flatPath})`);
      skipped += 1;
      continue;
    }

    // Check whether legacy exists before attempting removal.
    const legacyDir = legacyPath.substring(0, legacyPath.lastIndexOf('/') + 1);
    const legacyFile = legacyPath.substring(legacyPath.lastIndexOf('/') + 1);
    const { data: legacyFiles, error: legacyListErr } = await admin.storage.from(bucket).list(legacyDir, { limit: 100 });
    const hasLegacy = !legacyListErr && Array.isArray(legacyFiles) && legacyFiles.some((f) => f.name === legacyFile);
    if (!hasLegacy) {
      skipped += 1;
      continue;
    }

    if (!apply) {
      console.log(`PLAN ${p.id}: remove ${legacyPath}`);
      removed += 1;
      continue;
    }

    const { error: removeErr } = await admin.storage.from(bucket).remove([legacyPath]);
    if (removeErr) {
      console.log(`FAIL ${p.id}: ${removeErr.message}`);
      failed += 1;
      continue;
    }

    console.log(`OK ${p.id}: removed ${legacyPath}`);
    removed += 1;
  }

  console.log('\nSummary');
  console.log(`Candidates: ${candidates}`);
  console.log(`Removed:    ${removed}`);
  console.log(`Skipped:    ${skipped}`);
  console.log(`Failed:     ${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

