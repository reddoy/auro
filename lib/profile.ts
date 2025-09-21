import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';
import type { Profile, UserReview, ReviewerPackage } from '@/types';

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
    default:
      return 'application/octet-stream';
  }
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult.user;
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, bio, is_reviewer, created_at, skills, links, preferences, hourly_rate, availability, reviews_given_count, reviews_received_count, rating_average, packages')
    .eq('id', user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    // Return minimal shape if row doesn't exist yet
    return {
      id: user.id,
      username: user.user_metadata?.user_name || null,
      full_name: user.user_metadata?.name || null,
      avatar_url: user.user_metadata?.avatar_url || null,
      bio: null,
      is_reviewer: false,
      created_at: undefined,
      skills: null,
      links: null,
      preferences: null,
      hourly_rate: null,
      availability: null,
      reviews_given_count: null,
      reviews_received_count: null,
      rating_average: null,
      packages: null as any,
    } as Profile;
  }
  return data as Profile;
}

export async function updateProfile(partial: Partial<Profile>): Promise<Profile> {
  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult.user;
  if (!user) throw new Error('Not signed in');
  // If the profile row doesn't exist yet, we should seed key identity fields
  // (full_name, username, and optionally avatar_url) from auth metadata so we
  // don't create a new row that wipes the displayed name to "User".
  let existing: any | null = null;
  try {
    const { data: existingRow } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle();
    existing = existingRow || null;
  } catch {}

  const seeded: Partial<Profile> = {};
  if (!existing) {
    const metadata = user.user_metadata || {};
    if (metadata.user_name) {
      (seeded as any).username = metadata.user_name;
    }
    if (metadata.name) {
      (seeded as any).full_name = metadata.name;
    }
    // Only seed avatar_url from metadata if caller isn't explicitly updating it
    if (partial.avatar_url === undefined && metadata.avatar_url) {
      (seeded as any).avatar_url = metadata.avatar_url;
    }
  }

  const update = { id: user.id, ...seeded, ...partial } as Partial<Profile> & { id: string };
  const { data, error } = await supabase
    .from('profiles')
    .upsert(update, { onConflict: 'id' })
    .select('id, username, full_name, avatar_url, bio, is_reviewer, created_at, skills, links, preferences, hourly_rate, availability, reviews_given_count, reviews_received_count, rating_average, packages')
    .single();
  if (error) throw error;
  return data as Profile;
}

function decodeBase64ToBytes(base64: string): Uint8Array {
  // Strip potential data URL prefix
  const b64 = (base64 || '').split(',').pop() || '';
  if (typeof (globalThis as any).atob === 'function') {
    const binary = (globalThis as any).atob(b64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let str = b64.replace(/[^A-Za-z0-9+/=]/g, '');
  let outputLength = str.length * 0.75;
  if (str.endsWith('==')) outputLength -= 2;
  else if (str.endsWith('=')) outputLength -= 1;
  const bytes = new Uint8Array(outputLength | 0);
  let p = 0;
  for (let i = 0; i < str.length; ) {
    const enc1 = chars.indexOf(str.charAt(i++));
    const enc2 = chars.indexOf(str.charAt(i++));
    const enc3 = chars.indexOf(str.charAt(i++));
    const enc4 = chars.indexOf(str.charAt(i++));
    const chr1 = (enc1 << 2) | (enc2 >> 4);
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const chr3 = ((enc3 & 3) << 6) | enc4;
    bytes[p++] = chr1;
    if (enc3 !== 64) bytes[p++] = chr2;
    if (enc4 !== 64) bytes[p++] = chr3;
  }
  return bytes;
}

export async function uploadAvatar(fileUri: string): Promise<{ publicUrl: string; path: string }> {
  const AVATAR_BUCKET =
    process.env.EXPO_PUBLIC_SUPABASE_AVATAR_BUCKET ||
    (Constants.expoConfig?.extra as any)?.supabaseAvatarBucket ||
    (Constants.manifest2 as any)?.extra?.supabaseAvatarBucket ||
    'avatars';
  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult.user;
  if (!user) throw new Error('Not signed in');
  const ext = getFileExtensionFromUri(fileUri) || 'jpg';
  const path = `${user.id}/${Date.now()}.${ext}`;

  // Read file as base64 and upload raw bytes (robust across platforms)
  const encoding: any = (FileSystem as any).EncodingType?.Base64 || 'base64';
  const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding } as any);
  const fileBytes = decodeBase64ToBytes(base64);
  const contentType = buildContentTypeFromExt(ext);

  const { error: uploadError } = await supabase
    .storage
    .from(AVATAR_BUCKET)
    .upload(path, fileBytes as any, { contentType, upsert: true });
  if (uploadError) throw uploadError;

  // For private buckets, generate a short-lived signed URL for immediate display
  let publicUrl = '';
  try {
    const { data: signed } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(path, 60 * 60 * 24 * 30);
    publicUrl = signed?.signedUrl || '';
  } catch {}
  return { publicUrl, path };
}

