import { REVIEW_DELIVER_WINDOW_MS } from '@/lib/request-deadlines';
import { supabase } from '@/lib/supabase';
import type { DbInfluencerSummary, DbRequestSummary, DbUserProfile, DbReviewerSummary } from '@/types';

/** Same-origin in the browser; env on server/cron. */
function getSiteBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'https://auro-pearl.vercel.app';
}

function sb() {
  if (!supabase) throw new Error('Supabase client is not configured');
  return supabase;
}

type ProfileBootstrapUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

async function ensureProfileRowForUser(user: ProfileBootstrapUser): Promise<boolean> {
  if (!user?.id) return false;
  try {
    const metadata = user.user_metadata || {};
    const fullName =
      (typeof metadata.full_name === 'string' && metadata.full_name) ||
      (typeof metadata.name === 'string' && metadata.name) ||
      undefined;
    const avatarUrl =
      (typeof metadata.avatar_url === 'string' && metadata.avatar_url) ||
      (typeof metadata.picture === 'string' && metadata.picture) ||
      undefined;

    const res = await fetch(`${getSiteBaseUrl()}/api/auth/ensure-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        email: user.email ?? undefined,
        fullName,
        avatarUrl,
      }),
    });
    if (!res.ok) return false;

    const { data: profile } = await sb().from('profiles').select('id').eq('id', user.id).maybeSingle();
    return !!profile;
  } catch (error) {
    console.warn('[ensureProfileRowForUser] Failed to bootstrap profile:', error);
    return false;
  }
}

/** Thrown when a request aborts on its client-side timeout (vs. a server error). */
export class RequestTimeoutError extends Error {
  constructor(message = 'Request timed out') {
    super(message);
    this.name = 'RequestTimeoutError';
  }
}

async function authenticatedJsonFetch<T>(
  path: string,
  body: unknown,
  opts: { timeoutMs?: number } = {}
): Promise<T> {
  const { data: sessionData } = await sb().auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    throw new Error('Not signed in');
  }
  const controller = opts.timeoutMs ? new AbortController() : null;
  const timer =
    controller && opts.timeoutMs
      ? setTimeout(() => controller.abort(), opts.timeoutMs)
      : null;
  let res: Response;
  try {
    res = await fetch(`${getSiteBaseUrl()}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: controller?.signal,
    });
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new RequestTimeoutError();
    }
    throw e;
  } finally {
    if (timer) clearTimeout(timer);
  }
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error((json as { error?: string }).error || `Request failed (${res.status})`);
  }
  return json as T;
}

function mapRequestRow(row: any): DbRequestSummary {
  return {
    id: row.id,
    influencerId: row.influencer_id ?? row.influencerId,
    userId: row.user_id ?? row.userId,
    createdAt: row.created_at ?? row.createdAt,
    created_at: row.created_at ?? row.createdAt,
    status: row.status,
    photos: row.photos || [],
    notes: row.notes ?? null,
    review: row.review ?? null,
    consent_social: row.consent_social ?? (row.notes?.consent?.shareOnSocial ?? undefined),
    archived_at: row.archived_at ?? (row.archived_by_influencer ? (row.created_at || new Date().toISOString()) : null),
    amount_cents: row.amount_cents ?? null,
    application_fee_cents: row.application_fee_cents ?? null,
    stripe_fee_cents: row.stripe_fee_cents ?? null,
    net_amount_cents: row.net_amount_cents ?? null,
    auro_fee_bps: row.auro_fee_bps ?? null,
    payment_distributed: row.payment_distributed ?? null,
    payment_distributed_at: row.payment_distributed_at ?? null,
    stripe_transfer_id: row.stripe_transfer_id ?? null,
    reviewer_amount_cents: row.reviewer_amount_cents ?? null,
    payment_distribution_error: row.payment_distribution_error ?? null,
    completed_at: row.completed_at ?? row.completedAt ?? null,
    payment_status: row.payment_status ?? row.paymentStatus ?? null,
    requester_name:
      row.requester_name ??
      row.requester?.full_name ??
      row.requester?.fullName ??
      row.user?.full_name ??
      row.user?.fullName ??
      null,
    requester_username:
      row.requester_username ??
      row.requester?.username ??
      row.user?.username ??
      null,
    review_viewed_at: row.review_viewed_at ?? row.reviewViewedAt ?? null,
  } as DbRequestSummary;
}

