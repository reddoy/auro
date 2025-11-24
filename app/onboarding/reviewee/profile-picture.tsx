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

export default function RevieweeProfilePictureScreen() {
  const insets = useSafeAreaInsets();
  const [avatarUri, setAvatarUri] = useState<string | undefined>();
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleNext = async () => {
    if (!avatarPath) {
      Alert.alert('Add a photo', 'Upload a photo so reviewers know who they are helping.');
      return;
    }
    try {
      setUploading(true);
      await updateProfile({ avatar_url: avatarPath });
      await updateProfilePreferences({
        onboarding_step: 'discover_reviewers',
        onboarding_role: 'reviewee',
        onboarding_completed: false,
      });
      router.replace('/onboarding/discover-reviewers');
    } catch (error: any) {
      const message = error?.message || 'We were not able to save your photo. Please try again.';
      if (message.toLowerCase().includes('not signed in') || message.toLowerCase().includes('not authenticated')) {
        router.replace('/auth');
        return;
      }
      Alert.alert('Error', message);
    } finally {
      setUploading(false);
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
        <View style={styles.content} lightColor="transparent" darkColor="transparent">
          <MotionView entering={FadeInDown.duration(400).delay(MotionDelays.quick)}>
            <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              Set Your Profile Picture
            </Text>
          </MotionView>
          <MotionView entering={FadeInDown.duration(400).delay(MotionDelays.item)}>
            <Text style={styles.description} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
              Reviewer or reviewee, everyone likes a face to a name.
            </Text>
          </MotionView>

          <MotionView entering={ZoomIn.duration(500).delay(MotionDelays.item * 2)}>
            <RNView style={styles.avatarContainer}>
              <AvatarUploader
                uri={avatarUri}
                previousPathOrUrl={null}
                onUploaded={({ publicUrl, path }) => {
                  setAvatarUri(publicUrl);
                  setAvatarPath(path);
                }}
                onRemoved={() => {
                  setAvatarUri(undefined);
                  setAvatarPath(null);
                }}
                size={160}
                accessibilityLabel="Upload profile photo"
              />
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
                  {uploading ? 'Saving...' : 'Continue'}
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
    fontSize: 15,
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 12,
    lineHeight: 22,
    numberOfLines: 1,
  },
  avatarContainer: {
    marginBottom: 40,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
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

