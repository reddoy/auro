import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';
import type { Profile, ProfilePreferences, UserReview, ReviewerPackage } from '@/types';

/**
 * Determines which reviewer onboarding step to start from based on existing profile data.
 * Returns the route and onboarding step preference to set.
 */
export function getReviewerOnboardingStartStep(profile: Profile | null | undefined): { route: string; step: string } {
  if (!profile) {
    // No profile, start from the beginning
    return { route: '/onboarding/reviewer/bio', step: 'reviewer_bio' };
  }

  // Check what fields are already filled to determine where to start
  const hasBio = !!(profile.bio && profile.bio.trim());
  const hasRate = !!(profile.hourly_rate && profile.hourly_rate > 0);
  const hasAvatar = !!(profile.avatar_url && profile.avatar_url.trim());
  const hasStripe = !!(profile.stripe_connect_account_id && profile.stripe_connect_account_id.trim());

  // Determine starting step based on what's missing
  if (!hasBio) {
    return { route: '/onboarding/reviewer/bio', step: 'reviewer_bio' };
  }
  if (!hasRate) {
    return { route: '/onboarding/reviewer/rate', step: 'reviewer_rate' };
  }
  if (!hasAvatar) {
    return { route: '/onboarding/reviewer/profile-picture', step: 'reviewer_profile_picture' };
  }
  if (!hasStripe) {
    return { route: '/onboarding/reviewer/stripe', step: 'reviewer_stripe' };
  }
  
  // All fields are filled, go to review-pending (final step)
  return { route: '/onboarding/reviewer/review-pending', step: 'reviewer_review_pending' };
}

/**
 * Resolves the destination route based on the user's onboarding status.
 * Returns the appropriate route to navigate to after sign-in.
 */
