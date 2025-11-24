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
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Auth session error:', error.message);
          // On error, redirect to intro/auth to be safe
          router.replace('/intro');
          setChecking(false);
          return;
        }
        
        // CRITICAL: Only proceed if we have a valid session
        if (!data.session) {
          // No session - redirect to intro/auth immediately
          router.replace('/intro');
          setChecking(false);
          return;
        }
        
        // Verify the user is actually authenticated by checking getUser
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          // User is not actually authenticated - redirect to auth
          console.warn('User not authenticated:', userError?.message);
          router.replace('/intro');
          setChecking(false);
          return;
        }
        
        // User is authenticated - proceed with routing
        try {
          const profile = await getCurrentProfile();
          const destination = resolveOnboardingDestination(profile);
          router.replace(destination as any);
        } catch (err) {
          console.warn('Failed to load profile for onboarding state', err);
          // If profile fetch fails, go to main app instead of onboarding
          router.replace('/(tabs)/requests');
        }
        setChecking(false);
      } catch (err) {
        console.error('Unexpected error in index gate:', err);
        // On unexpected error, redirect to intro/auth
        router.replace('/intro');
        setChecking(false);
      }
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



