/**
 * Shared helpers for Supabase Storage object paths vs signed/public URLs.
 */

export function extractSupabaseStoragePath(
  input: string
): { bucket: string; path: string } | null {
  const re = /\/(?:storage\/v1\/)?object\/(?:sign|public|authenticated)\/([^/?]+)\/([^?]+)/;
  const withoutQuery = input.split('?')[0] || input;
  const m = withoutQuery.match(re);
  if (!m?.[1] || !m[2]) return null;
  return { bucket: decodeURIComponent(m[1]), path: decodeURIComponent(m[2]) };
}

/** Normalize a stored photo reference to a bare storage object path, if possible. */
export function normalizeStoragePath(input: string): string | null {
  const raw = (input || '').trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) {
    return extractSupabaseStoragePath(raw)?.path ?? null;
  }
  return raw.replace(/^\/+/, '');
}

export function remapTempUploadPath(
  ref: string,
  uploadSessionId: string,
  targetBase: string
): string {
  const path = normalizeStoragePath(ref);
  if (!path) return ref;
  const tempPrefix = `temp-uploads/${uploadSessionId}`;
  if (path === tempPrefix || path.startsWith(`${tempPrefix}/`)) {
    const suffix = path.slice(tempPrefix.length).replace(/^\//, '');
    return suffix ? `${targetBase}/${suffix}` : targetBase;
  }
  return path;
}

export function requestMediaBucketName(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_REQUEST_MEDIA_BUCKET || 'request-media';
}

export function avatarBucketName(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET || 'avatars';
}

export function bucketForStoragePath(path: string): string {
  const normalized = path.replace(/^\/+/, '');
  if (normalized.includes('/avatar/') || normalized.includes('/selfie/')) {
    return avatarBucketName();
  }
  return requestMediaBucketName();
}