export async function removeAvatar(pathOrUrl: string): Promise<void> {
  const AVATAR_BUCKET =
    process.env.EXPO_PUBLIC_SUPABASE_AVATAR_BUCKET ||
    (Constants.expoConfig?.extra as any)?.supabaseAvatarBucket ||
    (Constants.manifest2 as any)?.extra?.supabaseAvatarBucket ||
    'avatars';
  if (!pathOrUrl) return;
  let path = pathOrUrl;
  try {
    // Handle both public and signed URL formats
    const patterns = [
      new RegExp(`/object/(?:public|sign)/${AVATAR_BUCKET}/([^?]+)`),
      new RegExp(`/storage/v1/object/(?:public|sign)/${AVATAR_BUCKET}/([^?]+)`),
    ];
    for (const re of patterns) {
      const m = pathOrUrl.match(re);
      if (m && m[1]) {
        path = decodeURIComponent(m[1]);
        break;
      }
    }
  } catch {}
  const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([path]);
  if (error) throw error;
}

export async function getSignedAvatarUrl(pathOrUrl: string, expiresInSeconds: number = 60 * 60 * 24 * 30): Promise<string | null> {
  const AVATAR_BUCKET =
    process.env.EXPO_PUBLIC_SUPABASE_AVATAR_BUCKET ||
    (Constants.expoConfig?.extra as any)?.supabaseAvatarBucket ||
    (Constants.manifest2 as any)?.extra?.supabaseAvatarBucket ||
    'avatars';
  if (!pathOrUrl) return null;
  let bucket = AVATAR_BUCKET;
  let objectPath = pathOrUrl;

  // If it looks like a full Supabase storage URL, extract bucket and object path and re-sign
  try {
    if (/^https?:\/\//i.test(pathOrUrl)) {
      const url = new URL(pathOrUrl);
      // Support both "/storage/v1/object/..." and legacy "/object/..." paths
      const withStorage = url.pathname.match(/\/(?:storage\/v1\/)?object\/(?:public|sign)\/([^/]+)\/(.+)$/);
      if (withStorage) {
        bucket = withStorage[1];
        objectPath = decodeURIComponent(withStorage[2]);
      } else {
        // Not a Supabase storage URL → return as-is
        return pathOrUrl;
      }
    } else if (pathOrUrl.startsWith('avatars/')) {
      // Some rows may store "avatars/..." including bucket prefix
      objectPath = pathOrUrl.replace(/^avatars\//, '');
      bucket = 'avatars';
    }
  } catch {}

  // Prefer server-side signing when creator web base is configured
  try {
    const base =
      process.env.EXPO_PUBLIC_CREATOR_WEB_BASE ||
      (Constants.expoConfig?.extra as any)?.creatorWebBase ||
      (Constants.manifest2 as any)?.extra?.creatorWebBase ||
      '';
    if (base) {
      const params = new URLSearchParams({ path: objectPath, bucket, expiresIn: String(expiresInSeconds) });
      const res = await fetch(`${base}/api/storage/signed-view?${params.toString()}`, { method: 'GET' });
      if (res.ok) {
        const json = await res.json();
        const url = (json?.url || json?.signedUrl) as string | undefined;
        if (url) return url;
      }
    }
  } catch {}

  try {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(objectPath, expiresInSeconds);
    if (error) throw error;
    return data?.signedUrl || null;
  } catch {
    return null;
  }
}

export async function getReviewsGiven(userId: string, opts: { page?: number; pageSize?: number; showArchived?: boolean } = {}): Promise<{ items: UserReview[]; nextPage: number | null }> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? 10));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  // Try to include archived flags if they exist; if not, fall back gracefully
  let items: UserReview[] = [];
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('id, author_id, subject_id, rating, comment, created_at, archived_by_author, archived_by_subject, author:author_id(id, username, full_name, avatar_url), subject:subject_id(id, username, full_name, avatar_url)')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;
    items = (data as any[] as UserReview[]) || [];
  } catch {
    const { data, error } = await supabase
      .from('reviews')
      .select('id, author_id, subject_id, rating, comment, created_at, author:author_id(id, username, full_name, avatar_url), subject:subject_id(id, username, full_name, avatar_url)')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;
    items = (data as any[] as UserReview[]) || [];
  }
  if (!opts.showArchived) {
    items = items.filter((it) => !it.archived_by_author);
  }
  const hasMore = items.length === pageSize;
  return { items, nextPage: hasMore ? page + 1 : null };
}

