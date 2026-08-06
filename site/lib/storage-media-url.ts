import {
  extractSupabaseStoragePath,
  normalizeStoragePath,
  requestMediaBucketName,
} from '@/lib/supabase-storage-path';

const REQUEST_MEDIA_BUCKET = requestMediaBucketName();

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
    const extracted = extractSupabaseStoragePath(raw);
    if (extracted) {
      const fresh = await fetchSignedUrl(extracted.path, extracted.bucket);
      return fresh || raw;
    }
    return raw;
  }

  const path = normalizeStoragePath(raw);
  if (!path) return null;
  return fetchSignedUrl(path, bucket);
}
