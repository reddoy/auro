import React, { useEffect } from 'react';
import { StyleSheet, ScrollView, KeyboardAvoidingView, Platform, View as RNView } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { updateProfilePreferences } from '@/lib/profile';
import { MotionView, MotionPressable, cardEntrance } from '@/components/motion';
import { MotionDelays } from '@/components/motion/tokens';
import { FadeInDown, ZoomIn } from 'react-native-reanimated';

export default function ReviewPendingScreen() {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // Update onboarding step when this screen loads
    updateProfilePreferences({
      onboarding_step: 'reviewer_review_pending',
    }).catch(() => {});
  }, []);

  const handleContinue = async () => {
    try {
      await updateProfilePreferences({
        onboarding_step: 'completed',
        onboarding_completed: true,
      });
    } catch (error) {
      console.warn('Failed to update onboarding preferences', error);
    } finally {
      router.replace('/onboarding/thank-you?type=reviewer');
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
            <RNView style={styles.avatarContainer}>
              <RNView style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitials}>RJ</Text>
              </RNView>
            </RNView>
          </MotionView>
          
          <MotionView entering={FadeInDown.duration(400).delay(MotionDelays.item)}>
            <Text style={styles.title}>Personal Review Process</Text>
          </MotionView>
          
          <MotionView entering={FadeInDown.duration(400).delay(MotionDelays.item * 2)}>
            <Text style={styles.message}>
              I personally review each reviewer application to make sure they align with our platform values and quality standards.
            </Text>
          </MotionView>

          <MotionView entering={cardEntrance(3)} style={styles.infoCard}>
            <RNView style={styles.infoContent}>
              <Text style={styles.infoText}>
                You'll receive an email notification once your application has been reviewed. This typically takes 1-2 business days.
              </Text>
            </RNView>
          </MotionView>

          <MotionView entering={cardEntrance(4)}>
            <MotionPressable 
              style={styles.primaryButton}
              onPress={handleContinue}
            >
              <ExpoLinearGradient
                colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
                style={styles.buttonGradient}
              >
                <Text style={styles.primaryButtonText}>
                  Got it, continue
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
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 3,
    borderColor: Colors.brand.accentOrange,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    backgroundColor: Colors.brand.cardBackgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 40,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    fontFamily: 'Poppins_700Bold',
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
    marginBottom: 32,
    lineHeight: 28,
    paddingHorizontal: 20,
  },
  infoCard: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 20,
    padding: 20,
    marginBottom: 32,
    width: '100%',
  },
  infoContent: {
    width: '100%',
  },
  infoText: {
    fontSize: 15,
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
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

