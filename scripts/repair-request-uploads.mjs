/**
 * One-off repair: move temp uploads to permanent request paths and rewrite DB photo refs.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/repair-request-uploads.mjs <requestId> [uploadSessionId]
 *
 * If uploadSessionId is omitted, reads it from the Stripe checkout session on the request.
 */
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zxazjbduiistnfstnwka.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripeSecret = process.env.STRIPE_SECRET_KEY;

const requestId = process.argv[2];
const uploadSessionIdArg = process.argv[3];

if (!serviceKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!requestId) {
  console.error('Usage: node scripts/repair-request-uploads.mjs <requestId> [uploadSessionId]');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey);

function extractPath(ref) {
  const raw = (ref || '').trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) {
    const re = /\/(?:storage\/v1\/)?object\/(?:sign|public|authenticated)\/([^/?]+)\/([^?]+)/;
    const m = (raw.split('?')[0] || raw).match(re);
    return m?.[2] ? decodeURIComponent(m[2]) : null;
  }
  return raw.replace(/^\/+/, '');
}

function remapTempPath(ref, uploadSessionId, targetBase) {
  const path = extractPath(ref);
  if (!path) return ref;
  const tempPrefix = `temp-uploads/${uploadSessionId}`;
  if (path === tempPrefix || path.startsWith(`${tempPrefix}/`)) {
    const suffix = path.slice(tempPrefix.length).replace(/^\//, '');
    return suffix ? `${targetBase}/${suffix}` : targetBase;
  }
  return path;
}

function remapArray(values, uploadSessionId, targetBase) {
  return values.map((v) => remapTempPath(v, uploadSessionId, targetBase));
}

async function listEntries(bucket, prefix) {
  const { data } = await admin.storage.from(bucket).list(prefix);
  return data || [];
}

async function moveRecursive(bucket, prefix, destBase) {
  const entries = await listEntries(bucket, prefix);
  for (const entry of entries) {
    if (entry.id) {
      const fromPath = `${prefix}/${entry.name}`;
      const toPath = `${destBase}/${entry.name}`;
      const { error } = await admin.storage.from(bucket).move(fromPath, toPath);
      if (error) {
        console.error('Move failed:', fromPath, '->', toPath, error.message);
      } else {
        console.log('Moved:', fromPath, '->', toPath);
      }
    } else {
      await moveRecursive(bucket, `${prefix}/${entry.name}`, `${destBase}/${entry.name}`);
    }
  }
}

async function resolveUploadSessionId(row) {
  if (uploadSessionIdArg) return uploadSessionIdArg;

  const photos = row.photos || [];
  for (const ref of photos) {
    const path = extractPath(ref);
    if (path?.startsWith('temp-uploads/')) {
      const parts = path.split('/');
      if (parts.length >= 2) return parts[1];
    }
  }

  const sessionId = row.stripe_session_id;
  if (sessionId && stripeSecret) {
    const Stripe = require('stripe');
    const stripe = new Stripe(stripeSecret);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const fromMeta = session.metadata?.upload_session_id;
    if (fromMeta) return fromMeta;
  }

  return null;
}

async function main() {
  const { data: row, error } = await admin
    .from('requests')
    .select('id, user_id, photos, notes, stripe_session_id')
    .eq('id', requestId)
    .maybeSingle();

  if (error || !row) {
    console.error('Request not found:', error?.message || requestId);
    process.exit(1);
  }

  const uploadSessionId = await resolveUploadSessionId(row);
  if (!uploadSessionId) {
    console.error('Could not determine upload_session_id');
    process.exit(1);
  }

  const bucket = process.env.NEXT_PUBLIC_SUPABASE_REQUEST_MEDIA_BUCKET || 'request-media';
  const targetBase = row.user_id
    ? `users/${row.user_id}/requests/${requestId}`
    : `requests/${requestId}`;
  const sessionPrefix = `temp-uploads/${uploadSessionId}`;

  console.log('Request:', requestId);
  console.log('Upload session:', uploadSessionId);
  console.log('Target base:', targetBase);

  const tempEntries = await listEntries(bucket, sessionPrefix);
  if (tempEntries.length > 0) {
    console.log(`Moving ${tempEntries.length} top-level entries from temp storage...`);
    await moveRecursive(bucket, sessionPrefix, targetBase);
  } else {
    console.log('No temp entries at', sessionPrefix, '(may already be moved)');
  }

  const existingPhotos = (row.photos || []).filter(Boolean);
  const remappedPhotos = remapArray(existingPhotos, uploadSessionId, targetBase);

  let remappedNotes = row.notes;
  try {
    const notes = typeof row.notes === 'string' ? JSON.parse(row.notes) : row.notes;
    if (notes?.media) {
      for (const key of ['outfits', 'roomTourPhotos', 'datingProfileScreenshots']) {
        if (Array.isArray(notes.media[key])) {
          notes.media[key] = remapArray(notes.media[key], uploadSessionId, targetBase);
        }
      }
      remappedNotes = JSON.stringify(notes);
    }
  } catch (e) {
    console.warn('Could not remap notes JSON:', e.message);
  }

  const { error: updateError } = await admin
    .from('requests')
    .update({ photos: remappedPhotos, notes: remappedNotes })
    .eq('id', requestId);

  if (updateError) {
    console.error('DB update failed:', updateError.message);
    process.exit(1);
  }

  console.log('Updated photos column with', remappedPhotos.length, 'paths:');
  remappedPhotos.forEach((p) => console.log('  -', p));
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
