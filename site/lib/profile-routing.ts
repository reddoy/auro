import type { Profile } from '@/types';

/**
 * Determines which reviewer onboarding step to start from based on existing profile data.
 * Returns the route and onboarding step preference to set.
 */
export function getReviewerOnboardingStartStep(profile: Profile | null | undefined): { route: string; step: string } {
  if (!profile) {
    return { route: '/onboarding/reviewer/bio', step: 'reviewer_bio' };
  }

  const hasBio = !!(profile.bio && profile.bio.trim());
  const hasRate = !!(profile.hourly_rate && profile.hourly_rate > 0);
  const hasAvatar = !!(profile.avatar_url && profile.avatar_url.trim());
  const hasStripe = !!(profile.stripe_connect_account_id && profile.stripe_connect_account_id.trim());

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

  return { route: '/onboarding/reviewer/review-pending', step: 'reviewer_review_pending' };
}

/**
 * Resolves the destination route based on onboarding status.
 * Returns legacy tab/onboarding path segments; map with mapExpoRouterPathToNext for Next.js URLs.
 */
export function resolveOnboardingDestination(profile: Profile | null | undefined): string {
  if (!profile) {
    return '/(tabs)/requests';
  }

  const preferences = profile?.preferences || {};
  if (preferences?.onboarding_completed) {
    return '/(tabs)/requests';
  }

  const step = preferences?.onboarding_step || null;

  const isReviewerOnboardingStep = step && (
    step === 'reviewer_bio' ||
    step === 'reviewer_rate' ||
    step === 'reviewer_profile_picture' ||
    step === 'reviewer_stripe' ||
    step === 'reviewer_share_link' ||
    step === 'reviewer_review_pending'
  );

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
      return '/onboarding/reviewer/review-pending';
    case 'reviewee_profile_picture':
      return '/onboarding/reviewee/profile-picture';
    case 'discover_reviewers':
      return '/onboarding/discover-reviewers';
    case 'role_selection':
      return '/onboarding/role-selection';
    case 'push_notifications':
    case 'push-notifications':
      // Web: no push setup — send users to the app hub.
      return '/(tabs)/requests';
    case 'completed':
      return '/(tabs)/requests';
    default:
      return '/(tabs)/requests';
  }
}
