import { supabase } from './supabase';
import type { DbInfluencerSummary, DbRequestSummary, DbUserProfile, DbReviewerSummary } from '@/types';

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
  const { data, error } = await supabase
    .from('influencers')
    .select(
      'id,name,username,verified,profileImage,specialties,pricePerReview,rating,followerCount'
    )
    .order('rating', { ascending: false });
  if (error) throw error;
  return (data as DbInfluencerSummary[]) ?? [];
}

export async function getInfluencerById(id: string): Promise<DbInfluencerSummary | null> {
  const { data, error } = await supabase
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
  const { data, error } = await supabase
    .from('requests')
    .select('id,influencer_id,created_at,status,photos,review,user_id,notes,consent_social,archived_by_influencer,amount_cents,application_fee_cents,stripe_fee_cents,net_amount_cents,auro_fee_bps')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data as any[]) || []).map(mapRequestRow);
}

export async function getRequestById(id: string): Promise<DbRequestSummary | null> {
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
  const { data: sessionData } = await supabase.auth.getUser();
  const user = sessionData.user;
  if (!user) return null;
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, bio, is_reviewer')
    .eq('id', user.id)
    .maybeSingle();
  if (error) throw error;
  if (profile) {
    return {
      id: profile.id,
      email: user.email ?? undefined,
      name: profile.full_name || profile.username || undefined,
      bio: profile.bio ?? null,
      avatarUrl: profile.avatar_url ?? null,
      // @ts-ignore - optional flag for app logic
      is_reviewer: (profile as any)?.is_reviewer ?? undefined,
    } as DbUserProfile;
  }
  return {
    id: user.id,
    email: user.email ?? undefined,
    name: user.user_metadata?.name,
    bio: null,
    avatarUrl: null,
  } as DbUserProfile;
}

// Ensure a profile row exists for the current user. Safe to call after login.
// Returns true if a new profile was created, false if it already existed.
export async function ensureProfileForCurrentUser(): Promise<boolean> {
  const { data: sessionData } = await supabase.auth.getUser();
  const user = sessionData.user;
  if (!user) return false;
  try {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();
    if (existing) return false; // Profile already existed
  } catch {}
  const payload: any = {
    id: user.id,
    full_name: user.user_metadata?.name || null,
    username: user.user_metadata?.user_name || (user.email ? String(user.email).split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 24) : null),
    avatar_url: user.user_metadata?.avatar_url || null,
  };
  try {
    await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
    return true; // New profile was created
  } catch (e) {
    // Swallow errors here to avoid blocking login; RLS or schema issues can be handled server-side
    return false;
  }
}

