import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, View as RNView } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import AvatarUploader from '@/components/AvatarUploader';
import { updateProfile, updateProfilePreferences, getCurrentProfile, getSignedAvatarUrl } from '@/lib/profile';
import { MotionView, MotionPressable, cardEntrance } from '@/components/motion';
import { MotionDelays } from '@/components/motion/tokens';
import { FadeInDown, ZoomIn } from 'react-native-reanimated';
import Spinner from '@/components/Spinner';

export default function ProfilePictureScreen() {
  const insets = useSafeAreaInsets();
  const [avatarUri, setAvatarUri] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasExistingAvatar, setHasExistingAvatar] = useState(false);
  const [existingAvatarPath, setExistingAvatarPath] = useState<string | null>(null);

  // Load existing profile picture on mount
  useEffect(() => {
    const loadExistingProfile = async () => {
      try {
        const profile = await getCurrentProfile();
        if (profile?.avatar_url) {
          setHasExistingAvatar(true);
          setExistingAvatarPath(profile.avatar_url);
          // Try to get a signed URL for display
          try {
            const signedUrl = await getSignedAvatarUrl(profile.avatar_url, 60 * 60 * 24 * 30);
            if (signedUrl) {
              setAvatarUri(signedUrl);
              setAvatarPath(profile.avatar_url);
            }
          } catch (e) {
            console.warn('Failed to get signed avatar URL:', e);
          }
        }
      } catch (e: any) {
        console.error('Failed to load profile:', e);
      } finally {
        setLoading(false);
      }
    };
    loadExistingProfile();
  }, []);

  const handleNext = async () => {
    // If they have an existing avatar, they can proceed (even if they haven't changed it)
    // If they don't have an existing avatar, they must upload one
    if (!hasExistingAvatar && !avatarUri && !avatarPath) {
      Alert.alert('Profile Picture Required', 'Please add a profile picture to continue.');
      return;
    }

    try {
      setUploading(true);
      // If they uploaded a new avatar, save it
      // If they have an existing avatar and didn't change it, we don't need to update
      if (avatarPath && avatarPath !== existingAvatarPath) {
        await updateProfile({ avatar_url: avatarPath });
      }
      await updateProfilePreferences({ onboarding_step: 'reviewer_stripe' });
      router.replace('/onboarding/reviewer/stripe');
    } catch (e: any) {
      const message = e?.message || 'Failed to save profile picture';
      if (message.toLowerCase().includes('not signed in') || message.toLowerCase().includes('not authenticated')) {
        router.replace('/auth');
        return;
      }
      Alert.alert('Error', message);
    } finally {
      setUploading(false);
    }
  };

  const handleUploaded = ({ publicUrl, path }: { publicUrl: string; path: string }) => {
    setAvatarUri(publicUrl);
    setAvatarPath(path);
  };

  const handleKeepCurrent = async () => {
    try {
      setUploading(true);
      await updateProfilePreferences({ onboarding_step: 'reviewer_stripe' });
      router.replace('/onboarding/reviewer/stripe');
    } catch (e: any) {
      const message = e?.message || 'Failed to continue';
      if (message.toLowerCase().includes('not signed in') || message.toLowerCase().includes('not authenticated')) {
        router.replace('/auth');
        return;
      }
      Alert.alert('Error', message);
    } finally {
      setUploading(false);
    }
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
        <View style={styles.content} lightColor="transparent" darkColor="transparent">
          <MotionView entering={FadeInDown.duration(400).delay(MotionDelays.quick)}>
            <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              {hasExistingAvatar ? 'Your Profile Picture' : 'Set Your Profile Picture'}
            </Text>
          </MotionView>
          <MotionView entering={FadeInDown.duration(400).delay(MotionDelays.item)}>
            <Text style={styles.description}>
              {hasExistingAvatar 
                ? "Here's your current profile picture. Would you like to change it?"
                : "Add a profile picture so reviewees can see who they're working with"}
            </Text>
          </MotionView>

          <MotionView entering={ZoomIn.duration(500).delay(MotionDelays.item * 2)}>
            <RNView style={styles.avatarContainerWrapper}>
              <RNView style={styles.avatarContainer}>
                <AvatarUploader
                  uri={avatarUri}
                  previousPathOrUrl={existingAvatarPath}
                  onUploaded={handleUploaded}
                  onRemoved={() => {
                    setAvatarUri(undefined);
                    setAvatarPath(null);
                    // If they removed it and had an existing one, reset to existing
                    if (hasExistingAvatar && existingAvatarPath) {
                      getSignedAvatarUrl(existingAvatarPath, 60 * 60 * 24 * 30).then(url => {
                        if (url) {
                          setAvatarUri(url);
                          setAvatarPath(existingAvatarPath);
                        }
                      }).catch(() => {});
                    }
                  }}
                  size={160}
                  accessibilityLabel="Upload profile picture"
                />
              </RNView>
            </RNView>
          </MotionView>

          {hasExistingAvatar && (
            <MotionView entering={cardEntrance(2.5)}>
              <MotionPressable 
                style={[styles.skipButton, uploading && styles.skipButtonDisabled]}
                onPress={handleKeepCurrent}
                disabled={uploading}
              >
                <Text style={styles.skipButtonText}>
                  Keep Current Picture
                </Text>
              </MotionPressable>
            </MotionView>
          )}

          <MotionView entering={cardEntrance(3)}>
            <MotionPressable 
              style={[styles.nextButton, uploading && styles.nextButtonDisabled]}
              onPress={handleNext}
              disabled={uploading}
            >
              <ExpoLinearGradient
                colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
                style={styles.buttonGradient}
              >
                <Text style={styles.nextButtonText}>
                  {uploading ? 'Saving...' : hasExistingAvatar ? 'Save Changes' : 'Next'}
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
    marginBottom: 40,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  avatarContainerWrapper: {
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent', // Explicitly transparent
  },
  avatarContainer: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 92, // Half of 184 (160 size + 12 padding * 2)
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 111, 0, 0.25)',
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  nextButton: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.brand.textOnGradient,
    fontFamily: 'Poppins_700Bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.brand.background,
  },
  skipButton: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.brand.accentOrange,
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 12,
  },
  skipButtonDisabled: {
    opacity: 0.6,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.brand.accentOrange,
    fontFamily: 'Poppins_600SemiBold',
  },
});

