import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';

import { View } from '@/components/Themed';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import Spinner from '@/components/Spinner';

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
        router.replace('/(tabs)/requests');
      } else {
        router.replace('/auth');
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



