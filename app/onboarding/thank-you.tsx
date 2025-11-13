import React, { useEffect } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { updateProfilePreferences } from '@/lib/profile';
import { MotionView, MotionPressable, cardEntrance } from '@/components/motion';
import { MotionDelays } from '@/components/motion/tokens';
import { FadeInDown, ZoomIn } from 'react-native-reanimated';

export default function ThankYouScreen() {
  const insets = useSafeAreaInsets();
  const { type } = useLocalSearchParams<{ type?: string }>();
  const isReviewer = type === 'reviewer';

  useEffect(() => {
    updateProfilePreferences({
      onboarding_completed: true,
      onboarding_step: 'completed',
    }).catch(() => {});
  }, []);

  const handleGoHome = () => {
    if (isReviewer) {
      // For reviewers, go to their requests page (my reviews)
      router.replace('/(tabs)/requests');
    } else {
      // For get reviewed, go to home (requests page)
      router.replace('/(tabs)/requests');
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
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <MotionView entering={ZoomIn.duration(500).delay(MotionDelays.quick)}>
            <Text style={styles.emoji}>🎉</Text>
          </MotionView>
          <MotionView entering={FadeInDown.duration(400).delay(MotionDelays.item)}>
            <Text style={styles.title}>
              {isReviewer ? 'Welcome to the Auro Community!' : 'Thank You for Signing Up!'}
            </Text>
          </MotionView>
          <MotionView entering={FadeInDown.duration(400).delay(MotionDelays.item * 2)}>
            <Text style={styles.message}>
              {isReviewer 
                ? "You're all set! Share your profile link on socials to start receiving review requests and climb the leaderboard."
                : "You're all set! Head to Discover Reviewers anytime to request feedback when you're ready."
              }
            </Text>
          </MotionView>

          <MotionView entering={cardEntrance(3)}>
            <MotionPressable 
              style={styles.primaryButton}
              onPress={handleGoHome}
            >
              <ExpoLinearGradient
                colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
                style={styles.buttonGradient}
              >
                <Text style={styles.primaryButtonText}>
                  {isReviewer ? 'Take Me to My Reviews' : 'Take Me to Home'}
                </Text>
              </ExpoLinearGradient>
            </MotionPressable>
          </MotionView>
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
  emoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'Poppins_700Bold',
  },
  message: {
    fontSize: 18,
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 28,
    paddingHorizontal: 20,
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
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.brand.textOnGradient,
    fontFamily: 'Poppins_700Bold',
  },
});


