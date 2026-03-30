/** Resolve a storage object path or URL for display (request-media, etc.). */
export async function getSignedStorageUrl(
  pathOrUrl: string,
  bucket: string = 'request-media'
): Promise<string | null> {
  const raw = (pathOrUrl || '').trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const params = new URLSearchParams({
    path: raw.replace(/^\/+/, ''),
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
