import React, { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { router } from 'expo-router';

import { View } from '@/components/Themed';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';

export default function IndexGate() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getSession();
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
        <ActivityIndicator size="large" color={Colors.brand.accentMagenta} />
      </View>
    );
  }

  return null;
}



