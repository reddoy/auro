import React, { useState } from 'react';
import { StyleSheet, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, useWindowDimensions } from 'react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Text, View } from '@/components/Themed';
import { AuroMark } from '@/components/AuroMark';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import { MotionView, MotionPressable, cardEntrance, subtleFadeIn } from '@/components/motion';
import { MotionDelays } from '@/components/motion/tokens';
import { FadeInDown, ZoomIn } from 'react-native-reanimated';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const isCompact = screenHeight <= 900;

  const handleSubmit = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const origin = typeof window !== 'undefined' && (window as any).location?.origin
        ? (window as any).location.origin
        : 'https://www.appauro.com';

      const redirectTo = Platform.select({
        web: `${origin}/auth/confirm?type=recovery`,
        default: 'auro://auth/confirm?type=recovery',
      });

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (resetError) throw resetError;
      
      setSent(true);
      Alert.alert('Email Sent', 'Check your inbox for password reset instructions.');
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (/security\s*purposes|too\s*many|rate/i.test(msg)) {
        const secMatch = msg.match(/after\s+(\d+)\s*seconds?/i);
        const wait = Number(secMatch?.[1]) || 60;
        Alert.alert('Please wait', `For security purposes, please try again in ${wait} seconds.`);
      } else {
        setError(msg || 'Failed to send reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : Platform.OS === 'android' ? 20 : 0}
    >
      <View style={styles.container}>
        <StatusBar style="light" translucent />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            { 
              height: screenHeight - insets.top - insets.bottom,
              justifyContent: 'center',
              paddingBottom: 0,
              paddingTop: 0
            },
            Platform.OS === 'web' && styles.scrollContentWeb
          ]}
          bounces={false}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.select({ ios: 'interactive', default: 'on-drag' })}
          contentInsetAdjustmentBehavior="never"
          scrollEnabled={false}
        >
          {/* Logo and Brand Name */}
          <MotionView entering={ZoomIn.duration(400).delay(MotionDelays.quick)}>
            <View style={[styles.logoContainer, isCompact && styles.logoContainerCompact, styles.logoContainerOutside]}>
              <AuroMark height={isCompact ? 36 : 44} />
            </View>
          </MotionView>

          <MotionView 
            entering={FadeInDown.duration(400).delay(MotionDelays.item)}
            style={[
              styles.form,
              isCompact && styles.formCompact,
              Platform.OS === 'web' && styles.formWeb,
              { marginBottom: isCompact ? 8 : (16 + insets.bottom) },
            ]}
          >
            {!sent ? (
              <>
                <MotionView entering={cardEntrance(1)}>
                  <TouchableOpacity 
                    style={styles.backButton} 
                    onPress={() => router.back()}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent' }}>
                      <Ionicons name="arrow-back" size={20} color={Colors.brand.accentMagenta} />
                      <Text style={styles.backButtonText}>Back</Text>
                    </View>
                  </TouchableOpacity>
                </MotionView>

                <MotionView entering={cardEntrance(2)}>
                  <Text style={[styles.title, isCompact && styles.titleCompact]}>Reset Password</Text>
                  <Text style={[styles.subtitle, isCompact && styles.subtitleCompact]}>
                    Enter your email address and we'll send you instructions to reset your password.
                  </Text>
                </MotionView>

                <MotionView entering={cardEntrance(3)} style={[styles.inputGroup, isCompact && styles.inputGroupCompact]}>
                  <Text style={[styles.label, isCompact && styles.labelCompact]}>Email</Text>
                  <TextInput
                    style={[styles.input, isCompact && styles.inputCompact, error && styles.inputError]}
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setError('');
                    }}
                    placeholder="Enter your email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!loading}
                    autoFocus={Platform.OS !== 'web'}
                  />
                  {error && (
                    <Text style={styles.errorText}>{error}</Text>
                  )}
                </MotionView>

                <MotionView entering={cardEntrance(4)}>
                  <MotionPressable
                    style={[styles.submitButton, isCompact && styles.submitButtonCompact, loading && styles.submitButtonDisabled]}
                    disabled={loading}
                    onPress={handleSubmit}
                  >
                    <ExpoLinearGradient
                      colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 28 }}
                    />
                    <Text style={styles.submitButtonText}>
                      {loading ? 'Sending...' : 'Send Reset Link'}
                    </Text>
                  </MotionPressable>
                </MotionView>
              </>
            ) : (
              <>
                <MotionView entering={cardEntrance(1)} style={styles.successContainer}>
                  <View style={styles.successIconContainer}>
                    <Ionicons name="checkmark-circle" size={64} color={Colors.brand.success} />
                  </View>
                  <Text style={[styles.title, isCompact && styles.titleCompact]}>Check your email</Text>
                  <Text style={[styles.subtitle, isCompact && styles.subtitleCompact]}>
                    We've sent a password reset link to{' '}
                    <Text style={styles.emailHighlight}>{email}</Text>. 
                    Click the link in the email to reset your password.
                  </Text>
                </MotionView>

                <MotionView entering={cardEntrance(2)}>
                  <MotionPressable
                    style={[styles.submitButton, isCompact && styles.submitButtonCompact]}
                    onPress={() => router.back()}
                  >
                    <ExpoLinearGradient
                      colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 28 }}
                    />
                    <Text style={styles.submitButtonText}>Back to Sign In</Text>
                  </MotionPressable>
                </MotionView>
              </>
            )}
          </MotionView>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.brand.background,
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContentWeb: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    backgroundColor: 'transparent',
  },
  logoContainerCompact: {
    marginBottom: 20,
  },
  logoContainerOutside: {
    marginBottom: 24,
    marginTop: Platform.OS === 'web' ? 0 : 20,
    paddingHorizontal: Platform.OS === 'web' ? 0 : 28,
  },
  logoImage: {
    width: 48,
    height: 48,
    marginRight: 12,
  },
  logoImageCompact: {
    width: 40,
    height: 40,
    marginRight: 10,
  },
  brandText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins_700Bold',
  },
  brandTextCompact: {
    fontSize: 28,
  },
  form: {
    margin: 28,
    backgroundColor: 'rgba(42, 27, 61, 0.95)',
    borderRadius: 32,
    padding: 36,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 111, 0, 0.2)',
    overflow: 'hidden',
  },
  formCompact: {
    margin: 12,
    padding: 14,
    borderRadius: 20,
  },
  formWeb: {
    maxWidth: 480,
    alignSelf: 'center',
    marginHorizontal: 'auto' as any,
    width: '100%',
    marginVertical: 40,
    paddingHorizontal: 48,
    paddingVertical: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.35,
    shadowRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 111, 0, 0.25)',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    backgroundColor: 'transparent',
    paddingVertical: 4,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    color: Colors.brand.accentMagenta,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: 'Poppins_700Bold',
  },
  titleCompact: {
    fontSize: 24,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  subtitleCompact: {
    fontSize: 14,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  inputGroupCompact: {
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.brand.textOnGradient,
    marginBottom: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  labelCompact: {
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255, 111, 0, 0.3)',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: Colors.brand.textOnGradient,
    shadowColor: Colors.brand.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputCompact: {
    paddingVertical: 12,
  },
  inputError: {
    borderColor: '#ff4444',
    borderWidth: 1.5,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 6,
  },
  submitButton: {
    backgroundColor: Colors.brand.accentMagenta,
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: Colors.brand.accentMagenta,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  submitButtonCompact: {
    paddingVertical: 14,
    borderRadius: 22,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: Colors.brand.textOnGradient,
    fontSize: 17,
    fontWeight: 'bold',
    fontFamily: 'Inter_600SemiBold',
    zIndex: 1,
  },
  successContainer: {
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(61, 220, 132, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emailHighlight: {
    color: Colors.brand.textPrimary,
    fontWeight: '600',
  },
});