export function resolveOnboardingDestination(profile: Profile | null | undefined): string {
  // CRITICAL: If no profile, don't route to onboarding - route to main app
  // This prevents unauthenticated users from being sent to onboarding
  if (!profile) {
    return '/(tabs)/requests';
  }
  
  const preferences = profile?.preferences || {};
  // If user has completed initial onboarding, always go to main app
  // (This prevents redirecting users who manually toggle to reviewer from being
  //  sent back to onboarding on app restart)
  if (preferences?.onboarding_completed) {
    return '/(tabs)/requests';
  }

  const step = preferences?.onboarding_step || null;
  
  // Only redirect to reviewer onboarding if the user is actually a reviewer
  // and hasn't completed initial onboarding. This prevents redirecting users
  // who manually navigated to onboarding and then dismissed it.
  const isReviewerOnboardingStep = step && (
    step === 'reviewer_bio' ||
    step === 'reviewer_rate' ||
    step === 'reviewer_profile_picture' ||
    step === 'reviewer_stripe' ||
    step === 'reviewer_share_link' ||
    step === 'reviewer_review_pending'
  );
  
  // If it's a reviewer onboarding step but the user is not currently a reviewer,
  // don't redirect them (they may have dismissed the onboarding)
  if (isReviewerOnboardingStep && !profile.is_reviewer) {
    return '/(tabs)/requests';
  }
  
  switch (step) {
    case 'reviewer_bio':
      return '/onboarding/reviewer/bio';
    case 'reviewer_rate':
      return '/onboarding/reviewer/rate';
    case 'reviewer_profile_picture':
      return '/onboarding/reviewer/profile-picture';
    case 'reviewer_stripe':
      return '/onboarding/reviewer/stripe';
    case 'reviewer_share_link':
      // Skip share-link step in app - go directly to review-pending
      return '/onboarding/reviewer/review-pending';
    case 'reviewee_profile_picture':
      return '/onboarding/reviewee/profile-picture';
    case 'discover_reviewers':
      return '/onboarding/discover-reviewers';
    case 'role_selection':
      return '/onboarding/role-selection';
    case 'push_notifications':
    case 'push-notifications':
      return '/onboarding/push-notifications';
    case 'completed':
      return '/(tabs)/requests';
    default:
      // For new users with no step, go directly to push notifications
      // BUT only if we have a valid profile (user is authenticated)
      return '/onboarding/push-notifications';
  }
}

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
    .select('id, username, first_name, last_name, avatar_url, bio, is_reviewer, created_at, skills, links, preferences, hourly_rate, availability, reviews_given_count, reviews_received_count, rating_average, packages, pending_payout_balance_cents, awaiting_payout_balance_cents, completed_paid_total_cents, stripe_connect_account_id')
    .eq('id', user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    // Return minimal shape if row doesn't exist yet
    // Try to split user metadata name into first and last name
    const metadataName = user.user_metadata?.name || '';
    const nameParts = metadataName.trim().split(' ');
    return {
      id: user.id,
      username: user.user_metadata?.user_name || null,
      first_name: nameParts[0] || null,
      last_name: nameParts.slice(1).join(' ') || null,
      avatar_url: user.user_metadata?.avatar_url || null,
      bio: null,
      is_reviewer: null,
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
  // (first_name, last_name, username, and optionally avatar_url) from auth metadata so we
  // don't create a new row that wipes the displayed name to "User".
  let existing: any | null = null;
  try {
    const { data: existingRow } = await supabase
      .from('profiles')
      .select('id, username, first_name, last_name, avatar_url, preferences')
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
      // Split metadata name into first and last name
      const nameParts = (metadata.name || '').trim().split(' ');
      (seeded as any).first_name = nameParts[0] || null;
      (seeded as any).last_name = nameParts.slice(1).join(' ') || null;
    }
    // Only seed avatar_url from metadata if caller isn't explicitly updating it
    if (partial.avatar_url === undefined && metadata.avatar_url) {
      (seeded as any).avatar_url = metadata.avatar_url;
    }
  }

  const mergedPartial: Partial<Profile> = { ...partial };
  if (Object.prototype.hasOwnProperty.call(mergedPartial, 'preferences')) {
    const incoming = mergedPartial.preferences as any;
    if (incoming && typeof incoming === 'object') {
      const existingPrefs = (existing?.preferences || {}) as Record<string, any>;
      mergedPartial.preferences = { ...existingPrefs, ...incoming } as any;
    }
  }

  // Validate hourly_rate if being updated
  if (mergedPartial.hourly_rate !== undefined) {
    const MIN_RATE = 0; // No minimum rate
    const MAX_RATE = 30000; // Maximum $30,000 per review
    const rate = mergedPartial.hourly_rate;
    if (rate !== null && (typeof rate !== 'number' || isNaN(rate) || rate <= 0 || rate > MAX_RATE)) {
      throw new Error(`Hourly rate must be a positive number up to $${MAX_RATE.toLocaleString()}`);
    }
  }

  const update = { id: user.id, ...seeded, ...mergedPartial } as Partial<Profile> & { id: string };
  const { data, error } = await supabase
    .from('profiles')
    .upsert(update, { onConflict: 'id' })
    .select('id, username, first_name, last_name, avatar_url, bio, is_reviewer, created_at, skills, links, preferences, hourly_rate, availability, reviews_given_count, reviews_received_count, rating_average, packages, pending_payout_balance_cents, awaiting_payout_balance_cents, completed_paid_total_cents')
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function updateProfilePreferences(
  partial: Partial<ProfilePreferences> | null
): Promise<ProfilePreferences | null> {
  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult.user;
  if (!user) throw new Error('Not signed in');

  let existingRow: any | null = null;
  let existingPreferences: ProfilePreferences | null = null;
  try {
    const { data } = await supabase
      .from('profiles')
      .select('id, preferences')
      .eq('id', user.id)
      .maybeSingle();
    existingRow = data || null;
    existingPreferences = (existingRow?.preferences as ProfilePreferences) || null;
  } catch {}

  const merged =
    partial === null
      ? null
      : ({
          ...(existingPreferences || {}),
          ...(partial || {}),
        } as ProfilePreferences);

  // Check if profile exists - if not, we need to create it with seeded data
  const profileExists = !!existingRow;
  
  if (!profileExists) {
    // Profile doesn't exist - create it with seeded data from user metadata
    const metadata = user.user_metadata || {};
    const nameParts = (metadata.name || '').trim().split(' ');
    const seededProfile: any = {
      id: user.id,
      first_name: nameParts[0] || null,
      last_name: nameParts.slice(1).join(' ') || null,
      username: metadata.user_name || (user.email ? String(user.email).split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 24) : null),
      avatar_url: metadata.avatar_url || null,
      preferences: merged,
    };

    // Use upsert to create the profile if it doesn't exist
    const { data: upserted, error: upsertError } = await supabase
      .from('profiles')
      .upsert(seededProfile, { onConflict: 'id' })
      .select('preferences')
      .single();
    if (upsertError) throw upsertError;
    return upserted?.preferences as ProfilePreferences | null;
  }

  // Profile exists - use update
  const { data, error } = await supabase
    .from('profiles')
    .update({ preferences: merged })
    .eq('id', user.id)
    .select('preferences')
    .single();

  if (error) throw error;
  return (data?.preferences as ProfilePreferences) || null;
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
  // Normalize and sanitize accidental leading characters (e.g., '@')
  const cleaned = (pathOrUrl || '').trim().replace(/^@+/, '');
  let bucket = AVATAR_BUCKET;
  let objectPath = cleaned;

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
        return cleaned;
      }
    } else if (pathOrUrl.startsWith('avatars/')) {
      // Some rows may store "avatars/..." including bucket prefix
      objectPath = pathOrUrl.replace(/^avatars\//, '');
      bucket = 'avatars';
    }
  } catch {}
  
  // Prefer server-side signing when creator web base is configured
  // This is especially important for temp-uploads paths which may not be accessible with user's auth token
  const base =
    process.env.EXPO_PUBLIC_CREATOR_WEB_BASE ||
    (Constants.expoConfig?.extra as any)?.creatorWebBase ||
    (Constants.manifest2 as any)?.extra?.creatorWebBase ||
    '';
  
  if (base) {
    try {
      // Server-side endpoint handles directory resolution and signing with service role
      const params = new URLSearchParams({ path: objectPath, bucket, expiresIn: String(expiresInSeconds) });
      const endpoint = `${base}/api/storage/signed-view?${params.toString()}`;
      const res = await fetch(endpoint, { method: 'GET' });
      if (res.ok) {
        const json = await res.json();
        const url = (json?.url || json?.signedUrl) as string | undefined;
        if (url) {
          return url;
        } else {
          console.warn('[getSignedAvatarUrl] Server returned OK but no URL in response:', json);
        }
      } else {
        const errorText = await res.text().catch(() => 'Unknown error');
        console.error('[getSignedAvatarUrl] Server-side signing failed:', res.status, errorText);
        // If server returns 500, it likely means SUPABASE_SERVICE_ROLE_KEY is missing or invalid
        if (res.status === 500) {
          console.error('[getSignedAvatarUrl] ⚠️ Server error likely indicates missing/invalid SUPABASE_SERVICE_ROLE_KEY environment variable');
        }
      }
    } catch (err) {
      console.error('[getSignedAvatarUrl] Server-side signing error:', err);
    }
  }

  // If the path ends with a slash, it's a directory - we need to find the actual file
  // Only do this if server-side signing failed or isn't available
  if (objectPath.endsWith('/')) {
    try {
      const { data: files, error } = await supabase.storage.from(bucket).list(objectPath, { limit: 1, sortBy: { column: 'created_at', order: 'desc' } });
      if (!error && files && files.length > 0) {
        // Use the first file found in the directory
        objectPath = objectPath + files[0].name;
      } else {
        // If client-side list fails, try server-side again with the directory path
        // (server-side should handle directory resolution)
        if (base && error) {
          try {
            const params = new URLSearchParams({ path: objectPath, bucket, expiresIn: String(expiresInSeconds) });
            const res = await fetch(`${base}/api/storage/signed-view?${params.toString()}`, { method: 'GET' });
            if (res.ok) {
              const json = await res.json();
              const url = (json?.url || json?.signedUrl) as string | undefined;
              if (url) return url;
            }
          } catch {}
        }
        return null;
      }
    } catch (err) {
      console.error('[getSignedAvatarUrl] Error listing directory:', err);
      return null;
    }
  }

  try {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(objectPath, expiresInSeconds);
    if (error) {
      console.error('[getSignedAvatarUrl] Client-side signing error:', error);
      throw error;
    }
    if (data?.signedUrl) {
      return data.signedUrl;
    }
    return null;
  } catch (err) {
    console.error('[getSignedAvatarUrl] Client-side signing exception:', err);
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
      .select('id, author_id, subject_id, rating, comment, created_at, archived_by_author, archived_by_subject, author:author_id(id, username, first_name, last_name, avatar_url), subject:subject_id(id, username, first_name, last_name, avatar_url)')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;
    items = (data as any[] as UserReview[]) || [];
  } catch {
    const { data, error } = await supabase
      .from('reviews')
      .select('id, author_id, subject_id, rating, comment, created_at, author:author_id(id, username, first_name, last_name, avatar_url), subject:subject_id(id, username, first_name, last_name, avatar_url)')
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
      .select('id, author_id, subject_id, rating, comment, created_at, archived_by_author, archived_by_subject, author:author_id(id, username, first_name, last_name, avatar_url), subject:subject_id(id, username, first_name, last_name, avatar_url)')
      .eq('subject_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;
    items = (data as any[] as UserReview[]) || [];
  } catch {
    const { data, error } = await supabase
      .from('reviews')
      .select('id, author_id, subject_id, rating, comment, created_at, author:author_id(id, username, first_name, last_name, avatar_url), subject:subject_id(id, username, first_name, last_name, avatar_url)')
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


