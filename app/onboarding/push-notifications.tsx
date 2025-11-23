import React, { useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View as RNView, Platform, Image, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { updateProfilePreferences, getCurrentProfile } from '@/lib/profile';
import { MotionView, MotionPressable, cardEntrance, subtleFadeIn } from '@/components/motion';
import { MotionDelays } from '@/components/motion/tokens';
import { FadeInDown, ZoomIn } from 'react-native-reanimated';

export default function OnboardingWelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();

  // Only set the step if user is actually on this step (no step or push-notifications)
  // This prevents overwriting progress if user somehow navigates back here
  useEffect(() => {
    const setInitialStep = async () => {
      try {
        const profile = await getCurrentProfile();
        const currentStep = profile?.preferences?.onboarding_step;
        // Only update if no step is set (new user) or if explicitly on push-notifications step
        if (!currentStep || currentStep === 'push_notifications') {
          await updateProfilePreferences({
            onboarding_completed: false,
            onboarding_step: 'role_selection',
          });
        }
      } catch (error) {
        // If we can't check, assume it's safe to set the step
        updateProfilePreferences({
          onboarding_completed: false,
          onboarding_step: 'role_selection',
        }).catch(() => {});
      }
    };
    setInitialStep();
  }, []);

  const handleGetStarted = async () => {
    // Ensure step is set before navigation
    try {
      await updateProfilePreferences({
        onboarding_step: 'role_selection',
        onboarding_completed: false,
      });
    } catch (error) {
      console.warn('Failed to update onboarding step:', error);
    }
    router.replace('/onboarding/enable-notifications');
  };


  return (
    <RNView style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: '#FF0000' }]}>
      <RNView 
        style={[
          styles.content,
          {
            height: Platform.OS === 'ios' ? screenHeight - insets.top - insets.bottom : undefined,
            backgroundColor: '#00FF00',
          },
        ]}
      >
        <RNView style={[styles.centerSection, { backgroundColor: '#0000FF' }]}>
          <MotionView entering={ZoomIn.duration(400).delay(MotionDelays.quick)}>
            <Text style={styles.emoji}>🎉</Text>
          </MotionView>
          
          <RNView style={styles.introRow}>
            <MotionView entering={ZoomIn.duration(400).delay(MotionDelays.quick)} style={styles.avatarContainer}>
              <Image 
                source={require('../../rohan-headshot.jpg')}
                style={styles.avatar}
                resizeMode="cover"
              />
            </MotionView>
            <MotionView entering={FadeInDown.duration(400).delay(MotionDelays.item)} style={styles.introTextContainer}>
              <Text style={styles.introText}>
                Hey I'm RJ, founder of Auro. Thanks for signing up. Let's build your profile.
              </Text>
            </MotionView>
          </RNView>

          <MotionView entering={cardEntrance(3)} style={styles.stepsCard}>
            <RNView style={styles.stepsRow}>
              <RNView style={styles.stepItem}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.brand.success} />
                <Text style={styles.stepText}>Choose role</Text>
              </RNView>
              <RNView style={styles.stepItem}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.brand.success} />
                <Text style={styles.stepText}>Add details</Text>
              </RNView>
              <RNView style={styles.stepItem}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.brand.success} />
                <Text style={styles.stepText}>Share profile</Text>
              </RNView>
            </RNView>
          </MotionView>

          <MotionView entering={cardEntrance(4)} style={styles.buttonContainer}>
            <MotionPressable 
              style={styles.primaryButton}
              onPress={handleGetStarted}
            >
              <ExpoLinearGradient
                colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
                style={styles.buttonGradient}
              >
                <Text style={styles.primaryButtonText}>Let's build your profile</Text>
              </ExpoLinearGradient>
            </MotionPressable>
          </MotionView>
        </RNView>
      </RNView>
    </RNView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.brand.background,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    width: '100%',
    position: 'relative',
  },
  centerSection: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 56,
    marginBottom: 24,
    textAlign: 'center',
  },
  introRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    gap: 16,
    width: '100%',
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: Colors.brand.cardBackground,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    flexShrink: 0,
  },
  avatar: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.5 }, { translateY: -10 }],
  },
  introTextContainer: {
    flex: 1,
  },
  introText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.brand.textPrimary,
    textAlign: 'left',
    lineHeight: 26,
    backgroundColor: 'transparent',
  },
  stepsCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'transparent',
    gap: 8,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'transparent',
    flex: 1,
    justifyContent: 'center',
  },
  stepText: {
    fontSize: 13,
    color: Colors.brand.textSecondary,
    backgroundColor: 'transparent',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
  },
  primaryButton: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.brand.textOnGradient,
    fontFamily: 'Poppins_700Bold',
  },
});

