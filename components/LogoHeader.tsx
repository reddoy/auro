import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import { AuroMark } from '@/components/AuroMark';

interface LogoHeaderProps {
  backgroundColor?: string;
  showLogo?: boolean;
}

export default function LogoHeader({ 
  backgroundColor = '#0C0225', 
  showLogo = true 
}: LogoHeaderProps) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  // Don't render anything on auth, intro, or onboarding pages
  const normalizedPath = pathname || '';
  const isOnboarding = normalizedPath.includes('/onboarding') || 
                       normalizedPath.includes('onboarding') ||
                       normalizedPath.startsWith('/onboarding') ||
                       normalizedPath.startsWith('onboarding');
  const isAuth = normalizedPath.includes('/auth') || normalizedPath.startsWith('/auth');
  const isIntro = normalizedPath.includes('/intro') || normalizedPath.startsWith('/intro');
  
  if (isAuth || isIntro || isOnboarding) {
    return null;
  }

  if (!showLogo) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={[styles.safeAreaSpacer, { height: Platform.OS === 'web' ? 0 : insets.top }]} />
      <View style={styles.logoContainer}>
        <AuroMark height={40} />
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
    flexDirection: 'row',
    backgroundColor: 'transparent',
  },
});

