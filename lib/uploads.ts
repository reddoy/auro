import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';
import { supabase } from './supabase';

function getFileExtensionFromUri(uri: string): string | null {
  const match = uri.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
  return match ? match[1].toLowerCase() : null;
}

function buildContentTypeFromExt(ext: string | null): string | undefined {
  if (!ext) return undefined;
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'heic':
    case 'heif':
      return 'image/heic';
    case 'mp4':
      return 'video/mp4';
    case 'mov':
      return 'video/quicktime';
    case 'webm':
      return 'video/webm';
    default:
      return 'application/octet-stream';
  }
}

export type RequestMediaCategory = 'selfie' | 'outfit' | 'roomTour' | 'roomPhoto' | 'datingProfile' | 'other';

export async function uploadRequestMedia(
  fileUri: string,
  opts: { category?: RequestMediaCategory; onProgress?: (percent: number) => void } = {}
): Promise<{ publicUrl: string; path: string }> {
  const MEDIA_BUCKET =
    process.env.EXPO_PUBLIC_SUPABASE_REQUEST_MEDIA_BUCKET ||
    (Constants.expoConfig?.extra as any)?.supabaseRequestMediaBucket ||
    (Constants.manifest2 as any)?.extra?.supabaseRequestMediaBucket ||
    'request-media';

  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult.user;
  if (!user) throw new Error('Not signed in');

  const ext = getFileExtensionFromUri(fileUri) || 'jpg';
  const safeCategory = opts.category || 'other';
  const path = `${user.id}/requests/${Date.now()}_${safeCategory}.${ext}`;

  try { opts.onProgress?.(10); } catch {}
  const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
  try { opts.onProgress?.(60); } catch {}
  const fileBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const contentType = buildContentTypeFromExt(ext);

  const { error: uploadError } = await supabase
    .storage
    .from(MEDIA_BUCKET)
    .upload(path, fileBytes as any, { contentType, upsert: true });
  if (uploadError) throw uploadError;
  try { opts.onProgress?.(90); } catch {}

  let publicUrl = '';
  try {
    const { data: signed } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrl(path, 60 * 60 * 24 * 30);
    publicUrl = signed?.signedUrl || '';
  } catch {}
  try { opts.onProgress?.(100); } catch {}
  return { publicUrl, path };
}


// Helpers to display media reliably by re-signing short-lived URLs to fresh signed URLs
function extractBucketAndPath(maybeUrlOrPath: string): { bucket: string; path: string } | null {
  if (!maybeUrlOrPath) return null;
  // Full signed/public URL → extract bucket and object path
  try {
    const url = new URL(maybeUrlOrPath);
    const m = url.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/);
    if (m) {
      return { bucket: m[1], path: decodeURIComponent(m[2]) };
    }
  } catch {}
  // Bare object path → assume request-media bucket
  const MEDIA_BUCKET =
    process.env.EXPO_PUBLIC_SUPABASE_REQUEST_MEDIA_BUCKET ||
    (Constants.expoConfig?.extra as any)?.supabaseRequestMediaBucket ||
    (Constants.manifest2 as any)?.extra?.supabaseRequestMediaBucket ||
    'request-media';
  return { bucket: MEDIA_BUCKET, path: maybeUrlOrPath };
}

export async function getSignedRequestMediaUrl(maybeUrlOrPath: string, expiresIn: number = 60 * 60 * 24 * 30): Promise<string> {
  const info = extractBucketAndPath(maybeUrlOrPath);
  if (!info) return maybeUrlOrPath;
  // Prefer server-side signing to avoid client auth/policy issues
  try {
    const base =
      process.env.EXPO_PUBLIC_CREATOR_WEB_BASE ||
      (Constants.expoConfig?.extra as any)?.creatorWebBase ||
      (Constants.manifest2 as any)?.extra?.creatorWebBase ||
      '';
    if (base) {
      const resp = await fetch(`${base}/api/storage/signed-upload`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'sign-view', path: info.path, expiresIn }),
      });
      if (resp.ok) {
        const json = await resp.json();
        const url = json?.signedUrl as string | undefined;
        if (url) return url;
      }
    }
  } catch {}
  try {
    const { data, error } = await supabase.storage.from(info.bucket).createSignedUrl(info.path, expiresIn);
    if (error) throw error;
    return data?.signedUrl || maybeUrlOrPath;
  } catch {
    return maybeUrlOrPath;
  }
}

export async function signRequestMediaUrls(urls: string[] | undefined | null, expiresIn: number = 60 * 60 * 24 * 30): Promise<string[]> {
  if (!Array.isArray(urls) || urls.length === 0) return [];
  const result = await Promise.all(urls.map((u) => getSignedRequestMediaUrl(u, expiresIn)));
  return result.filter(Boolean) as string[];
}


