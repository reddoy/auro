import type { SupabaseClient } from '@supabase/supabase-js';
import {
  bucketForStoragePath,
  extractSupabaseStoragePath,
  normalizeStoragePath,
} from '@/lib/supabase-storage-path';

export async function signStoragePath(
  admin: SupabaseClient,
  pathOrUrl: string,
  expiresIn = 3600
): Promise<string | null> {
  const raw = (pathOrUrl || '').trim();
  if (!raw) return null;

  const extracted = /^https?:\/\//i.test(raw) ? extractSupabaseStoragePath(raw) : null;
  const path = extracted?.path ?? normalizeStoragePath(raw);
  if (!path) {
    if (/^https?:\/\//i.test(raw)) return raw;
    return null;
  }

  const bucket = extracted?.bucket ?? bucketForStoragePath(path);
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
