import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { updateProfile, updateProfilePreferences } from '@/lib/profile';
import { MotionView, MotionPressable, cardEntrance } from '@/components/motion';
import { MotionDelays } from '@/components/motion/tokens';
import { FadeInDown } from 'react-native-reanimated';

export default function BioScreen() {
  const insets = useSafeAreaInsets();
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);

  const handleNext = async () => {
    if (!bio.trim()) {
      Alert.alert('Bio Required', 'Please tell reviewees about your review style.');
      return;
    }

    try {
      setSaving(true);
      await updateProfile({ bio: bio.trim() });
      await updateProfilePreferences({ onboarding_step: 'reviewer_rate' });
      router.replace('/onboarding/reviewer/rate');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save bio');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ExpoLinearGradient
        colors={[Colors.brand.background, Colors.brand.cardBackground]}
        style={styles.backgroundGradient}
      />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <MotionView entering={FadeInDown.duration(400).delay(MotionDelays.quick)}>
            <Text style={styles.title}>Tell Us About Your Reviews</Text>
          </MotionView>
          <MotionView entering={FadeInDown.duration(400).delay(MotionDelays.item)}>
            <Text style={styles.description}>
              Write a bio so reviewees can know what your reviews are like. What makes your reviews unique?
            </Text>
          </MotionView>

          <MotionView entering={cardEntrance(2)} style={styles.inputContainer}>
            <TextInput
              style={styles.textArea}
              placeholder="Describe your review style, what you focus on, and what makes you a great reviewer..."
              placeholderTextColor={Colors.brand.textSecondary}
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.charCount}>{bio.length}/500</Text>
          </MotionView>

          <MotionView entering={cardEntrance(3)}>
            <MotionPressable 
              style={[styles.nextButton, saving && styles.nextButtonDisabled]}
              onPress={handleNext}
              disabled={saving}
            >
              <ExpoLinearGradient
                colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
                style={styles.buttonGradient}
              >
                <Text style={styles.nextButtonText}>
                  {saving ? 'Saving...' : 'Next'}
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
  inputContainer: {
    marginBottom: 32,
  },
  textArea: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: Colors.brand.textPrimary,
    minHeight: 150,
    borderWidth: 1,
    borderColor: 'rgba(255, 111, 0, 0.3)',
    marginBottom: 8,
  },
  charCount: {
    fontSize: 12,
    color: Colors.brand.textSecondary,
    textAlign: 'right',
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


