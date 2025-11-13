import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, Linking } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { getCurrentProfile, updateProfile, updateProfilePreferences } from '@/lib/profile';
import { createStripeExpressOnboardingLink } from '@/lib/payments';
import type { Profile } from '@/types';
import Spinner from '@/components/Spinner';

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
      
      // After opening Stripe, wait a moment then proceed
      // The user will complete Stripe setup and can come back
      setTimeout(() => {
        updateProfilePreferences({ onboarding_step: 'reviewer_share_link' }).catch(() => {});
        router.push('/onboarding/reviewer/share-link');
      }, 1000);
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
            router.push('/onboarding/reviewer/share-link');
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
          <Text style={styles.title}>Set Up Payments</Text>
          <Text style={styles.description}>
            Connect your Stripe account to receive payments for reviews. This is quick and secure.
          </Text>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Why Stripe?</Text>
            <Text style={styles.infoText}>
              • Secure payment processing{'\n'}
              • Fast payouts to your bank account{'\n'}
              • Industry-standard security{'\n'}
              • Used by millions of businesses
            </Text>
          </View>

          <TouchableOpacity 
            style={[styles.setupButton, settingUp && styles.setupButtonDisabled]}
            onPress={handleSetupStripe}
            disabled={settingUp}
            activeOpacity={0.8}
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
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.skipButton}
            onPress={handleSkip}
          >
            <Text style={styles.skipButtonText}>I'll do this later</Text>
          </TouchableOpacity>
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
    paddingTop: 60,
  },
  content: {
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'Poppins_700Bold',
  },
  description: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  infoCard: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 111, 0, 0.2)',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
    lineHeight: 24,
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


