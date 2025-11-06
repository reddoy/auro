import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { updateProfile } from '@/lib/profile';
import type { ProfileLinks } from '@/types';

function normalizeHandle(handle: string): string {
  return handle.trim().replace(/^@/, '');
}

export default function SocialHandlesScreen() {
  const insets = useSafeAreaInsets();
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [saving, setSaving] = useState(false);

  const handleNext = async () => {
    try {
      setSaving(true);
      const links: ProfileLinks = {
        instagram: normalizeHandle(instagram) || null,
        tiktok: normalizeHandle(tiktok) || null,
      };
      await updateProfile({ links });
      router.push('/onboarding/reviewer/bio');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save social handles');
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
        colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
        style={styles.backgroundGradient}
      />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.title}>Add Your Social Handles</Text>
          <Text style={styles.description}>
            Share your Instagram or TikTok handle so reviewees can see your content (optional)
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Instagram Handle</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.handlePrefix}>@</Text>
              <TextInput
                style={styles.input}
                placeholder="yourusername"
                placeholderTextColor={Colors.brand.textSecondary}
                value={instagram}
                onChangeText={setInstagram}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>TikTok Handle</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.handlePrefix}>@</Text>
              <TextInput
                style={styles.input}
                placeholder="yourusername"
                placeholderTextColor={Colors.brand.textSecondary}
                value={tiktok}
                onChangeText={setTiktok}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.nextButton, saving && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={saving}
            activeOpacity={0.8}
          >
            <ExpoLinearGradient
              colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
              style={styles.buttonGradient}
            >
              <Text style={styles.nextButtonText}>
                {saving ? 'Saving...' : 'Next'}
              </Text>
            </ExpoLinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.skipButton}
            onPress={() => router.push('/onboarding/reviewer/bio')}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
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
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.brand.textPrimary,
    marginBottom: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 111, 0, 0.3)',
    paddingHorizontal: 16,
  },
  handlePrefix: {
    fontSize: 18,
    color: Colors.brand.textSecondary,
    marginRight: 4,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.brand.textPrimary,
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
    marginTop: 8,
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
  skipButton: {
    marginTop: 16,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  skipButtonText: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
    fontWeight: '600',
  },
});

