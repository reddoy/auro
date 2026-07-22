const REQUEST_MEDIA_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_REQUEST_MEDIA_BUCKET || 'request-media';

/**
 * If the input is a Supabase Storage URL (signed / public / authenticated),
 * extract the bucket and object path so we can re-sign a fresh URL.
 * Returns null for non-Supabase-storage inputs (e.g. genuinely external URLs).
 */
function extractSupabaseStoragePath(
  input: string
): { bucket: string; path: string } | null {
  // Match .../storage/v1/object/(sign|public|authenticated)/<bucket>/<path>
  // (also tolerate the shorter /object/... form seen in some stored values).
  const re = /\/(?:storage\/v1\/)?object\/(?:sign|public|authenticated)\/([^/?]+)\/([^?]+)/;
  const withoutQuery = input.split('?')[0] || input;
  const m = withoutQuery.match(re);
  if (!m || !m[1] || !m[2]) return null;
  return { bucket: decodeURIComponent(m[1]), path: decodeURIComponent(m[2]) };
}

async function fetchSignedUrl(path: string, bucket: string): Promise<string | null> {
  const params = new URLSearchParams({
    path: path.replace(/^\/+/, ''),
    bucket,
    expiresIn: '3600',
  });
  try {
    const res = await fetch(`/api/storage/signed-view?${params.toString()}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.url as string) || null;
  } catch {
    return null;
  }
}

/** Resolve a storage object path or URL for display (request-media, etc.). */
export async function getSignedStorageUrl(
  pathOrUrl: string,
  bucket: string = REQUEST_MEDIA_BUCKET
): Promise<string | null> {
  const raw = (pathOrUrl || '').trim();
  if (!raw) return null;

  const isHttp = /^https?:\/\//i.test(raw);
  if (isHttp) {
    // Supabase Storage URLs (signed/public/authenticated) expire, so re-sign
    // from the underlying object path rather than trusting the stored URL.
    const extracted = extractSupabaseStoragePath(raw);
    if (extracted) {
      const fresh = await fetchSignedUrl(extracted.path, extracted.bucket);
      // Fall back to the original URL only if re-signing fails.
      return fresh || raw;
    }
    // Genuinely external URL (not Supabase storage) — use as-is.
    return raw;
  }

  // Bare object path — sign it directly.
  return fetchSignedUrl(raw, bucket);
}