export async function getInfluencers(): Promise<DbInfluencerSummary[]> {
  const { data, error } = await sb()
    .from('influencers')
    .select(
      'id,name,username,verified,profileImage,specialties,pricePerReview,rating,followerCount'
    )
    .order('rating', { ascending: false });
  if (error) throw error;
  return (data as DbInfluencerSummary[]) ?? [];
}

export async function getInfluencerById(id: string): Promise<DbInfluencerSummary | null> {
  const { data, error } = await sb()
    .from('influencers')
    .select(
      'id,name,username,verified,profileImage,specialties,pricePerReview,rating,followerCount'
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as DbInfluencerSummary) ?? null;
}

export async function getRequestsByUser(userId: string): Promise<DbRequestSummary[]> {
  const { data, error } = await sb()
    .from('requests')
    .select('id,influencer_id,created_at,status,photos,review,user_id,notes,consent_social,archived_by_influencer,amount_cents,application_fee_cents,stripe_fee_cents,net_amount_cents,auro_fee_bps,payment_distributed,payment_distributed_at,stripe_transfer_id,reviewer_amount_cents,payment_distribution_error,payment_status')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data as any[]) || []).map(mapRequestRow);
}

export async function getRequestById(id: string): Promise<DbRequestSummary | null> {
  const { data, error } = await sb()
    .from('requests')
    .select('id,influencer_id,created_at,status,photos,review,user_id,notes,consent_social,archived_by_influencer,amount_cents,application_fee_cents,stripe_fee_cents,net_amount_cents,auro_fee_bps,payment_distributed,payment_distributed_at,stripe_transfer_id,reviewer_amount_cents,payment_distribution_error')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRequestRow(data) : null;
}

export async function createRequest(params: {
  userId: string;
  influencerId: string;
  photos: string[];
  notes?: string;
  consent_social?: boolean;
}): Promise<DbRequestSummary> {
  const { data, error } = await sb()
    .from('requests')
    .insert([
      {
        user_id: params.userId,
        influencer_id: params.influencerId,
        photos: params.photos,
        notes: params.notes ?? null,
        // Avoid including consent_social if column is missing in some environments
        consent_social: params.consent_social ?? false,
        status: 'pending',
      },
    ])
    .select('id,influencer_id,created_at,status,photos,review,user_id,notes,consent_social,archived_by_influencer,amount_cents,application_fee_cents,stripe_fee_cents,net_amount_cents,auro_fee_bps')
    .single();
  if (error) throw error;
  return mapRequestRow(data);
}

export async function getUserProfile(): Promise<DbUserProfile | null> {
  const { data: sessionData } = await sb().auth.getUser();
  const user = sessionData.user;
  if (!user) return null;
  let { data: profile, error } = await sb()
    .from('profiles')
    .select('id, username, first_name, last_name, avatar_url, bio, is_reviewer')
    .eq('id', user.id)
    .maybeSingle();
  if (error) throw error;
  if (!profile) {
    // OAuth/profile creation can be eventually consistent. Try a server-side bootstrap once
    // before treating the session as orphaned.
    const repaired = await ensureProfileRowForUser(user as ProfileBootstrapUser);
    if (!repaired) return null;
    const retry = await sb()
      .from('profiles')
      .select('id, username, first_name, last_name, avatar_url, bio, is_reviewer')
      .eq('id', user.id)
      .maybeSingle();
    if (retry.error) throw retry.error;
    profile = retry.data;
    if (!profile) return null;
  }
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || null;
  return {
    id: profile.id,
    email: user.email ?? undefined,
    name: fullName || profile.username || undefined,
    username: profile.username ?? null,
    bio: profile.bio ?? null,
    avatarUrl: profile.avatar_url ?? null,
    // @ts-ignore - optional flag for app logic
    is_reviewer: (profile as any)?.is_reviewer ?? undefined,
  } as DbUserProfile;
}

/**
 * If there is a real (non-anon) session but no profiles row, sign out.
 * Returns true when the session was cleared (orphaned auth after profile delete).
 */