// New: list reviewers from profiles where is_reviewer = true and has Stripe Connect account
export async function getReviewers(): Promise<DbReviewerSummary[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, username, avatar_url, skills, hourly_rate, rating_average, is_reviewer, packages, links, bio, stripe_connect_account_id, created_at, reviews_given_count')
    .eq('is_reviewer', true)
    .not('stripe_connect_account_id', 'is', null) // Only show reviewers with Connect accounts
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
    return {
    id: row.id,
    displayName: row.full_name || row.username || 'Reviewer',
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
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, username, avatar_url, skills, hourly_rate, rating_average, is_reviewer, packages, links, bio, reviews_given_count')
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
  return {
    id: data.id,
    displayName: data.full_name || data.username || 'Reviewer',
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
  const { data, error } = await supabase
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

  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, username')
    .in('id', userIds);

  if (profilesError || !profilesData) {
    return requests;
  }

  const profileMap = new Map<string, { id: string; full_name: string | null; username: string | null }>(
    profilesData.map((profile: any) => [
      profile.id,
      { id: profile.id, full_name: profile.full_name ?? null, username: profile.username ?? null },
    ])
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
  const { data, error } = await supabase
    .from('requests')
    .update({ status })
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
  review: {
    ratings: { overall: number; attractiveness?: number; wardrobe?: number; room?: number; outfits?: number; roomTour?: number; socials?: number; [key: string]: any };
    feedback: { strengths?: string[]; improvements?: string[]; generalFeedback?: string; sectionNotes?: { outfits?: string; room?: string; socials?: string }; photoNotes?: Record<string, string> };
  };
  videoUrl?: string | null;
  imageUrl?: string | null;
}): Promise<DbRequestSummary> {
  const { requestId, review, videoUrl, imageUrl } = params;
  
  // CRITICAL: Input validation
  if (!requestId || typeof requestId !== 'string' || requestId.length < 10) {
    throw new Error('Invalid request ID');
  }
  
  if (!review || typeof review !== 'object') {
    throw new Error('Invalid review data');
  }
  
  // Validate ratings
  if (!review.ratings || typeof review.ratings.overall !== 'number' || 
      review.ratings.overall < 1 || review.ratings.overall > 5) {
    throw new Error('Overall rating must be between 1 and 5');
  }
  
  // Validate video/image URLs if provided
  if (videoUrl && typeof videoUrl !== 'string') {
    throw new Error('Invalid video URL');
  }
  if (imageUrl && typeof imageUrl !== 'string') {
    throw new Error('Invalid image URL');
  }
  
  // CRITICAL: Check if review already exists to prevent duplicate submissions
  const { data: existingRequest } = await supabase
    .from('requests')
    .select('id, status, review')
    .eq('id', requestId)
    .maybeSingle();
  
  if (!existingRequest) {
    throw new Error('Request not found');
  }
  
  if (existingRequest.status === 'completed' && existingRequest.review) {
    // Review already submitted - return existing review
    console.warn('[submitRequestReview] Review already submitted for request:', requestId);
    const refetched = await getRequestById(requestId);
    if (!refetched) throw new Error('Request not found');
    return refetched;
  }
  
  if (existingRequest.status !== 'in_progress' && existingRequest.status !== 'paid') {
    throw new Error(`Cannot submit review for request with status: ${existingRequest.status}`);
  }
  
  // CRITICAL: Use atomic update to prevent concurrent submissions
  // Only update if status is still 'in_progress' or 'paid' (not already completed)
  const withMedia = { ...review, media: { videoUrl: videoUrl ?? null, imageUrl: imageUrl ?? null } } as any;
  const { data, error } = await supabase
    .from('requests')
    .update({ review: withMedia, status: 'completed' })
    .eq('id', requestId)
    .in('status', ['in_progress', 'paid']) // Only update if still in progress/paid (atomic check)
    .select('id,influencer_id,created_at,status,photos,review,user_id,notes,consent_social,amount_cents,application_fee_cents,stripe_fee_cents,net_amount_cents,auro_fee_bps')
    .maybeSingle();
  
  if (error) throw error;
  
  // If no data returned, it means the status changed (race condition - another process completed it)
  if (!data) {
    console.warn('[submitRequestReview] Request status changed during submission (race condition)');
    const refetched = await getRequestById(requestId);
    if (!refetched) throw new Error('Request not found');
    return refetched;
  }
  if (data) {
    const result = mapRequestRow(data);
    
    // Send notification to reviewer about review submission
    if (data.influencer_id) {
      try {
        // Call Next.js API route to send notification
        const baseUrl = 'https://www.appauro.com'; // Use production URL
        fetch(`${baseUrl}/api/notifications/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: data.influencer_id,
            title: 'Review Submitted! ✅',
            body: 'Your review has been submitted! The reviewee can now see your feedback.',
            data: {
              type: 'review_submitted',
              requestId: requestId,
            },
          }),
        }).catch(err => console.error('Failed to send review submission notification:', err));
      } catch (notifError) {
        // Don't fail the review submission if notification fails
        console.error('Error sending review submission notification:', notifError);
      }
    }
    
    // Trigger payment distribution to reviewer
    try {
      const baseUrl = 'https://www.appauro.com'; // Always use production URL for payment distribution
      console.log(`[payment-distribution] Attempting to distribute payment for request: ${requestId}`);
      console.log(`[payment-distribution] Request ID type: ${typeof requestId}`);
      console.log(`[payment-distribution] Request ID length: ${requestId?.length}`);
      console.log(`[payment-distribution] Using base URL: ${baseUrl}`);
      
      // Validate requestId format
      if (!requestId || typeof requestId !== 'string' || requestId.length < 10) {
        console.error('[payment-distribution] Invalid requestId format:', requestId);
        return result; // Skip payment distribution for invalid requestId
      }
      
      const response = await fetch(`${baseUrl}/api/payments/distribute-reviewer-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId })
      });
      
      console.log(`[payment-distribution] Response status: ${response.status}`);
      console.log(`[payment-distribution] Response ok: ${response.ok}`);
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        console.error('[payment-distribution] Payment distribution failed:', errorData);
        console.error('[payment-distribution] Error type:', errorData.errorType);
        console.error('[payment-distribution] Full error details:', JSON.stringify(errorData, null, 2));
        
        // Enhanced logging for debugging
        if (errorData.errorType === 'INVALID_CONNECT_ACCOUNT') {
          console.error('[payment-distribution] 🚨 ACCOUNT ISSUE DETECTED:');
          console.error('[payment-distribution] Reviewer:', errorData.reviewerName);
          console.error('[payment-distribution] Account ID:', errorData.reviewerId);
          console.error('[payment-distribution] Stripe Error:', errorData.stripeErrorCode);
          console.error('[payment-distribution] 💡 SOLUTION: Have the reviewer complete their Stripe Connect setup');
        }
        
        // Don't fail the review submission, but log the specific error
        if (errorData.error === 'Request not found') {
          console.warn('[payment-distribution] Request not found in database - this might be a timing issue');
        }
      } else {
        const successData = await response.json().catch(() => ({}));
        console.log('[payment-distribution] Payment distribution successful:', successData);
      }
    } catch (paymentError) {
      console.error('[payment-distribution] Network error distributing payment:', paymentError);
      console.error('[payment-distribution] Error message:', paymentError.message);
      console.error('[payment-distribution] Error stack:', paymentError.stack);
      // Don't fail the review submission if payment distribution fails
      // The payment can be distributed manually later
    }
    
    return result;
  }
  const refetched = await getRequestById(requestId);
  if (!refetched) throw new Error('Request not found after submitting review');
  return refetched;
}

