import { supabase } from './supabase';
import type { DbInfluencerSummary, DbRequestSummary, DbUserProfile, DbReviewerSummary } from '@/types';

function mapRequestRow(row: any): DbRequestSummary {
  return {
    id: row.id,
    influencerId: row.influencer_id ?? row.influencerId,
    userId: row.user_id ?? row.userId,
    createdAt: row.created_at ?? row.createdAt,
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
    .select('id,influencer_id,created_at,status,photos,review,user_id,notes,consent_social,archived_by_influencer,amount_cents,application_fee_cents,stripe_fee_cents,net_amount_cents,auro_fee_bps')
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
export async function ensureProfileForCurrentUser(): Promise<void> {
  const { data: sessionData } = await supabase.auth.getUser();
  const user = sessionData.user;
  if (!user) return;
  try {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();
    if (existing) return;
  } catch {}
  const payload: any = {
    id: user.id,
    full_name: user.user_metadata?.name || null,
    username: user.user_metadata?.user_name || (user.email ? String(user.email).split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 24) : null),
    avatar_url: user.user_metadata?.avatar_url || null,
  };
  try {
    await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
  } catch (e) {
    // Swallow errors here to avoid blocking login; RLS or schema issues can be handled server-side
  }
}

// New: list reviewers from profiles where is_reviewer = true and has Stripe Connect account
export async function getReviewers(): Promise<DbReviewerSummary[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, username, avatar_url, skills, hourly_rate, rating_average, is_reviewer, packages, links, bio, stripe_connect_account_id')
    .eq('is_reviewer', true)
    .not('stripe_connect_account_id', 'is', null) // Only show reviewers with Connect accounts
    .not('hourly_rate', 'is', null) // Only show reviewers who have set their rate
    .gt('hourly_rate', 0) // Only show reviewers with positive rates
    .order('rating_average', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    displayName: row.full_name || row.username || 'Reviewer',
    username: row.username,
    avatarUrl: row.avatar_url || null,
    skills: row.skills || null,
    pricePerReview: row.hourly_rate ?? null,
    rating: row.rating_average ?? null,
    packages: row.packages || null,
    links: row.links || null,
    bio: row.bio || null,
  })) as DbReviewerSummary[];
}

export async function getReviewerById(id: string): Promise<DbReviewerSummary | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, username, avatar_url, skills, hourly_rate, rating_average, is_reviewer, packages, links, bio')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    displayName: data.full_name || data.username || 'Reviewer',
    username: data.username,
    avatarUrl: data.avatar_url || null,
    skills: data.skills || null,
    pricePerReview: data.hourly_rate ?? null,
    rating: data.rating_average ?? null,
    packages: (data as any).packages || null,
    links: (data as any).links || null,
    bio: (data as any).bio || null,
  } as DbReviewerSummary;
}

// New: list requests where current user is the reviewer (influencerId)
export async function getRequestsByReviewer(reviewerId: string): Promise<DbRequestSummary[]> {
  const { data, error } = await supabase
    .from('requests')
    .select('id,influencer_id,created_at,status,photos,review,user_id,notes,consent_social,archived_by_influencer,amount_cents,application_fee_cents,stripe_fee_cents,net_amount_cents,auro_fee_bps')
    .eq('influencer_id', reviewerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data as any[]) || []).map(mapRequestRow);
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
  const withMedia = { ...review, media: { videoUrl: videoUrl ?? null, imageUrl: imageUrl ?? null } } as any;
  const { data, error } = await supabase
    .from('requests')
    .update({ review: withMedia, status: 'completed' })
    .eq('id', requestId)
    .select('id,influencer_id,created_at,status,photos,review,user_id,notes,consent_social,amount_cents,application_fee_cents,stripe_fee_cents,net_amount_cents,auro_fee_bps')
    .maybeSingle();
  if (error) throw error;
  if (data) {
    const result = mapRequestRow(data);
    
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


