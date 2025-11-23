import React from 'react';
import { View, Image, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';

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
        <Image 
          source={require('../auro_aura_logo_nobg.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.brandText}>Auro</Text>
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
  logo: {
    width: 48,
    height: 48,
    marginRight: 12,
  },
  brandText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins_700Bold',
  },
});

