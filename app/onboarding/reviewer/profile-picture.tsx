import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, View as RNView } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import AvatarUploader from '@/components/AvatarUploader';
import { updateProfile, updateProfilePreferences } from '@/lib/profile';
import { MotionView, MotionPressable, cardEntrance } from '@/components/motion';
import { MotionDelays } from '@/components/motion/tokens';
import { FadeInDown, ZoomIn } from 'react-native-reanimated';

export default function ProfilePictureScreen() {
  const insets = useSafeAreaInsets();
  const [avatarUri, setAvatarUri] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const [avatarPath, setAvatarPath] = useState<string | null>(null);

  const handleNext = async () => {
    if (!avatarUri && !avatarPath) {
      Alert.alert('Profile Picture Required', 'Please add a profile picture to continue.');
      return;
    }

    try {
      setUploading(true);
      // If we have an avatar, ensure it's saved to profile
      if (avatarPath) {
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
            <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              Set Your Profile Picture
            </Text>
          </MotionView>
          <MotionView entering={FadeInDown.duration(400).delay(MotionDelays.item)}>
            <Text style={styles.description}>
              Add a profile picture so reviewees can see who they're working with
            </Text>
          </MotionView>

          <MotionView entering={ZoomIn.duration(500).delay(MotionDelays.item * 2)}>
            <RNView style={styles.avatarContainerWrapper}>
              <RNView style={styles.avatarContainer}>
                <AvatarUploader
                  uri={avatarUri}
                  previousPathOrUrl={null}
                  onUploaded={handleUploaded}
                  onRemoved={() => {
                    setAvatarUri(undefined);
                    setAvatarPath(null);
                  }}
                  size={160}
                  accessibilityLabel="Upload profile picture"
                />
              </RNView>
            </RNView>
          </MotionView>

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
                  {uploading ? 'Saving...' : 'Next'}
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
    backgroundColor: 'rgba(255, 0, 0, 0.2)', // RED - scroll content
  },
  content: {
    backgroundColor: 'rgba(0, 255, 0, 0.2)', // GREEN - content wrapper
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
});

