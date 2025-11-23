import React, { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';

import { View } from '@/components/Themed';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import Spinner from '@/components/Spinner';
import { getCurrentProfile, resolveOnboardingDestination } from '@/lib/profile';

export default function IndexGate() {
  const [checking, setChecking] = useState(true);

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
          const destination = resolveOnboardingDestination(profile);
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



