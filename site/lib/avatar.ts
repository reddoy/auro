import { supabase } from './supabase';

const AVATAR_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET || 'avatars';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

function extractBucketPath(input: string): string {
  let path = input.replace(/^\/+/, '');
  // If it contains /object/(public|sign)/<bucket>/path → extract path
  const patterns = [
    new RegExp(`/object/(?:public|sign)/${AVATAR_BUCKET}/([^?]+)`),
    new RegExp(`/storage/v1/object/(?:public|sign)/${AVATAR_BUCKET}/([^?]+)`),
  ];
  for (const re of patterns) {
    const m = path.match(re);
    if (m && m[1]) return decodeURIComponent(m[1]);
  }
  // Strip leading bucket name if present
  if (path.startsWith(`${AVATAR_BUCKET}/`)) {
    return path.slice(AVATAR_BUCKET.length + 1);
  }
  return path;
}

export async function getDisplayAvatarUrl(avatarUrlOrPath?: string | null): Promise<string | null> {
  if (!avatarUrlOrPath) return null;
  if (/^https?:\/\//i.test(avatarUrlOrPath)) {
    // If it's a signed/public Supabase URL, normalize to object path and re-sign to avoid expiry issues
    if (avatarUrlOrPath.includes('/storage/v1/object/sign/') || avatarUrlOrPath.includes('/object/sign/')) {
      const objectPath = extractBucketPath(avatarUrlOrPath);
      try {
        const { data, error } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(objectPath, 3600);
        if (!error && data?.signedUrl) return data.signedUrl;
      } catch {}
      if (SUPABASE_URL) {
        return `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${AVATAR_BUCKET}/${objectPath}`;
      }
    }
    // Otherwise return as-is
    return avatarUrlOrPath;
  }
  const objectPath = extractBucketPath(avatarUrlOrPath);
  // Try signed URL first
  try {
    const { data, error } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(objectPath, 3600);
    if (!error && data?.signedUrl) return data.signedUrl;
  } catch {}
  // Fallback to public URL (works if bucket is public)
  if (SUPABASE_URL) {
    return `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${AVATAR_BUCKET}/${objectPath}`;
  }
  return null;
}


