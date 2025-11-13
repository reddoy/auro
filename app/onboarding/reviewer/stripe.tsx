import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, Linking, View as RNView } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { getCurrentProfile, updateProfile, updateProfilePreferences } from '@/lib/profile';
import { createStripeExpressOnboardingLink } from '@/lib/payments';
import type { Profile } from '@/types';
import Spinner from '@/components/Spinner';
import { MotionView, MotionPressable, cardEntrance, subtleFadeIn } from '@/components/motion';
import { MotionDelays } from '@/components/motion/tokens';
import { FadeInDown, ZoomIn } from 'react-native-reanimated';

export default function StripeSetupScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingUp, setSettingUp] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const p = await getCurrentProfile();
        setProfile(p);
        // Mark user as reviewer
        if (p && !p.is_reviewer) {
          await updateProfile({ is_reviewer: true });
        }
      } catch (e: any) {
        Alert.alert('Error', 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleSetupStripe = async () => {
    if (!profile?.id) {
      Alert.alert('Error', 'Profile not found');
      return;
    }

    try {
      setSettingUp(true);
      const url = await createStripeExpressOnboardingLink(profile.id);
      
      if (!url) {
        Alert.alert('Error', 'Failed to create Stripe setup link. Please try again later.');
        return;
      }

      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert('Error', 'Cannot open Stripe setup link');
        return;
      }

      await Linking.openURL(url);
      
      // Don't auto-advance - let the user complete Stripe setup and come back
      // Show alert with options to continue or skip
      Alert.alert(
        'Stripe Setup Opened',
        'Complete your Stripe setup in the browser. Once done, come back to the app to continue.',
        [
          {
            text: 'Continue to Next Step',
            onPress: () => {
              // Mark as reviewer if not already
              if (profile && !profile.is_reviewer) {
                updateProfile({ is_reviewer: true }).catch(() => {});
              }
              updateProfilePreferences({ onboarding_step: 'reviewer_share_link' }).catch(() => {});
              router.replace('/onboarding/reviewer/share-link');
            }
          },
          {
            text: 'Skip for Now',
            style: 'cancel',
            onPress: () => {
              // Skip Stripe setup - mark as reviewer and continue
              if (profile && !profile.is_reviewer) {
                updateProfile({ is_reviewer: true }).catch(() => {});
              }
              updateProfilePreferences({ onboarding_step: 'reviewer_share_link' }).catch(() => {});
              router.replace('/onboarding/reviewer/share-link');
            }
          }
        ]
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to open Stripe setup');
    } finally {
      setSettingUp(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Stripe Setup?',
      'You\'ll need to set up Stripe to receive payments. You can do this later from your profile settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Skip for Now', 
          onPress: () => {
            // Mark as reviewer even if skipping Stripe
            if (profile && !profile.is_reviewer) {
              updateProfile({ is_reviewer: true }).catch(() => {});
            }
            updateProfilePreferences({ onboarding_step: 'reviewer_share_link' }).catch(() => {});
            router.replace('/onboarding/reviewer/share-link');
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Spinner size={40} color={Colors.brand.accentMagenta} />
      </View>
    );
  }

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
          <MotionView entering={FadeInDown.duration(400).delay(MotionDelays.quick)}>
            <Text style={styles.title}>Set Up Payments</Text>
          </MotionView>
          <MotionView entering={FadeInDown.duration(400).delay(MotionDelays.item)}>
            <Text style={styles.description}>
              Connect your Stripe account to receive payments for reviews. This is quick and secure.
            </Text>
          </MotionView>

          <MotionView entering={cardEntrance(2)} style={styles.infoCard}>
            <RNView style={styles.infoContent}>
              <Text style={styles.infoTitle}>
                Why{' '}<Text style={styles.stripeText}>Stripe</Text>?
              </Text>
              <RNView style={styles.benefitsList}>
                <RNView style={styles.benefitRow}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.benefitText}>Secure payment processing</Text>
                </RNView>
                <RNView style={styles.benefitRow}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.benefitText}>Fast payouts to your bank account</Text>
                </RNView>
                <RNView style={styles.benefitRow}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.benefitText}>Industry-standard security</Text>
                </RNView>
                <RNView style={styles.benefitRow}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.benefitText}>Used by millions of businesses</Text>
                </RNView>
              </RNView>
            </RNView>
          </MotionView>

          <MotionView entering={cardEntrance(4)}>
            <MotionPressable 
              style={[styles.setupButton, settingUp && styles.setupButtonDisabled]}
              onPress={handleSetupStripe}
              disabled={settingUp}
            >
              <ExpoLinearGradient
                colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
                style={styles.buttonGradient}
              >
                {settingUp ? (
                  <Spinner size={20} color={Colors.brand.textOnGradient} />
                ) : (
                  <Text style={styles.setupButtonText}>Set Up Stripe</Text>
                )}
              </ExpoLinearGradient>
            </MotionPressable>
          </MotionView>

          <MotionView entering={subtleFadeIn().delay(MotionDelays.section)}>
            <TouchableOpacity 
              style={styles.skipButton}
              onPress={handleSkip}
              activeOpacity={0.7}
            >
              <Text style={styles.skipButtonText}>I'll do this later</Text>
            </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  content: {
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'Poppins_700Bold',
  },
  description: {
    fontSize: 15,
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  infoCard: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  infoContent: {
    width: '100%',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 0,
  },
  stripeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#635BFF', // Stripe brand color
    letterSpacing: 0,
  },
  benefitsList: {
    gap: 12,
    alignItems: 'center',
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    justifyContent: 'center',
    maxWidth: '90%',
  },
  bullet: {
    fontSize: 16,
    color: Colors.brand.accentOrange,
    fontWeight: '700',
    marginTop: 2,
  },
  benefitText: {
    fontSize: 15,
    color: Colors.brand.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
  },
  setupButton: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 16,
  },
  setupButtonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setupButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.brand.textOnGradient,
    fontFamily: 'Poppins_700Bold',
  },
  skipButton: {
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  skipButtonText: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
    fontWeight: '600',
  },
});


