import React, { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';

import { View } from '@/components/Themed';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import Spinner from '@/components/Spinner';
import { getCurrentProfile } from '@/lib/profile';
import type { Profile } from '@/types';

export default function IndexGate() {
  const [checking, setChecking] = useState(true);

  const resolveDestination = useMemo(() => {
    return (profile: Profile | null | undefined) => {
      const preferences = profile?.preferences || {};
      if (preferences?.onboarding_completed) {
        return '/(tabs)/requests';
      }

      const step = preferences?.onboarding_step || null;
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
          return '/onboarding/reviewer/share-link';
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
          // For new users with no step, go directly to role selection
          // Push notifications can be handled later or made optional
          return '/onboarding/push-notifications';
      }
    };
  }, []);

  useEffect(() => {
    const run = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.warn('Auth session error:', error.message);
        return;
      }
      if (data.session) {
        try {
          const profile = await getCurrentProfile();
          const destination = resolveDestination(profile);
          router.replace(destination as any);
        } catch (err) {
          console.warn('Failed to load profile for onboarding state', err);
          router.replace('/(tabs)/requests');
        }
      } else {
        router.replace('/intro');
      }
      setChecking(false);
    };
    run();
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.brand.background }}>
        <Spinner size={40} color={Colors.brand.accentMagenta} />
      </View>
    );
  }

  return null;
}



