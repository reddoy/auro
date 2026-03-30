import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Platform, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat, 
  withSequence,
  interpolate,
  Easing
} from 'react-native-reanimated';

import { Text } from '@/components/Themed';
import { AuroMark } from '@/components/AuroMark';
import Colors from '@/constants/Colors';
import { MotionPressable, MotionView, cardEntrance, subtleFadeIn } from '@/components/motion';

export default function IntroScreen() {
  const insets = useSafeAreaInsets();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const isCompact = screenHeight <= 900;
  
  // Notification badge animations for each app
  const [hingeCount, setHingeCount] = useState(10);
  const [bumbleCount, setBumbleCount] = useState(10);
  const [tinderCount, setTinderCount] = useState(10);
  
  const hingeScale = useSharedValue(1);
  const bumbleScale = useSharedValue(1);
  const tinderScale = useSharedValue(1);
  
  const hingePulse = useSharedValue(0);
  const bumblePulse = useSharedValue(0);
  const tinderPulse = useSharedValue(0);
  
  // Animate notification counts from 10 to 99, then restart (with slight delays for variety)
  useEffect(() => {
    const hingeInterval = setInterval(() => {
      setHingeCount((prev) => {
        if (prev >= 99) {
          return 10;
        }
        return prev + 1;
      });
    }, 150);
    
    const bumbleInterval = setInterval(() => {
      setBumbleCount((prev) => {
        if (prev >= 99) {
          return 10;
        }
        return prev + 1;
      });
    }, 180); // Slightly different timing
    
    const tinderInterval = setInterval(() => {
      setTinderCount((prev) => {
        if (prev >= 99) {
          return 10;
        }
        return prev + 1;
      });
    }, 170); // Slightly different timing
    
    return () => {
      clearInterval(hingeInterval);
      clearInterval(bumbleInterval);
      clearInterval(tinderInterval);
    };
  }, []);
  
  // Start pulse animations immediately
  useEffect(() => {
    hingePulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    
    bumblePulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    
    tinderPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1050, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1050, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);
  
  // Animate scale when counts change
  useEffect(() => {
    hingeScale.value = withSequence(
      withTiming(1.3, { duration: 200, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 200, easing: Easing.in(Easing.quad) })
    );
  }, [hingeCount]);
  
  useEffect(() => {
    bumbleScale.value = withSequence(
      withTiming(1.3, { duration: 200, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 200, easing: Easing.in(Easing.quad) })
    );
  }, [bumbleCount]);
  
  useEffect(() => {
    tinderScale.value = withSequence(
      withTiming(1.3, { duration: 200, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 200, easing: Easing.in(Easing.quad) })
    );
  }, [tinderCount]);

  const handleGetStarted = () => {
    router.replace('/auth');
  };

  const buttonBorderRadius = isCompact ? 22 : 24;
  
  // Animated styles for notification badges
  const hingeBadgeStyle = useAnimatedStyle(() => {
    const pulseScale = 1 + (hingePulse.value * 0.1);
    return {
      transform: [
        { scale: hingeScale.value * pulseScale }
      ],
    };
  });
  
  const bumbleBadgeStyle = useAnimatedStyle(() => {
    const pulseScale = 1 + (bumblePulse.value * 0.1);
    return {
      transform: [
        { scale: bumbleScale.value * pulseScale }
      ],
    };
  });
  
  const tinderBadgeStyle = useAnimatedStyle(() => {
    const pulseScale = 1 + (tinderPulse.value * 0.1);
    return {
      transform: [
        { scale: tinderScale.value * pulseScale }
      ],
    };
  });
  
  const hingeGlowStyle = useAnimatedStyle(() => {
    const opacity = interpolate(hingePulse.value, [0, 1], [0.3, 0.7]);
    return { opacity };
  });
  
  const bumbleGlowStyle = useAnimatedStyle(() => {
    const opacity = interpolate(bumblePulse.value, [0, 1], [0.3, 0.7]);
    return { opacity };
  });
  
  const tinderGlowStyle = useAnimatedStyle(() => {
    const opacity = interpolate(tinderPulse.value, [0, 1], [0.3, 0.7]);
    return { opacity };
  });

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent />
      
      {/* Logo and Brand Name */}
      <View style={{ paddingTop: insets.top + 10 }}>
        <MotionView entering={subtleFadeIn()} style={styles.logoContainer}>
          <AuroMark height={isCompact ? 36 : 44} />
        </MotionView>
      </View>

      {/* App Logos in Fan Layout */}
      <View style={styles.logoImageContainer}>
        <View style={styles.fanContainer}>
          {/* Bumble (Left) */}
          <MotionView entering={subtleFadeIn()} style={[styles.appLogoWrapper, styles.bumbleWrapper]}>
            <View style={styles.imageContainer}>
              <View style={[styles.appLogo, { backgroundColor: '#FFE566', alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ fontWeight: '800', color: '#111', fontSize: 15, textAlign: 'center' }} numberOfLines={2}>
                  Bumble
                </Text>
              </View>
            </View>
            <Animated.View style={[styles.notificationBadge, bumbleBadgeStyle]}>
              <Animated.View style={[styles.notificationGlow, bumbleGlowStyle]} />
              <Text style={styles.notificationText}>
                {bumbleCount > 99 ? '99+' : bumbleCount}
              </Text>
            </Animated.View>
          </MotionView>
          
          {/* Hinge (Center) */}
          <MotionView entering={subtleFadeIn()} style={[styles.appLogoWrapper, styles.hingeWrapper]}>
            <View style={styles.imageContainer}>
              <View style={[styles.appLogo, { backgroundColor: '#6D3BE8', alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ fontWeight: '800', color: '#fff', fontSize: 15, textAlign: 'center' }} numberOfLines={2}>
                  Hinge
                </Text>
              </View>
            </View>
            <Animated.View style={[styles.notificationBadge, hingeBadgeStyle]}>
              <Animated.View style={[styles.notificationGlow, hingeGlowStyle]} />
              <Text style={styles.notificationText}>
                {hingeCount > 99 ? '99+' : hingeCount}
              </Text>
            </Animated.View>
          </MotionView>
          
          {/* Tinder (Right) */}
          <MotionView entering={subtleFadeIn()} style={[styles.appLogoWrapper, styles.tinderWrapper]}>
            <View style={styles.imageContainer}>
              <View style={[styles.appLogo, { backgroundColor: '#FE3C72', alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ fontWeight: '800', color: '#fff', fontSize: 15, textAlign: 'center' }} numberOfLines={2}>
                  Tinder
                </Text>
              </View>
            </View>
            <Animated.View style={[styles.notificationBadge, tinderBadgeStyle]}>
              <Animated.View style={[styles.notificationGlow, tinderGlowStyle]} />
              <Text style={styles.notificationText}>
                {tinderCount > 99 ? '99+' : tinderCount}
              </Text>
            </Animated.View>
          </MotionView>
        </View>
        
        {/* Tagline Text - Below the logos */}
        <MotionView entering={subtleFadeIn()} style={styles.taglineContainer}>
          <Text style={[styles.taglineText, isCompact && styles.taglineTextCompact]}>
            Real women.
          </Text>
          <Text style={[styles.taglineText, isCompact && styles.taglineTextCompact]}>
            Real reviews.
          </Text>
          <View style={styles.matchesRow}>
            <Text style={[styles.taglineText, isCompact && styles.taglineTextCompact]}>
              More{' '}
            </Text>
            <Text style={[styles.taglineText, styles.matchesText, isCompact && styles.taglineTextCompact]}>
              matches.
            </Text>
          </View>
        </MotionView>
      </View>

      {/* Get Started Button */}
      <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + 20 }]}>
        <MotionPressable
          style={[styles.getStartedButton, isCompact && styles.getStartedButtonCompact]}
          onPress={handleGetStarted}
          entering={cardEntrance(0)}
        >
          <ExpoLinearGradient
            colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: buttonBorderRadius }}
          />
          <Text style={styles.getStartedButtonText}>Get Started</Text>
        </MotionPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.brand.background,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: 'transparent', // Removed background
    marginHorizontal: 20,
    marginBottom: 16,
  },
  logoImage: {
    width: 48,
    height: 48,
    marginRight: 12,
  },
  logoImageCompact: {
    width: 40,
    height: 40,
    marginRight: 10,
  },
  brandText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins_700Bold',
  },
  brandTextCompact: {
    fontSize: 28,
  },
  logoImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: 'transparent',
    gap: 24, // Space between logos and tagline
  },
  fanContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
    height: 140,
  },
  appLogoWrapper: {
    width: 100, // App icon size (similar to iOS home screen)
    height: 100,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 22, // iOS app icon corner radius
    overflow: 'hidden', // Clip any overflow
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  appLogo: {
    width: '100%',
    height: '100%',
    borderRadius: 22, // iOS app icon corner radius
    minWidth: 100,
    minHeight: 100,
  },
  bumbleWrapper: {
    transform: [{ rotate: '-20deg' }], // Rotate left for fan effect
    marginRight: -15, // Overlap slightly
    zIndex: 1,
  },
  hingeWrapper: {
    zIndex: 3, // Center logo on top
  },
  tinderWrapper: {
    transform: [{ rotate: '20deg' }], // Rotate right for fan effect
    marginLeft: -15, // Overlap slightly
    zIndex: 1,
  },
  notificationBadge: {
    position: 'absolute',
    top: -12, // Hang off more from the top edge (iPhone style)
    right: -12, // Hang off more from the right edge (iPhone style)
    backgroundColor: '#FF3B30',
    borderRadius: 18,
    minWidth: 36,
    height: 36,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 10,
  },
  notificationGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 20,
    backgroundColor: '#FF3B30',
    opacity: 0.5,
  },
  notificationText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
  },
  taglineContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    backgroundColor: 'transparent', // Removed background
    marginHorizontal: 20,
    gap: 8, // Space between lines
  },
  taglineText: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.brand.textPrimary,
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 32,
  },
  matchesRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  matchesText: {
    color: Colors.brand.accentOrange,
  },
  taglineTextCompact: {
    fontSize: 20,
  },
  buttonContainer: {
    paddingHorizontal: 28,
    paddingTop: 20,
    backgroundColor: 'transparent',
  },
  getStartedButton: {
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: Colors.brand.accentMagenta,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  getStartedButtonCompact: {
    paddingVertical: 14,
    borderRadius: 22,
  },
  getStartedButtonText: {
    color: Colors.brand.textOnGradient,
    fontSize: 17,
    fontWeight: 'bold',
    fontFamily: 'Poppins_700Bold',
  },
});

