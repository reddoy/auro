import type { SupabaseClient } from '@supabase/supabase-js';
import {
  avatarBucketName,
  normalizeStoragePath,
  remapTempUploadPath,
  requestMediaBucketName,
} from '@/lib/supabase-storage-path';

type StorageEntry = { id?: string | null; name: string };

async function listStorageEntries(
  admin: SupabaseClient,
  bucket: string,
  prefix: string
): Promise<StorageEntry[]> {
  const { data } = await admin.storage.from(bucket).list(prefix);
  return (data || []) as StorageEntry[];
}

async function moveRecursive(
  admin: SupabaseClient,
  bucket: string,
  prefix: string,
  destBase: string
): Promise<void> {
  const entries = await listStorageEntries(admin, bucket, prefix);
  for (const entry of entries) {
    if (entry.id) {
      const fromPath = `${prefix}/${entry.name}`;
      const toPath = `${destBase}/${entry.name}`;
      const { error } = await admin.storage.from(bucket).move(fromPath, toPath);
      if (error) {
        console.error('[finalize-uploads] move failed', fromPath, '->', toPath, error.message);
      }
    } else {
      await moveRecursive(admin, bucket, `${prefix}/${entry.name}`, `${destBase}/${entry.name}`);
    }
  }
}

function remapStringArray(values: string[], uploadSessionId: string, targetBase: string): string[] {
  return values.map((v) => remapTempUploadPath(v, uploadSessionId, targetBase));
}

function remapNotesMedia(
  notesRaw: unknown,
  uploadSessionId: string,
  targetBase: string
): string | null {
  if (!notesRaw) return null;
  let notes: Record<string, unknown>;
  try {
    notes =
      typeof notesRaw === 'string'
        ? (JSON.parse(notesRaw) as Record<string, unknown>)
        : (notesRaw as Record<string, unknown>);
  } catch {
    return null;
  }

  const media = notes.media;
  if (!media || typeof media !== 'object') return JSON.stringify(notes);

  const mediaObj = media as Record<string, unknown>;
  for (const key of ['outfits', 'roomTourPhotos', 'datingProfileScreenshots'] as const) {
    const arr = mediaObj[key];
    if (Array.isArray(arr)) {
      mediaObj[key] = remapStringArray(arr.filter((v) => typeof v === 'string') as string[], uploadSessionId, targetBase);
    }
  }
  notes.media = mediaObj;
  return JSON.stringify(notes);
}

/**
 * Move temp-upload session files to the permanent request folder and rewrite
 * stored photo references from signed URLs / temp paths to bare object paths.
 */
export async function finalizeRequestUploads(
  admin: SupabaseClient,
  params: { requestId: string; uploadSessionId: string }
): Promise<{ moved: boolean; photoPaths: string[] }> {
  const { requestId, uploadSessionId } = params;
  const sessionPrefix = `temp-uploads/${uploadSessionId}`;
  const requestMediaBucket = requestMediaBucketName();

  const { data: reqRow } = await admin
    .from('requests')
    .select('user_id, photos, notes')
    .eq('id', requestId)
    .maybeSingle();

  if (!reqRow) {
    return { moved: false, photoPaths: [] };
  }

  const userId = (reqRow as { user_id?: string }).user_id;
  const targetBase = userId
    ? `users/${userId}/requests/${requestId}`
    : `requests/${requestId}`;

  const tempEntries = await listStorageEntries(admin, requestMediaBucket, sessionPrefix);
  if (tempEntries.length > 0) {
    await moveRecursive(admin, requestMediaBucket, sessionPrefix, targetBase);
  }

  const existingPhotos = ((reqRow as { photos?: string[] | null }).photos || []).filter(Boolean);
  const remappedPhotos = remapStringArray(existingPhotos, uploadSessionId, targetBase);

  const remappedNotes = remapNotesMedia(
    (reqRow as { notes?: unknown }).notes,
    uploadSessionId,
    targetBase
  );

  const updatePayload: Record<string, unknown> = { photos: remappedPhotos };
  if (remappedNotes != null) {
    updatePayload.notes = remappedNotes;
  }

  const { error: updateError } = await admin.from('requests').update(updatePayload).eq('id', requestId);
  if (updateError) {
    console.error('[finalize-uploads] failed to update request photos', updateError.message);
  }

  return { moved: tempEntries.length > 0, photoPaths: remappedPhotos };
}

