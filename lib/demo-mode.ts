import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import type { Profile } from '@/types';

const DEMO_MODE_KEY = 'auro_demo_mode';
const DEMO_USER_ID = 'demo-user-00000000-0000-0000-0000-000000000000';

/**
 * Demo mode profile data - pre-populated for App Store reviewers
 */
export const DEMO_PROFILE: Profile = {
  id: DEMO_USER_ID,
  username: 'demo_reviewer',
  first_name: 'Demo',
  last_name: 'User',
  avatar_url: null,
  bio: 'This is a demo account for App Store review. All features are available for testing.',
  is_reviewer: 'approved',
  created_at: new Date().toISOString(),
  skills: ['Product Reviews', 'App Testing', 'Content Creation'],
  links: {
    instagram: 'https://instagram.com/demo',
    tiktok: 'https://tiktok.com/@demo',
  },
  preferences: {
    onboarding_completed: true,
    onboarding_step: 'completed',
    notifications_enabled: true,
  },
  hourly_rate: 5000, // $50 per review
  availability: 'available',
  reviews_given_count: 3,
  reviews_received_count: 5,
  rating_average: 4.8,
  packages: [
    {
      id: 'demo-package-1',
      name: 'Standard Review',
      description: 'Comprehensive product review with photos',
      price_cents: 5000,
      delivery_days: 3,
    },
    {
      id: 'demo-package-2',
      name: 'Premium Review',
      description: 'In-depth review with video content',
      price_cents: 10000,
      delivery_days: 5,
    },
  ],
  pending_payout_balance_cents: 25000,
  awaiting_payout_balance_cents: 15000,
  completed_paid_total_cents: 100000,
  stripe_connect_account_id: 'demo_stripe_account',
};

/**
 * Check if demo mode is currently active
 */
export async function isDemoMode(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(DEMO_MODE_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

/**
 * Enable demo mode
 */
export async function enableDemoMode(): Promise<void> {
  await AsyncStorage.setItem(DEMO_MODE_KEY, 'true');
}

/**
 * Disable demo mode
 */
export async function disableDemoMode(): Promise<void> {
  await AsyncStorage.removeItem(DEMO_MODE_KEY);
  // Sign out if in demo mode
  await supabase.auth.signOut();
}

/**
 * Get demo profile (returns the pre-populated demo profile)
 */
export function getDemoProfile(): Profile {
  return DEMO_PROFILE;
}

/**
 * Create a demo session in Supabase (for compatibility with existing code)
 * This creates a minimal session that allows the app to function
 */
export async function createDemoSession(): Promise<void> {
  // For demo mode, we'll use a special approach:
  // Instead of creating a real Supabase session, we'll store demo mode flag
  // and the app will check for demo mode before requiring auth
  
  // Set demo mode flag
  await enableDemoMode();
  
  // Note: We don't create a real Supabase session for demo mode
  // The app will check isDemoMode() and use getDemoProfile() instead
}

/**
 * Check if current user is demo user
 */
export function isDemoUser(userId: string | undefined): boolean {
  return userId === DEMO_USER_ID;
}



