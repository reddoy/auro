import React from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';

export default function RoleSelectionScreen() {
  const insets = useSafeAreaInsets();

  const handleGetReviewed = () => {
    router.push('/onboarding/discover-reviewers');
  };

  const handleBeReviewer = () => {
    router.push('/onboarding/reviewer/profile-picture');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ExpoLinearGradient
        colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
        style={styles.backgroundGradient}
      />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Welcome to Auro! 🎉</Text>
          <Text style={styles.subtitle}>What would you like to do?</Text>
          <Text style={styles.description}>
            Choose how you'd like to use Auro. You can always change this later.
          </Text>

          <View style={styles.optionsContainer}>
            <TouchableOpacity 
              style={styles.optionCard}
              onPress={handleGetReviewed}
              activeOpacity={0.8}
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
              activeOpacity={0.8}
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
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  content: {
    backgroundColor: 'transparent',
    alignItems: 'center',
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
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  optionGradient: {
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 111, 0, 0.3)',
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


