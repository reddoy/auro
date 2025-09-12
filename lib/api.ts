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
    archived_at: row.archived_at ?? (row.archived_by_influencer ? (row.updated_at || row.created_at || new Date().toISOString()) : null),
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
    .select('id,influencer_id,created_at,status,photos,review,user_id,notes,consent_social,archived_by_influencer,updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data as any[]) || []).map(mapRequestRow);
}

export async function getRequestById(id: string): Promise<DbRequestSummary | null> {
  const { data, error } = await supabase
    .from('requests')
    .select('id,influencer_id,created_at,status,photos,review,user_id,notes,consent_social,archived_by_influencer,updated_at')
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
    .select('id,influencer_id,created_at,status,photos,review,user_id,notes,consent_social,archived_by_influencer,updated_at')
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

// New: list reviewers from profiles where is_reviewer = true
export async function getReviewers(): Promise<DbReviewerSummary[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, username, avatar_url, skills, hourly_rate, rating_average, is_reviewer, packages, links, bio')
    .eq('is_reviewer', true)
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
    .select('id,influencer_id,created_at,status,photos,review,user_id,notes,consent_social,archived_by_influencer,updated_at')
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
    .select('id,influencer_id,created_at,status,photos,review,user_id,notes,consent_social,archived_at,archived_by_influencer,updated_at')
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
    ratings: { overall: number; attractiveness?: number; wardrobe?: number; room?: number };
    feedback: { strengths?: string[]; improvements?: string[]; generalFeedback?: string };
  };
  videoUrl?: string | null;
  imageUrl?: string | null;
}): Promise<DbRequestSummary> {
  const { requestId, review } = params;
  const { data, error } = await supabase
    .from('requests')
    .update({ review, status: 'completed' })
    .eq('id', requestId)
    .select('id,influencer_id,created_at,status,photos,review,user_id,notes,consent_social')
    .maybeSingle();
  if (error) throw error;
  if (data) return mapRequestRow(data);
  const refetched = await getRequestById(requestId);
  if (!refetched) throw new Error('Request not found after submitting review');
  return refetched;
}

// Reviewer decisions
export async function acceptRequest(id: string): Promise<DbRequestSummary> {
  // For now just set accepted; webhook/payment may later move to paid
  return updateRequestStatus(id, 'accepted');
}

export async function denyRequest(id: string): Promise<DbRequestSummary> {
  return updateRequestStatus(id, 'rejected');
}

export async function archiveRequest(id: string): Promise<DbRequestSummary> {
  const { data, error } = await supabase
    .from('requests')
    .update({ archived_by_influencer: true })
    .eq('id', id)
    .select('id,influencer_id,created_at,status,photos,review,user_id,notes,consent_social,archived_by_influencer,updated_at')
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
    .select('id,influencer_id,created_at,status,photos,review,user_id,notes,consent_social,archived_by_influencer,updated_at')
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