export async function signOutIfProfileRowMissing(): Promise<boolean> {
  const { data: sessionData } = await sb().auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return false;
  if ((user as { app_metadata?: { provider?: string } }).app_metadata?.provider === 'anon') {
    return false;
  }

  const { data: profile, error } = await sb()
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();
  if (error) {
    console.warn('[signOutIfProfileRowMissing]', error);
    return false;
  }
  if (!profile) {
    const repaired = await ensureProfileRowForUser(user as ProfileBootstrapUser);
    if (repaired) return false;
    await sb().auth.signOut();
    return true;
  }
  return false;
}

// Ensure a profile row exists for the current user. Safe to call after login.
// Returns true if a new profile was created, false if it already existed.
// This function is idempotent - safe to call multiple times.
export async function ensureProfileForCurrentUser(): Promise<boolean> {
  const { data: sessionData } = await sb().auth.getUser();
  const user = sessionData.user;
  if (!user) {
    console.log('[ensureProfileForCurrentUser] No user found');
    return false;
  }
  
  // Check if profile already exists first to avoid unnecessary upsert
  try {
    const { data: existing } = await sb()
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();
    if (existing) {
      console.log('[ensureProfileForCurrentUser] Profile already exists for user:', user.id);
      return false; // Profile already existed
    }
  } catch (checkError) {
    console.warn('[ensureProfileForCurrentUser] Error checking existing profile:', checkError);
    // Continue to try creating it anyway
  }
  
  // Split name into first_name and last_name
  const metadataName = user.user_metadata?.name || '';
  const nameParts = metadataName.trim().split(' ');
  const firstName = nameParts[0] || null;
  const lastName = nameParts.slice(1).join(' ') || null;
  
  // Generate unique username if needed
  let username = user.user_metadata?.user_name || null;
  if (!username && user.email) {
    const baseUsername = String(user.email).split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 24);
    if (baseUsername) {
      // Check if username is already taken, append number if needed
      let candidateUsername = baseUsername;
      let attempts = 0;
      const maxAttempts = 100;
      
      while (attempts < maxAttempts) {
        const { data: existing } = await sb()
          .from('profiles')
          .select('id')
          .eq('username', candidateUsername)
          .maybeSingle();
        
        if (!existing) {
          username = candidateUsername;
          break;
        }
        
        // Username taken, try with number suffix
        attempts++;
        const suffix = attempts.toString();
        const maxBaseLength = 24 - suffix.length;
        candidateUsername = baseUsername.slice(0, maxBaseLength) + suffix;
      }
      
      // If we couldn't find a unique username after max attempts, use a random suffix
      if (!username && attempts >= maxAttempts) {
        const randomSuffix = Math.random().toString(36).slice(2, 6);
        username = baseUsername.slice(0, 20) + randomSuffix;
      }
    }
  }
  
  const payload: any = {
    id: user.id,
    first_name: firstName,
    last_name: lastName,
    username: username,
    avatar_url: user.user_metadata?.avatar_url || null,
  };
  
  try {
    // Use upsert with onConflict to handle race conditions
    // This ensures only one profile is created even if called multiple times
    const { error: upsertError } = await sb().from('profiles').upsert(payload, { onConflict: 'id' });
    if (upsertError) {
      console.error('[ensureProfileForCurrentUser] Upsert error:', upsertError);
      return false;
    }
    console.log('[ensureProfileForCurrentUser] Profile created/updated for user:', user.id);
    return true; // New profile was created
  } catch (e) {
    console.error('[ensureProfileForCurrentUser] Exception during upsert:', e);
    // Swallow errors here to avoid blocking login; RLS or schema issues can be handled server-side
    return false;
  }
}

