import type { SupabaseClient } from '@supabase/supabase-js';

export async function signStoragePath(
  admin: SupabaseClient,
  pathOrUrl: string,
  expiresIn = 3600
): Promise<string | null> {
  const raw = (pathOrUrl || '').trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;

  const requestMediaBucket =
    process.env.NEXT_PUBLIC_SUPABASE_REQUEST_MEDIA_BUCKET || 'request-media';
  const avatarBucket = process.env.NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET || 'avatars';
  const path = raw.replace(/^\/+/, '');
  const bucket =
    path.includes('/avatar/') || path.includes('/selfie/') ? avatarBucket : requestMediaBucket;

  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function signStoragePaths(
  admin: SupabaseClient,
  paths: string[],
  expiresIn = 3600
): Promise<string[]> {
  const urls: string[] = [];
  for (const p of paths) {
    const url = await signStoragePath(admin, p, expiresIn);
    if (url) urls.push(url);
  }
  return urls;
}
