import { supabase } from '@/lib/supabase';
import type { Profile } from '@shared/types';

/** Browser-side profile fetch (same query as legacy Expo `getCurrentProfile`). */
export async function getCurrentProfileWeb(): Promise<Profile | null> {
  if (!supabase) return null;

  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, username, first_name, last_name, avatar_url, bio, is_reviewer, created_at, skills, links, preferences, hourly_rate, availability, reviews_given_count, reviews_received_count, rating_average, packages, pending_payout_balance_cents, awaiting_payout_balance_cents, completed_paid_total_cents, stripe_connect_account_id'
    )
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    const metadataName = (user.user_metadata?.name as string) || '';
    const nameParts = metadataName.trim().split(' ');
    return {
      id: user.id,
      username: (user.user_metadata?.user_name as string) || null,
      first_name: nameParts[0] || null,
      last_name: nameParts.slice(1).join(' ') || null,
      avatar_url: (user.user_metadata?.avatar_url as string) || null,
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
    } as Profile;
  }

  return data as Profile;
}
