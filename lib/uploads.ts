// Use legacy API for readAsStringAsync on SDK 54+
import { readAsStringAsync } from 'expo-file-system/legacy';
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
  const base64 = await readAsStringAsync(fileUri, { encoding: 'base64' as any });
  try { opts.onProgress?.(60); } catch {}
  const fileBytes = base64ToUint8Array(base64);
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


function base64ToUint8Array(b64: string): Uint8Array {
  const atobGlobal: any = (globalThis as any).atob;
  const binary = typeof atobGlobal === 'function' ? atobGlobal(b64) : polyfillAtob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function polyfillAtob(input: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let str = String(input).replace(/\s+/g, '');
  let output = '';
  let i = 0;
  while (i < str.length) {
    const enc1 = chars.indexOf(str.charAt(i++));
    const enc2 = chars.indexOf(str.charAt(i++));
    const enc3 = chars.indexOf(str.charAt(i++));
    const enc4 = chars.indexOf(str.charAt(i++));
    const chr1 = (enc1 << 2) | (enc2 >> 4);
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const chr3 = ((enc3 & 3) << 6) | enc4;
    output += String.fromCharCode(chr1);
    if (enc3 !== 64 && enc3 !== -1) output += String.fromCharCode(chr2);
    if (enc4 !== 64 && enc4 !== -1) output += String.fromCharCode(chr3);
  }
  return output;
}

// Helpers to display media reliably by re-signing short-lived URLs to fresh signed URLs
function extractBucketAndPath(maybeUrlOrPath: string): { bucket: string; path: string } | null {
  if (!maybeUrlOrPath) return null;
  // Full signed/public URL → extract bucket and object path
  try {
    const url = new URL(maybeUrlOrPath);
    // Support both "/storage/v1/object/..." and legacy "/object/..." paths
    const withStorage = url.pathname.match(/\/(?:storage\/v1\/)?object\/(?:public|sign)\/([^/]+)\/(.+)$/);
    if (withStorage) {
      return { bucket: withStorage[1], path: decodeURIComponent(withStorage[2]) };
    }
    // Not a Supabase storage URL we recognize → don't transform
    return null;
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
  // Prefer GET-based server signing first to avoid CORS preflights
  try {
    const base =
      process.env.EXPO_PUBLIC_CREATOR_WEB_BASE ||
      (Constants.expoConfig?.extra as any)?.creatorWebBase ||
      (Constants.manifest2 as any)?.extra?.creatorWebBase ||
      '';
    if (base) {
      // GET-first
      const params = new URLSearchParams({ path: info.path, bucket: info.bucket, expiresIn: String(expiresIn) });
      const r2 = await fetch(`${base}/api/storage/signed-view?${params.toString()}`, { method: 'GET' });
      if (r2.ok) {
        const j2 = await r2.json();
        const u2 = (j2?.url || j2?.signedUrl) as string | undefined;
        if (u2) return u2;
      }
      // Fallback to POST signer
      try {
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
      } catch {}
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