/** Move avatar/selfie temp uploads and attach to the reviewee profile. */
export async function finalizeAvatarUploads(
  admin: SupabaseClient,
  params: { requestId: string; uploadSessionId: string }
): Promise<void> {
  const { requestId, uploadSessionId } = params;
  const avatarsBucket = avatarBucketName();

  const { data: avatarEntries } = await admin.storage
    .from(avatarsBucket)
    .list(`temp-uploads/${uploadSessionId}/avatar`);
  const { data: selfieEntries } = await admin.storage
    .from(avatarsBucket)
    .list(`temp-uploads/${uploadSessionId}/selfie`);
  const entries = [...(avatarEntries || []), ...(selfieEntries || [])];
  if (entries.length === 0) return;

  const { data: reqRow } = await admin.from('requests').select('user_id').eq('id', requestId).maybeSingle();
  const userIdForAvatar = (reqRow as { user_id?: string } | null)?.user_id;

  const first = entries.find((e) => e?.id) || entries[0];
  if (!first?.name) return;

  const inAvatarFolder = Boolean(avatarEntries?.some((e) => e.name === first.name));
  const fromPath = inAvatarFolder
    ? `temp-uploads/${uploadSessionId}/avatar/${first.name}`
    : `temp-uploads/${uploadSessionId}/selfie/${first.name}`;
  const toPath = userIdForAvatar
    ? `users/${userIdForAvatar}/avatar/${first.name}`
    : `requests/${requestId}/avatar/${first.name}`;

  const { error } = await admin.storage.from(avatarsBucket).move(fromPath, toPath);
  if (error) {
    console.error('[finalize-uploads] avatar move failed', error.message);
    return;
  }

  if (userIdForAvatar) {
    await admin.from('profiles').update({ avatar_url: toPath }).eq('id', userIdForAvatar);
  }
}

/** Profile email sync + media finalize after checkout payment. */
export async function applyCheckoutSessionSideEffects(
  admin: SupabaseClient,
  session: {
    metadata?: Record<string, string> | null;
    customer_details?: { email?: string | null } | null;
    customer_email?: string | null;
  },
  requestId: string
): Promise<void> {
  const metadata = (session.metadata || {}) as Record<string, string>;
  const uploadSessionId = metadata.upload_session_id;
  const customerEmail =
    session.customer_details?.email ||
    (typeof session.customer_email === 'string' ? session.customer_email : '') ||
    '';

  try {
    const { data: reqRow } = await admin.from('requests').select('user_id').eq('id', requestId).maybeSingle();
    const userId = (reqRow as { user_id?: string } | null)?.user_id;
    if (userId) {
      const updates: Record<string, unknown> = { id: userId };
      if (customerEmail) updates.email = customerEmail;
      await admin.from('profiles').upsert(updates, { onConflict: 'id' });
    }
  } catch {
    /* ignore */
  }

  if (!uploadSessionId) return;

  try {
    await finalizeRequestUploads(admin, { requestId, uploadSessionId });
  } catch (err) {
    console.error('[finalize-uploads] request media error', err);
  }

  try {
    await finalizeAvatarUploads(admin, { requestId, uploadSessionId });
  } catch (err) {
    console.error('[finalize-uploads] avatar error', err);
  }
}

/** Collect permanent storage paths already on the request (for repair scripts). */
export function collectPhotoPathsFromRequest(row: {
  photos?: string[] | null;
  notes?: unknown;
}): string[] {
  const fromPhotos = (row.photos || [])
    .map((p) => normalizeStoragePath(p))
    .filter((p): p is string => Boolean(p));

  const paths = new Set(fromPhotos);
  try {
    const notes =
      typeof row.notes === 'string'
        ? (JSON.parse(row.notes) as { media?: Record<string, string[]> })
        : (row.notes as { media?: Record<string, string[]> } | null);
    const media = notes?.media;
    if (media) {
      for (const key of ['outfits', 'roomTourPhotos', 'datingProfileScreenshots'] as const) {
        for (const ref of media[key] || []) {
          const path = normalizeStoragePath(ref);
          if (path) paths.add(path);
        }
      }
    }
  } catch {
    /* ignore */
  }

  return [...paths];
}
