import React from 'react';
import { View, Image, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import Colors from '@/constants/Colors';

interface LogoHeaderProps {
  backgroundColor?: string;
  showLogo?: boolean;
}

export default function LogoHeader({ 
  backgroundColor = Colors.brand.background, 
  showLogo = true 
}: LogoHeaderProps) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  // Don't render anything on auth pages
  if (pathname?.startsWith('/auth')) {
    return null;
  }

  if (!showLogo) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={[styles.safeAreaSpacer, { height: insets.top }]} />
      <View style={styles.logoContainer}>
        <Image 
          source={require('../Auro_side_side_no_bg.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeAreaSpacer: {
    width: '100%',
  },
  logoContainer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 40,
    maxWidth: '80%',
  },
});