export async function getReviewsReceived(userId: string, opts: { page?: number; pageSize?: number; showArchived?: boolean } = {}): Promise<{ items: UserReview[]; nextPage: number | null }> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? 10));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let items: UserReview[] = [];
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('id, author_id, subject_id, rating, comment, created_at, archived_by_author, archived_by_subject, author:author_id(id, username, full_name, avatar_url), subject:subject_id(id, username, full_name, avatar_url)')
      .eq('subject_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;
    items = (data as any[] as UserReview[]) || [];
  } catch {
    const { data, error } = await supabase
      .from('reviews')
      .select('id, author_id, subject_id, rating, comment, created_at, author:author_id(id, username, full_name, avatar_url), subject:subject_id(id, username, full_name, avatar_url)')
      .eq('subject_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;
    items = (data as any[] as UserReview[]) || [];
  }
  if (!opts.showArchived) {
    items = items.filter((it) => !it.archived_by_subject);
  }
  const hasMore = items.length === pageSize;
  return { items, nextPage: hasMore ? page + 1 : null };
}

export async function archiveReviewForCurrentUser(reviewId: string, archived: boolean): Promise<void> {
  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult.user;
  if (!user) throw new Error('Not signed in');
  let updatedCount = 0;
  try {
    const { count, error } = await supabase
      .from('reviews')
      .update({ archived_by_author: archived as any })
      .eq('id', reviewId)
      .eq('author_id', user.id)
      .select('id', { count: 'exact', head: true });
    if (!error) updatedCount += count || 0;
  } catch {}
  try {
    const { count, error } = await supabase
      .from('reviews')
      .update({ archived_by_subject: archived as any })
      .eq('id', reviewId)
      .eq('subject_id', user.id)
      .select('id', { count: 'exact', head: true });
    if (!error) updatedCount += count || 0;
  } catch {}
  if (!updatedCount) {
    throw new Error('Not permitted to archive this review or field missing');
  }
}

export async function getReviewStats(userId: string): Promise<{ given: number; received: number; avgReceivedRating: number }> {
  const [{ count: givenCount }, { count: receivedCount }] = await Promise.all([
    supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('author_id', userId),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('subject_id', userId),
  ]);

  let avg = 0;
  const { data: ratings, error } = await supabase
    .from('reviews')
    .select('rating')
    .eq('subject_id', userId)
    .limit(100);
  if (!error && ratings && ratings.length) {
    const nums = ratings.map((r: any) => Number(r.rating) || 0).filter((n: number) => !isNaN(n));
    if (nums.length) avg = nums.reduce((a: number, b: number) => a + b, 0) / nums.length;
  }
  return { given: givenCount || 0, received: receivedCount || 0, avgReceivedRating: Number(avg.toFixed(2)) };
}


