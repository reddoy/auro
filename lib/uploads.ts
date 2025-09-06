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
    const { data: signed } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrl(path, 60 * 60);
    publicUrl = signed?.signedUrl || '';
  } catch {}
  try { opts.onProgress?.(100); } catch {}
  return { publicUrl, path };
}


