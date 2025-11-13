import React, { useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View as RNView, Platform } from 'react-native';
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
    <View style={styles.container}>
      <ExpoLinearGradient
        colors={[Colors.brand.background, Colors.brand.cardBackground]}
        style={styles.backgroundGradient}
      />
      <View 
        style={[
          styles.content,
          {
            paddingTop: Math.max(20, insets.top + 20),
            paddingBottom: insets.bottom + 20,
          },
        ]}
      >
        <View style={styles.topSection}>
          <MotionView entering={ZoomIn.duration(400).delay(MotionDelays.quick)}>
            <Text style={styles.emoji}>🎉</Text>
          </MotionView>
          <MotionView entering={FadeInDown.duration(400).delay(MotionDelays.item)}>
            <Text
              style={styles.title}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              Thanks for joining Auro!
            </Text>
          </MotionView>
          <MotionView entering={FadeInDown.duration(400).delay(MotionDelays.item * 2)}>
            <Text style={styles.subtitle}>
              Let's get you set up. We'll walk you through a few quick steps to tailor Auro to how you want to use it.
            </Text>
          </MotionView>

          <MotionView entering={cardEntrance(3)} style={styles.stepsCard}>
            <View style={styles.stepRow}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.brand.success} />
              <Text style={styles.stepText}>Choose whether you want to review or get reviewed</Text>
            </View>
            <View style={styles.stepRow}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.brand.success} />
              <Text style={styles.stepText}>Add a few details so people know what to expect</Text>
            </View>
            <View style={styles.stepRow}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.brand.success} />
              <Text style={styles.stepText}>Share your profile and start connecting</Text>
            </View>
          </MotionView>
        </View>

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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.brand.background,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  topSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  emoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'Poppins_700Bold',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
    lineHeight: 22,
  },
  stepsCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 10,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'transparent',
  },
  stepText: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    flex: 1,
    lineHeight: 20,
    backgroundColor: 'transparent',
  },
  buttonContainer: {
    width: '100%',
    paddingTop: 20,
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