// New: list reviewers from profiles where is_reviewer = 'approved' and has set their rate
// Note: Stripe Connect account is NOT required to show up - payments will be held until Stripe is set up
export async function getReviewers(): Promise<DbReviewerSummary[]> {
  const { data, error } = await sb()
    .from('profiles')
    .select('id, first_name, last_name, username, avatar_url, skills, hourly_rate, rating_average, is_reviewer, packages, links, bio, stripe_connect_account_id, created_at, reviews_given_count')
    .eq('is_reviewer', 'approved') // Only show approved reviewers (is_reviewer can be 'pending', 'approved', or 'rejected')
    .not('hourly_rate', 'is', null) // Only show reviewers who have set their rate
    .gt('hourly_rate', 0) // Only show reviewers with positive rates
    .order('rating_average', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data || []).map((row: any) => {
    const reviewsGivenRaw = row.reviews_given_count;
    const parsedReviewsGivenCount =
      reviewsGivenRaw === null || reviewsGivenRaw === undefined ? null : Number(reviewsGivenRaw);
    const safeReviewsGivenCount =
      parsedReviewsGivenCount !== null && Number.isFinite(parsedReviewsGivenCount)
        ? parsedReviewsGivenCount
        : null;
    const fullName = [row.first_name, row.last_name].filter(Boolean).join(' ') || null;
    return {
    id: row.id,
    displayName: fullName || row.username || 'Reviewer',
    username: row.username,
    avatarUrl: row.avatar_url || null,
    skills: row.skills || null,
    pricePerReview: row.hourly_rate ?? null,
    rating: row.rating_average ?? null,
      reviewsGivenCount: safeReviewsGivenCount,
    packages: row.packages || null,
    links: row.links || null,
    bio: row.bio || null,
    createdAt: row.created_at || null,
    };
  }) as DbReviewerSummary[];
}

export async function getReviewerById(id: string): Promise<DbReviewerSummary | null> {
  const { data, error } = await sb()
    .from('profiles')
    .select('id, first_name, last_name, username, avatar_url, skills, hourly_rate, rating_average, is_reviewer, packages, links, bio, reviews_given_count')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const reviewsGivenRaw = (data as any).reviews_given_count;
  const parsedReviewsGivenCount =
    reviewsGivenRaw === null || reviewsGivenRaw === undefined ? null : Number(reviewsGivenRaw);
  const safeReviewsGivenCount =
    parsedReviewsGivenCount !== null && Number.isFinite(parsedReviewsGivenCount)
      ? parsedReviewsGivenCount
      : null;
  const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ') || null;
  return {
    id: data.id,
    displayName: fullName || data.username || 'Reviewer',
    username: data.username,
    avatarUrl: data.avatar_url || null,
    skills: data.skills || null,
    pricePerReview: data.hourly_rate ?? null,
    rating: data.rating_average ?? null,
    reviewsGivenCount: safeReviewsGivenCount,
    packages: (data as any).packages || null,
    links: (data as any).links || null,
    bio: (data as any).bio || null,
  } as DbReviewerSummary;
}

