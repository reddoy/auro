import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWindowDimensions } from 'react-native';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { updateProfilePreferences } from '@/lib/profile';
import { MotionView, MotionPressable, cardEntrance } from '@/components/motion';
import { MotionDelays } from '@/components/motion/tokens';
import { FadeInDown } from 'react-native-reanimated';

export default function RoleSelectionScreen() {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const [loadingChoice, setLoadingChoice] = useState<'reviewer' | 'reviewee' | null>(null);

  const handleError = (error: any) => {
    const message = error?.message || 'Something went wrong. Please try again.';
    Alert.alert('Unable to continue', message);
  };

  const handleGetReviewed = async () => {
    if (loadingChoice) return;
    setLoadingChoice('reviewee');
    try {
      await updateProfilePreferences({
        onboarding_role: 'reviewee',
        onboarding_completed: false,
        onboarding_step: 'reviewee_profile_picture',
      });
      router.replace('/onboarding/reviewee/profile-picture');
    } catch (error: any) {
      handleError(error);
    } finally {
      setLoadingChoice(null);
    }
  };

  const handleBeReviewer = async () => {
    if (loadingChoice) return;
    setLoadingChoice('reviewer');
    try {
      await updateProfilePreferences({
        onboarding_role: 'reviewer',
        onboarding_completed: false,
        onboarding_step: 'reviewer_bio',
      });
      router.replace('/onboarding/reviewer/bio');
    } catch (error: any) {
      handleError(error);
    } finally {
      setLoadingChoice(null);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ExpoLinearGradient
        colors={[Colors.brand.background, Colors.brand.cardBackground]}
        style={styles.backgroundGradient}
      />
      <View
        style={[
          styles.content,
          {
            height: Platform.OS === 'ios' ? screenHeight - insets.top - insets.bottom : undefined,
            paddingTop: Platform.OS === 'ios' ? 0 : Math.max(20, insets.top + 12),
            paddingBottom: Platform.OS === 'ios' ? 0 : Math.max(20, insets.bottom + 12),
          },
        ]}
      >
        <View style={styles.centerContent}>
          <MotionView entering={FadeInDown.duration(400).delay(MotionDelays.quick)}>
            <Text style={styles.title}>What would you like to do?</Text>
          </MotionView>
          <MotionView entering={FadeInDown.duration(400).delay(MotionDelays.item)}>
            <Text style={styles.description}>
              Choose how you'd like to use Auro. You can always change this later.
            </Text>
          </MotionView>

          <View style={styles.optionsContainer}>
          <MotionView entering={cardEntrance(2)}>
            <MotionPressable 
              style={styles.optionCard}
              onPress={handleGetReviewed}
              disabled={!!loadingChoice}
            >
              <ExpoLinearGradient
                colors={[Colors.brand.cardBackground, Colors.brand.cardBackgroundLight]}
                style={styles.optionGradient}
              >
                <Text style={styles.optionEmoji}>📸</Text>
                <Text style={styles.optionTitle}>Get Reviewed</Text>
                <Text style={styles.optionDescription}>
                  Request reviews from expert reviewers to improve your profile and get feedback
                </Text>
              </ExpoLinearGradient>
            </MotionPressable>
          </MotionView>

          <MotionView entering={cardEntrance(3)}>
            <MotionPressable 
              style={styles.optionCard}
              onPress={handleBeReviewer}
              disabled={!!loadingChoice}
            >
              <ExpoLinearGradient
                colors={[Colors.brand.cardBackground, Colors.brand.cardBackgroundLight]}
                style={styles.optionGradient}
              >
                <Text style={styles.optionEmoji}>⭐</Text>
                <Text style={styles.optionTitle}>Be a Reviewer</Text>
                <Text style={styles.optionDescription}>
                  Join our community of reviewers and earn money by providing thoughtful reviews
                </Text>
              </ExpoLinearGradient>
            </MotionPressable>
          </MotionView>
        </View>
        </View>
      </View>
    </KeyboardAvoidingView>
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
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  centerContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'Poppins_700Bold',
  },
  description: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  optionsContainer: {
    width: '100%',
    gap: 14,
    marginTop: 32,
  },
  optionCard: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  optionGradient: {
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    width: '100%',
    borderRadius: 20,
  },
  optionEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'Poppins_700Bold',
  },
  optionDescription: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});


