import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { updateProfilePreferences } from '@/lib/profile';

export default function RoleSelectionScreen() {
  const insets = useSafeAreaInsets();
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
            paddingTop: Math.max(28, insets.top + 16),
            paddingBottom: Math.max(28, insets.bottom + 16),
          },
        ]}
      >
        <Text style={styles.title}>Welcome to Auro! 🎉</Text>
        <Text style={styles.subtitle}>What would you like to do?</Text>
        <Text style={styles.description}>
          Choose how you'd like to use Auro. You can always change this later.
        </Text>

        <View style={styles.optionsContainer}>
          <TouchableOpacity 
            style={styles.optionCard}
            onPress={handleGetReviewed}
            activeOpacity={0.85}
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
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.optionCard}
            onPress={handleBeReviewer}
            activeOpacity={0.85}
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
          </TouchableOpacity>
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
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'Poppins_700Bold',
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  optionsContainer: {
    width: '100%',
    gap: 20,
  },
  optionCard: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 8,
  },
  optionGradient: {
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    width: '100%',
    borderRadius: 24,
  },
  optionEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  optionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: 'Poppins_700Bold',
  },
  optionDescription: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});