// Reviewer decisions
export async function acceptRequest(id: string): Promise<DbRequestSummary> {
  const current = await getRequestById(id);
  if (!current) throw new Error('Request not found');
  if (current.status !== 'paid') {
    throw new Error('Cannot accept until payment is completed');
  }
  return updateRequestStatus(id, 'in_progress');
}

export async function denyRequest(id: string): Promise<DbRequestSummary> {
  const current = await getRequestById(id);
  if (!current) throw new Error('Request not found');
  if (current.status !== 'paid') {
    throw new Error('Cannot deny until payment is completed');
  }
  
  // Update status to rejected first
  const updated = await updateRequestStatus(id, 'rejected');
  
  // Trigger automatic refund
  try {
    const baseUrl = 'https://www.appauro.com';
    console.log(`[automatic-refund] Triggering refund for denied request: ${id}`);
    
    const response = await fetch(`${baseUrl}/api/payments/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        requestId: id, 
        reason: 'reviewer_denied',
        partial: false
      })
    });
    
    console.log(`[automatic-refund] Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('[automatic-refund] Error response:', errorData);
      // Don't throw error - status update should still succeed
    } else {
      const successData = await response.json();
      console.log('[automatic-refund] Success response:', successData);
    }
  } catch (refundError) {
    console.error('[automatic-refund] Refund failed:', refundError);
    // Don't throw error - status update should still succeed
  }
  
  return updated;
}

export async function archiveRequest(id: string): Promise<DbRequestSummary> {
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
  const { error } = await supabase
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
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, username, avatar_url')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    displayName: data.full_name || data.username || 'User',
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
  const { data, error } = await supabase
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
  const { data: sessionData } = await supabase.auth.getUser();
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
  
  let result;
  if (existing) {
    // Update existing review
    const { data, error } = await supabase
      .from('reviewer_reviews')
      .update({
        rating,
        comment: comment ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('id, request_id, reviewer_id, reviewee_id, rating, comment, created_at, updated_at')
      .single();
    if (error) throw error;
    result = data;
  } else {
    // Create new review
    const { data, error } = await supabase
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
    result = data;
  }
  
  // Update reviewer's average rating
  try {
    const { data: reviews } = await supabase
      .from('reviewer_reviews')
      .select('rating')
      .eq('reviewer_id', request.influencerId);
    
    if (reviews && reviews.length > 0) {
      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      await supabase
        .from('profiles')
        .update({ rating_average: Math.round(avgRating * 10) / 10 })
        .eq('id', request.influencerId);
    }
  } catch (updateError) {
    // Don't fail the review submission if rating update fails
    console.error('Failed to update reviewer rating:', updateError);
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
  const { data, error } = await supabase
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