// New: list requests where current user is the reviewer (influencerId)
export async function getRequestsByReviewer(reviewerId: string): Promise<DbRequestSummary[]> {
  const { data, error } = await sb()
    .from('requests')
    .select('id,influencer_id,created_at,status,photos,review,user_id,notes,consent_social,archived_by_influencer,amount_cents,application_fee_cents,stripe_fee_cents,net_amount_cents,auro_fee_bps,payment_distributed,payment_distributed_at,stripe_transfer_id,reviewer_amount_cents,payment_distribution_error,payment_status')
    .eq('influencer_id', reviewerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const requests = ((data as any[]) || []).map(mapRequestRow);

  const userIds = Array.from(
    new Set(
      requests
        .map((r) => r.userId)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    )
  );

  if (userIds.length === 0) {
    return requests;
  }

  const { data: profilesData, error: profilesError } = await sb()
    .from('profiles')
    .select('id, first_name, last_name, username')
    .in('id', userIds);

  if (profilesError || !profilesData) {
    return requests;
  }

  const profileMap = new Map<string, { id: string; full_name: string | null; username: string | null }>(
    profilesData.map((profile: any) => {
      const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || null;
      return [
        profile.id,
        { id: profile.id, full_name: fullName, username: profile.username ?? null },
      ];
    })
  );

  return requests.map((request) => {
    const profile = request.userId ? profileMap.get(request.userId) : undefined;
    return {
      ...request,
      requester_name: request.requester_name ?? profile?.full_name ?? null,
      requester_username: request.requester_username ?? profile?.username ?? null,
    };
  });
}

// New: update a request status
export async function updateRequestStatus(requestId: string, status: string): Promise<DbRequestSummary> {
  // When accepting a request (status -> 'in_progress'), set accept_by and deliver_by deadlines
  const updateData: any = { status };
  if (status === 'in_progress') {
    const now = new Date();
    // Set accept_by to now (when reviewer accepts)
    updateData.accept_by = now.toISOString();
    // Set deliver_by to 72 hours from now (when reviewer must complete)
    updateData.deliver_by = new Date(now.getTime() + REVIEW_DELIVER_WINDOW_MS).toISOString();
  }
  
  const { data, error } = await sb()
    .from('requests')
    .update(updateData)
    .eq('id', requestId)
    .select('id,influencer_id,created_at,status,photos,review,user_id,notes,consent_social,archived_by_influencer,amount_cents,application_fee_cents,stripe_fee_cents,net_amount_cents,auro_fee_bps')
    .maybeSingle();
  if (error) throw error;
  if (data) return mapRequestRow(data);
  // Fallback: fetch the row to avoid "cannot coerce result to a single JSON object"
  const refetched = await getRequestById(requestId);
  if (!refetched) throw new Error('Request not found after update');
  return refetched;
}

export async function submitRequestReview(params: {
  requestId: string;
  videoUrl: string;
}): Promise<DbRequestSummary> {
  const { requestId, videoUrl } = params;

  if (!requestId || typeof requestId !== 'string' || requestId.length < 10) {
    throw new Error('Invalid request ID');
  }
  if (!videoUrl || typeof videoUrl !== 'string') {
    throw new Error('Video review is required');
  }

  const json = await authenticatedJsonFetch<{ ok?: boolean; request: Record<string, unknown> }>(
    '/api/reviews/submit',
    { requestId, videoUrl },
    { timeoutMs: 30000 }
  );
  return mapRequestRow(json.request);
}

export async function saveRequestReviewDraft(params: {
  requestId: string;
  videoUrl: string;
}): Promise<void> {
  await authenticatedJsonFetch<{ ok: boolean }>('/api/reviews/save-draft', params);
}

// Reviewer decisions (server-verified via API routes + service role)
export async function acceptRequest(id: string): Promise<DbRequestSummary> {
  const json = await authenticatedJsonFetch<{ request: Record<string, unknown> }>('/api/reviews/accept', { requestId: id });
  return mapRequestRow(json.request);
}

export async function denyRequest(id: string): Promise<DbRequestSummary> {
  const json = await authenticatedJsonFetch<{ request: Record<string, unknown> }>('/api/reviews/deny', { requestId: id });
  return mapRequestRow(json.request);
}

export async function archiveRequest(id: string): Promise<DbRequestSummary> {
  const { data, error } = await sb()
    .from('requests')
    .update({ archived_by_influencer: true })
    .eq('id', id)
    .select('id,influencer_id,created_at,status,photos,review,user_id,notes,consent_social,archived_by_influencer')
    .maybeSingle();
  if (error) throw error;
  if (data) return mapRequestRow(data);
  const refetched = await getRequestById(id);
  if (!refetched) throw new Error('Request not found after archiving');
  return refetched;
}

export async function unarchiveRequest(id: string): Promise<DbRequestSummary> {
  const { data, error } = await sb()
    .from('requests')
    .update({ archived_by_influencer: false })
    .eq('id', id)
    .select('id,influencer_id,created_at,status,photos,review,user_id,notes,consent_social,archived_by_influencer')
    .maybeSingle();
  if (error) throw error;
  if (data) return mapRequestRow(data);
  const refetched = await getRequestById(id);
  if (!refetched) throw new Error('Request not found after unarchiving');
  return refetched;
}

// Mark that the reviewee has opened/watched their completed review
export async function markReviewAsViewed(requestId: string): Promise<void> {
  const { error } = await sb()
    .from('requests')
    .update({ review_viewed_at: new Date().toISOString() })
    .eq('id', requestId)
    .is('review_viewed_at', null);
  if (error && error.code !== 'PGRST116') {
    throw error;
  }
}

// New: minimal profile fetch by id
export async function getProfileById(id: string): Promise<{ id: string; displayName: string; username?: string | null; avatarUrl?: string | null } | null> {
  const { data, error } = await sb()
    .from('profiles')
    .select('id, first_name, last_name, username, avatar_url')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const displayName = [data.first_name, data.last_name].filter(Boolean).join(' ') || data.username || 'User';
  return {
    id: data.id,
    displayName,
    username: data.username || null,
    avatarUrl: data.avatar_url || null,
  };
}

// Reviewer review functions
export interface ReviewerReview {
  id: string;
  requestId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Check if a reviewer review exists for a request
export async function getReviewerReviewByRequestId(requestId: string): Promise<ReviewerReview | null> {
  const { data, error } = await sb()
    .from('reviewer_reviews')
    .select('id, request_id, reviewer_id, reviewee_id, rating, comment, created_at, updated_at')
    .eq('request_id', requestId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    requestId: data.request_id,
    reviewerId: data.reviewer_id,
    revieweeId: data.reviewee_id,
    rating: data.rating,
    comment: data.comment ?? null,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// Submit a reviewer review (reviewee reviews the reviewer)
export async function submitReviewerReview(params: {
  requestId: string;
  rating: number;
  comment?: string;
}): Promise<ReviewerReview> {
  const { requestId, rating, comment } = params;
  
  // Get the current user
  const { data: sessionData } = await sb().auth.getUser();
  const user = sessionData.user;
  if (!user) throw new Error('Not signed in');
  
  // Get the request to verify it's completed and get reviewer ID
  const request = await getRequestById(requestId);
  if (!request) throw new Error('Request not found');
  if (request.status !== 'completed') throw new Error('Request must be completed before reviewing the reviewer');
  if (!request.review) throw new Error('Review must exist before reviewing the reviewer');
  if (request.userId !== user.id) throw new Error('Only the reviewee can review the reviewer');
  if (!request.influencerId) throw new Error('Reviewer ID not found');
  
  // Validate rating
  if (rating < 1 || rating > 5) throw new Error('Rating must be between 1 and 5');
  
  // Check if review already exists
  const existing = await getReviewerReviewByRequestId(requestId);
  
  // Prevent updates - once a review is submitted, it cannot be changed
  if (existing) {
    throw new Error('Review has already been submitted and cannot be updated.');
  }
  
  // Create new review
  const { data, error } = await sb()
    .from('reviewer_reviews')
    .insert({
      request_id: requestId,
      reviewer_id: request.influencerId,
      reviewee_id: user.id,
      rating,
      comment: comment ?? null,
    })
    .select('id, request_id, reviewer_id, reviewee_id, rating, comment, created_at, updated_at')
    .single();
  if (error) throw error;
  const result = data;
  
  // Note: The database trigger should automatically update rating_average,
  // but we keep this as a fallback. If it fails, the trigger will handle it.
  try {
    const { data: reviews } = await sb()
      .from('reviewer_reviews')
      .select('rating')
      .eq('reviewer_id', request.influencerId);
    
    if (reviews && reviews.length > 0) {
      const avgRating =
        reviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / reviews.length;
      const { error: updateError } = await sb()
        .from('profiles')
        .update({ rating_average: Math.round(avgRating * 10) / 10 })
        .eq('id', request.influencerId);
      
      if (updateError) {
        // Log but don't fail - the database trigger should handle this
        console.warn('Client-side rating update failed (trigger should handle it):', updateError);
      }
    }
  } catch (updateError) {
    // Don't fail the review submission if rating update fails
    // The database trigger will handle updating the rating_average
    console.warn('Rating update error (trigger should handle it):', updateError);
  }
  
  return {
    id: result.id,
    requestId: result.request_id,
    reviewerId: result.reviewer_id,
    revieweeId: result.reviewee_id,
    rating: result.rating,
    comment: result.comment ?? null,
    createdAt: result.created_at,
    updatedAt: result.updated_at,
  };
}

// Get all reviewer reviews for a specific reviewer
export async function getReviewerReviewsByReviewerId(reviewerId: string): Promise<ReviewerReview[]> {
  const { data, error } = await sb()
    .from('reviewer_reviews')
    .select('id, request_id, reviewer_id, reviewee_id, rating, comment, created_at, updated_at')
    .eq('reviewer_id', reviewerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    requestId: row.request_id,
    reviewerId: row.reviewer_id,
    revieweeId: row.reviewee_id,
    rating: row.rating,
    comment: row.comment ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}


