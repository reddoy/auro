import { supabase } from './supabase';
import { createClient } from '@supabase/supabase-js';

const AVATAR_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET || 'avatars';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const storageClient = SUPABASE_SERVICE_ROLE_KEY && SUPABASE_URL
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : supabase;

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
  // If full http(s) URL and not a Supabase signed URL, return as-is
  const isHttp = /^https?:\/\//i.test(avatarUrlOrPath);
  const isSigned = avatarUrlOrPath.includes('/storage/v1/object/sign/') || avatarUrlOrPath.includes('/object/sign/');
  if (isHttp && !isSigned) return avatarUrlOrPath;

  const objectPath = isHttp ? extractBucketPath(avatarUrlOrPath) : extractBucketPath(String(avatarUrlOrPath));

  // Prefer server-side signing to avoid client auth issues
  try {
    const params = new URLSearchParams({ path: objectPath, bucket: AVATAR_BUCKET, expiresIn: String(3600) });
    const res = await fetch(`/api/storage/signed-view?${params.toString()}`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json?.url) return json.url as string;
    }
  } catch {}

  // Fallback to public URL (works if bucket is public)
  if (SUPABASE_URL) {
    return `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${AVATAR_BUCKET}/${objectPath}`;
  }
  return null;
}


