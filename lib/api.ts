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
    .select('id,influencer_id,created_at,status,photos,review,user_id,notes')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data as any[]) || []).map(mapRequestRow);
}

export async function getRequestById(id: string): Promise<DbRequestSummary | null> {
  const { data, error } = await supabase
    .from('requests')
    .select('id,influencer_id,created_at,status,photos,review,user_id,notes')
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
}): Promise<DbRequestSummary> {
  const { data, error } = await supabase
    .from('requests')
    .insert([
      {
        user_id: params.userId,
        influencer_id: params.influencerId,
        photos: params.photos,
        notes: params.notes ?? null,
        status: 'pending',
      },
    ])
    .select('id,influencer_id,created_at,status,photos,review,user_id,notes')
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
    .select('id, username, full_name, avatar_url, bio')
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
    .select('id, full_name, username, avatar_url, skills, hourly_rate, rating_average, is_reviewer, packages')
    .eq('is_reviewer', true)
    .order('rating_average', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    displayName: row.full_name || row.username || 'Reviewer',
    username: row.username,
    avatarUrl: row.avatar_url || null,
    skills: row.skills || null,
    hourlyRate: row.hourly_rate ?? null,
    rating: row.rating_average ?? null,
    packages: row.packages || null,
  })) as DbReviewerSummary[];
}

export async function getReviewerById(id: string): Promise<DbReviewerSummary | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, username, avatar_url, skills, hourly_rate, rating_average, is_reviewer, packages')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data || !data.is_reviewer) return null;
  return {
    id: data.id,
    displayName: data.full_name || data.username || 'Reviewer',
    username: data.username,
    avatarUrl: data.avatar_url || null,
    skills: data.skills || null,
    hourlyRate: data.hourly_rate ?? null,
    rating: data.rating_average ?? null,
    packages: (data as any).packages || null,
  } as DbReviewerSummary;
}

// New: list requests where current user is the reviewer (influencerId)
export async function getRequestsByReviewer(reviewerId: string): Promise<DbRequestSummary[]> {
  const { data, error } = await supabase
    .from('requests')
    .select('id,influencer_id,created_at,status,photos,review,user_id,notes')
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
    .select('id,influencer_id,created_at,status,photos,review,user_id,notes')
    .single();
  if (error) throw error;
  return mapRequestRow(data);
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


