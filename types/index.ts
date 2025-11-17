export interface User {
  id: string;
  name: string;
  email: string;
  age: number;
  bio: string;
  photos: string[];
  isInfluencer: boolean;
  verified?: boolean;
  rating?: number;
  reviewCount?: number;
}

export interface InfluencerProfile {
  id: string;
  name: string;
  username: string;
  profileImage: string;
  verified: boolean;
  followerCount: number;
  specialties: string[];
  rating: number;
  reviewCount: number;
  pricePerReview: number;
  bio: string;
}

export interface ReviewRequest {
  id: string;
  userId: string;
  influencerId: string;
  photos: string[];
  status: 'pending' | 'accepted' | 'paid' | 'in_progress' | 'completed' | 'rejected';
  createdAt: Date;
  completedAt?: Date;
  review?: Review;
  notes?: string | null;
  // New: consent flag to allow social sharing by reviewer
  consent_social?: boolean;
  // New: archived timestamp to hide from active lists when present
  archived_at?: string | null;
}

export interface Review {
  id: string;
  requestId: string;
  influencerId: string;
  userId: string;
  ratings: {
    attractiveness: number;
    wardrobe: number;
    room: number;
    overall: number;
  };
  feedback: {
    strengths: string[];
    improvements: string[];
    generalFeedback: string;
  };
  createdAt: Date;
}

export interface PhotoCategory {
  id: string;
  name: string;
  description: string;
  required: boolean;
  maxPhotos: number;
}

// Minimal DB-side types used by Supabase queries
export interface DbInfluencerSummary {
  id: string;
  name: string;
  username: string;
  verified: boolean;
  profileImage: string;
  specialties: string[];
  pricePerReview: number;
  rating: number;
  followerCount: number;
}

export interface DbRequestSummary {
  id: string;
  influencerId: string;
  userId?: string;
  createdAt: string;
  created_at?: string;
  status: 'pending' | 'accepted' | 'paid' | 'in_progress' | 'completed' | 'rejected';
  photos: string[];
  notes?: string | null;
  review?: {
    ratings?: {
      overall?: number;
      attractiveness?: number;
      wardrobe?: number;
      room?: number;
      socials?: number;
    };
    feedback?: {
      strengths?: string[];
      improvements?: string[];
      generalFeedback?: string;
      sectionNotes?: { outfits?: string; room?: string; socials?: string };
      photoNotes?: Record<string, string>;
    };
    media?: {
      videoUrl?: string | null;
      imageUrl?: string | null;
    };
    createdAt?: string;
  } | null;
  // New fields mirrored from DB
  consent_social?: boolean;
  archived_at?: string | null;
  // Amounts (all in cents)
  amount_cents?: number | null;
  application_fee_cents?: number | null;
  stripe_fee_cents?: number | null;
  net_amount_cents?: number | null;
  auro_fee_bps?: number | null;
  // Payment distribution tracking
  payment_distributed?: boolean | null;
  payment_distributed_at?: string | null;
  stripe_transfer_id?: string | null;
  reviewer_amount_cents?: number | null;
  payment_distribution_error?: string | null;
  completed_at?: string | null;
  payment_status?: string | null;
  requester_name?: string | null;
  requester_username?: string | null;
  review_viewed_at?: string | null;
}

export interface DbUserProfile {
  id: string;
  email?: string;
  name?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  // Optional flag surfaced for app logic
  is_reviewer?: boolean;
}

// Reviewers sourced from profiles (users who opted-in)
export interface DbReviewerSummary {
  id: string;
  displayName: string;
  username?: string | null;
  avatarUrl?: string | null;
  skills?: string[] | null;
  pricePerReview?: number | null;
  rating?: number | null;
  reviewsGivenCount?: number | null;
  packages?: ReviewerPackage[] | null;
  links?: ProfileLinks | null;
  bio?: string | null;
  createdAt?: string | null;
}

// Profile types for Profile/Settings screens
export interface ProfileLinks {
  twitter?: string | null;
  linkedin?: string | null;
  github?: string | null;
  [key: string]: any;
}

export interface ProfilePreferences {
  email_notifications?: boolean;
  push_notifications?: boolean;
  onboarding_role?: 'reviewer' | 'reviewee';
  onboarding_step?: string | null;
  onboarding_completed?: boolean;
  onboarding_completed_at?: string | null;
  [key: string]: any;
}

export interface Profile {
  id: string;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  is_reviewer?: boolean;
  created_at?: string;
  skills?: string[] | null;
  links?: ProfileLinks | null;
  preferences?: ProfilePreferences | null;
  hourly_rate?: number | null;
  availability?: string | null;
  pending_payout_balance_cents?: number | null;
  awaiting_payout_balance_cents?: number | null;
  completed_paid_total_cents?: number | null;
  stripe_connect_account_id?: string | null;
  // Derived stats (optional, may be selected via RPC/views)
  reviews_given_count?: number | null;
  reviews_received_count?: number | null;
  rating_average?: number | null;
}

// Session package a reviewer offers
export interface ReviewerPackage {
  id: string; // stable id for selection
  label: string; // e.g. "3 × 30-minute sessions"
  minutes?: number | null; // per session duration in minutes (optional)
  sessions?: number | null; // number of sessions
  price?: number | null; // price in USD (or app currency)
}

// Lightweight review item for lists (Given/Received)
export interface UserReview {
  id: string;
  author_id: string; // who wrote the review
  subject_id: string; // who the review is about
  rating: number;
  comment?: string | null;
  created_at: string;
  // Optional denormalized fields for UI rendering
  author?: { id: string; username?: string | null; full_name?: string | null; avatar_url?: string | null };
  subject?: { id: string; username?: string | null; full_name?: string | null; avatar_url?: string | null };
  // Per-user archiving flags (optional, may not exist in all DBs)
  archived_by_author?: boolean | null;
  archived_by_subject?: boolean | null;
}