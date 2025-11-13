import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, View as RNView } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { copyToClipboard } from '@/lib/clipboard';
import { getCurrentProfile, updateProfilePreferences } from '@/lib/profile';
import type { Profile } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { MotionView, MotionPressable, cardEntrance } from '@/components/motion';
import { MotionDelays } from '@/components/motion/tokens';
import { FadeInDown } from 'react-native-reanimated';

function buildProfileUrl(profile: Profile | null): string | null {
  if (!profile) return null;
  const base =
    process.env.EXPO_PUBLIC_CREATOR_WEB_BASE ||
    (Constants.expoConfig?.extra as any)?.creatorWebBase ||
    (Constants.manifest2 as any)?.extra?.creatorWebBase ||
    'https://www.appauro.com';
  const trimmedBase = base.replace(/\/+$/, '');
  const slug = profile.username || profile.id;
  if (!slug) return null;
  return `${trimmedBase}/${slug}`;
}

function formatProfileUrl(url: string | null): string {
  if (!url) return '';
  // Remove https://www. or https:// or http://www. or http://
  return url.replace(/^https?:\/\/(www\.)?/i, '');
}

export default function ReviewerShareLinkScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [continuing, setContinuing] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const current = await getCurrentProfile();
        setProfile(current);
        // Only update step if not already set to this step or a later step
        const currentStep = current?.preferences?.onboarding_step;
        if (!currentStep || 
            currentStep === 'reviewer_stripe' || 
            currentStep === 'reviewer_share_link' ||
            currentStep === 'completed') {
          // Step is valid, no need to update
        } else {
          // Update to this step if we're coming from an earlier step
          updateProfilePreferences({ onboarding_step: 'reviewer_share_link' }).catch(() => {});
        }
      } catch (error) {
        console.warn('Failed to load profile for share link', error);
        Alert.alert('Error', 'We were not able to load your profile. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const profileUrl = useMemo(() => buildProfileUrl(profile), [profile]);

  const handleCopy = async () => {
    if (!profileUrl || copying) return;
    setCopying(true);
    try {
      await copyToClipboard(profileUrl);
      setCopied(true);
      Alert.alert('Copied!', 'Your profile link is ready to paste into your socials.');
    } catch (error) {
      Alert.alert('Unable to copy', 'Please try again or copy it manually.');
    } finally {
      setCopying(false);
    }
  };

  const handleContinue = async () => {
    if (continuing) return;
    setContinuing(true);
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
          <MotionView entering={FadeInDown.duration(400).delay(MotionDelays.quick)}>
            <Text style={styles.title}>Share Your Profile</Text>
          </MotionView>
          <MotionView entering={FadeInDown.duration(400).delay(MotionDelays.item)}>
            <Text style={styles.description}>
              Your Auro profile link lets people request reviews directly from you. Share it on your socials to start receiving requests.
            </Text>
          </MotionView>

          <MotionView entering={cardEntrance(2)} style={styles.card}>
            <RNView style={styles.linkBox}>
              <Text style={styles.linkText} numberOfLines={1}>
                {loading ? 'Loading...' : (profileUrl ? formatProfileUrl(profileUrl) : "We'll create this once your profile is ready")}
              </Text>
            </RNView>
            <MotionPressable
              style={[styles.copyButton, (!profileUrl || copying) && styles.copyButtonDisabled]}
              onPress={handleCopy}
              disabled={!profileUrl || copying}
            >
              <Ionicons
                name={copied ? 'checkmark-circle' : 'copy-outline'}
                size={18}
                color={Colors.brand.textOnGradient}
              />
              <Text style={styles.copyButtonText}>
                {copied ? 'Link copied!' : 'Copy my profile link'}
              </Text>
            </MotionPressable>
          </MotionView>

          <MotionView entering={cardEntrance(4)}>
            <MotionPressable
              style={[styles.continueButton, continuing && styles.continueButtonDisabled]}
              onPress={handleContinue}
              disabled={continuing}
            >
              <ExpoLinearGradient
                colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
                style={styles.buttonGradient}
              >
                <Text style={styles.continueButtonText}>
                  {continuing ? 'Finishing...' : "I'm ready - take me to my dashboard"}
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
  card: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  linkBox: {
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 111, 0, 0.2)',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  linkText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.brand.textPrimary,
    textAlign: 'center',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: Colors.brand.accentMagenta,
    width: '100%',
  },
  copyButtonDisabled: {
    opacity: 0.5,
  },
  copyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.brand.textOnGradient,
  },
  continueButton: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.brand.textOnGradient,
    fontFamily: 'Poppins_700Bold',
  },
});

