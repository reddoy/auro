import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
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
      } catch (error) {
        console.warn('Failed to load profile for share link', error);
        Alert.alert('Error', 'We were not able to load your profile. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    run();
    updateProfilePreferences({ onboarding_step: 'reviewer_share_link' }).catch(() => {});
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
          <Text style={styles.title}>Share Your Profile</Text>
          <Text style={styles.description}>
            Your Auro profile link lets people request reviews directly from you. Share it on your socials to start receiving requests.
          </Text>

          <View style={styles.card}>
            <View style={styles.iconRow}>
              <Ionicons name="link" size={22} color={Colors.brand.accentOrange} />
              <Text style={styles.cardTitle}>Your unique link</Text>
            </View>
            <View style={styles.linkBox}>
              <Text style={styles.linkText} numberOfLines={1}>
                {loading ? 'Loading…' : profileUrl || 'We’ll create this once your profile is ready'}
              </Text>
            </View>
            <Text style={styles.cardHint}>
              Copy it and drop it on LinkTree, Instagram bio, Twitter, or wherever your audience hangs out.
            </Text>
            <TouchableOpacity
              style={[styles.copyButton, (!profileUrl || copying) && styles.copyButtonDisabled]}
              onPress={handleCopy}
              disabled={!profileUrl || copying}
              activeOpacity={0.85}
            >
              <Ionicons
                name={copied ? 'checkmark-circle' : 'copy-outline'}
                size={18}
                color={Colors.brand.textOnGradient}
              />
              <Text style={styles.copyButtonText}>
                {copied ? 'Link copied!' : 'Copy my profile link'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>Quick boost tips</Text>
            <View style={styles.tipRow}>
              <Ionicons name="sparkles" size={18} color={Colors.brand.accentMagenta} />
              <Text style={styles.tipText}>Pin your link to TikTok and IG highlights</Text>
            </View>
            <View style={styles.tipRow}>
              <Ionicons name="paper-plane" size={18} color={Colors.brand.accentMagenta} />
              <Text style={styles.tipText}>Send it to past clients to spark repeat requests</Text>
            </View>
            <View style={styles.tipRow}>
              <Ionicons name="megaphone" size={18} color={Colors.brand.accentMagenta} />
              <Text style={styles.tipText}>Share with group chats to get your first reviews fast</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.continueButton, continuing && styles.continueButtonDisabled]}
            onPress={handleContinue}
            disabled={continuing}
            activeOpacity={0.85}
          >
            <ExpoLinearGradient
              colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
              style={styles.buttonGradient}
            >
              <Text style={styles.continueButtonText}>
                {continuing ? 'Finishing...' : 'I’m ready – take me to my dashboard'}
              </Text>
            </ExpoLinearGradient>
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
    paddingHorizontal: 12,
  },
  card: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 111, 0, 0.18)',
    marginBottom: 24,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
  },
  linkBox: {
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 111, 0, 0.2)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  linkText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.brand.textPrimary,
  },
  cardHint: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
    paddingVertical: 12,
    backgroundColor: Colors.brand.accentMagenta,
  },
  copyButtonDisabled: {
    opacity: 0.5,
  },
  copyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.brand.textOnGradient,
  },
  tipsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 111, 0, 0.12)',
    marginBottom: 32,
    gap: 12,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tipText: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    flex: 1,
    lineHeight: 20,
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

