import React, { useRef, useState } from 'react';
import { Platform, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image, KeyboardAvoidingView, useWindowDimensions } from 'react-native';
import { supabase } from '@/lib/supabase';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { AntDesign } from '@expo/vector-icons';

import { Text, View } from '@/components/Themed';
import { useLocalSearchParams, router } from 'expo-router';
import Colors from '@/constants/Colors';
import { ensureProfileForCurrentUser } from '@/lib/api';

WebBrowser.maybeCompleteAuthSession();

// Google Logo SVG Component
function GoogleLogo() {
  const Svg = require('react-native-svg').Svg;
  const Path = require('react-native-svg').Path;
  
  return (
    <Svg width="20" height="20" viewBox="0 0 48 48">
      <Path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <Path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
      <Path fill="none" d="M0 0h48v48H0z" />
    </Svg>
  );
}

// Password requirement component
function PasswordRequirement({ met, text }: { met: boolean; text: string }) {
  return (
    <View style={styles.passwordReqItem}>
      <Text style={[styles.passwordReqIcon, met && styles.passwordReqMet]}>
        {met ? '✓' : '○'}
      </Text>
      <Text style={[styles.passwordReqText, met && styles.passwordReqMet]}>
        {text}
      </Text>
    </View>
  );
}

export default function AuthScreen() {
  const { linked } = useLocalSearchParams<{ linked?: string }>();
  React.useEffect(() => {
    if (linked === '1') {
      // If we were deep-linked back after social linking, just pop to profile
      setTimeout(() => router.replace('/(tabs)/profile'), 300);
    }
  }, [linked]);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const isCompact = screenHeight <= 900; // Ensure iPhone 15 (852pt) is compact
  const isUltraCompact = screenHeight <= 780;
  const [signupStep, setSignupStep] = useState(0);
  const [cooldownSec, setCooldownSec] = useState(0);
  React.useEffect(() => {
    if (cooldownSec <= 0) return;
    const t = setInterval(() => setCooldownSec((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldownSec]);

  const nameRef = useRef<any>(null);
  const ageRef = useRef<any>(null);
  const emailRef = useRef<any>(null);
  const passwordRef = useRef<any>(null);
  const confirmPasswordRef = useRef<any>(null);

  const validatePassword = (pwd: string) => {
    const requirements = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /\d/.test(pwd),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd)
    };
    return requirements;
  };

  const isPasswordValid = (pwd: string) => {
    const reqs = validatePassword(pwd);
    return reqs.length && reqs.uppercase && reqs.lowercase && reqs.number && reqs.special;
  };

  const [isGoogleHovered, setIsGoogleHovered] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      // For web, use the actual web URL; for native, use custom scheme
      const redirectTo = Platform.OS === 'web'
        ? typeof window !== 'undefined' && window.location.origin
          ? `${window.location.origin}/auth/callback`
          : 'https://app.appauro.com/auth/callback'
        : makeRedirectUri({
            scheme: 'auro',
            path: 'auth/callback',
          });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: Platform.OS !== 'web',
        },
      });

      if (error) throw error;

      if (Platform.OS !== 'web' && data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectTo
        );

        if (result.type === 'success') {
          const url = result.url;
          const params = new URL(url).searchParams;
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');

          if (access_token && refresh_token) {
            await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            try { await ensureProfileForCurrentUser(); } catch {}
            router.replace('/(tabs)/requests');
          }
        }
      }
      // For web, the redirect happens automatically via Supabase
    } catch (err: any) {
      Alert.alert('Google Sign-In Error', err?.message || 'Failed to sign in with Google');
    }
  };

  const handleSubmit = async () => {
    if (!email || !password || (!isLogin && (!name || !age))) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Password validation for signup
    if (!isLogin) {
      if (!isPasswordValid(password)) {
        Alert.alert('Password Requirements', 
          'Password must include:\n• At least 8 characters\n• One uppercase letter\n• One lowercase letter\n• One number\n• One special character');
        return;
      }
      
      if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }
    }

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          const message = String((error as any)?.message || '');
          const status = (error as any)?.status;
          if (status === 400 || /confirm/i.test(message)) {
            if (/confirm/i.test(message) || /not\s*confirmed/i.test(message)) {
              router.replace({ pathname: '/auth/confirm', params: { email } });
              return;
            }
          }
          throw error;
        }

        try { await ensureProfileForCurrentUser(); } catch {}
        // Proceed directly to app after successful login (email-only auth)
        router.replace('/(tabs)/requests');
      } else {
        const origin =
          typeof window !== 'undefined' && (window as any).location?.origin
            ? (window as any).location.origin
            : 'https://yourdomain.com';

        const redirectTo = Platform.select({
          web: `${origin}/auth/callback`,
          default: 'auro://auth/callback',
        });

        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name, age: Number(age) || null },
            emailRedirectTo: redirectTo,
          },
        });
        if (error) throw error;
        try { await ensureProfileForCurrentUser(); } catch {}
        router.replace({ pathname: '/auth/confirm', params: { email } });
      }
    } catch (err: any) {
      const msg = String(err?.message || '');
      const secMatch = msg.match(/after\s+(\d+)\s*seconds?/i);
      if (/security\s*purposes|too\s*many|rate/i.test(msg)) {
        const wait = Number(secMatch?.[1]) || 60;
        setCooldownSec(wait);
        Alert.alert('Please wait', `For security purposes, please try again in ${wait} seconds.`);
        return;
      }
      Alert.alert('Auth error', msg || 'Something went wrong');
    }
  };

  const handleNextSignupStep = () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please enter your email and both passwords');
      return;
    }

    if (!isPasswordValid(password)) {
      Alert.alert('Password Requirements', 
        'Password must include:\n• At least 8 characters\n• One uppercase letter\n• One lowercase letter\n• One number\n• One special character');
      return;
    }
    
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setSignupStep(1);
    requestAnimationFrame(() => {
      nameRef.current?.focus?.();
    });
  };

  const handleBackSignupStep = () => {
    setSignupStep(0);
    requestAnimationFrame(() => {
      emailRef.current?.focus?.();
    });
  };

  const shouldShowEmailPassword = isLogin || (!isLogin && signupStep === 0);
  const shouldShowNameAge = !isLogin && signupStep === 1;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={12}>
      <View style={styles.container}>
      <StatusBar style="light" translucent />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          { 
            flexGrow: 1, 
            justifyContent: 'center', 
            paddingBottom: isCompact ? insets.bottom : 0 
          },
          Platform.OS === 'web' && styles.scrollContentWeb
        ]}
        bounces={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.select({ ios: 'interactive', default: 'on-drag' })}
        contentInsetAdjustmentBehavior="never"
      >

      <View style={[
        styles.form,
        isCompact && styles.formCompact,
        Platform.OS === 'web' && styles.formWeb,
        { marginBottom: isCompact ? 8 : (16 + insets.bottom) },
      ] }>
        <View style={[styles.toggleContainer, isCompact && styles.toggleContainerCompact]}>
          <TouchableOpacity
            style={[styles.toggleButton, isLogin && styles.activeToggle]}
            onPress={() => { setIsLogin(true); setSignupStep(0); }}
          >
            <Text style={[styles.toggleText, isLogin && styles.activeToggleText]}>
              Login
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, !isLogin && styles.activeToggle]}
            onPress={() => { setIsLogin(false); setSignupStep(0); }}
          >
            <Text style={[styles.toggleText, !isLogin && styles.activeToggleText]}>
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>

        {shouldShowNameAge && (
          <>
            <TouchableOpacity style={styles.backButton} onPress={handleBackSignupStep}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            <View style={[styles.inputGroup, isCompact && styles.inputGroupCompact]}>
              {!isUltraCompact && (
                <Text style={[styles.label, isCompact && styles.labelCompact]}>Full Name</Text>
              )}
              <TextInput
                style={[styles.input, isCompact && styles.inputCompact]}
                value={name}
                onChangeText={setName}
                placeholder={isUltraCompact ? 'Full Name' : 'Enter your full name'}
                autoCapitalize="words"
                ref={nameRef}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => ageRef.current?.focus()}
              />
            </View>

            <View style={[styles.inputGroup, isCompact && styles.inputGroupCompact]}>
              {!isUltraCompact && (
                <Text style={[styles.label, isCompact && styles.labelCompact]}>Age</Text>
              )}
              <TextInput
                style={[styles.input, isCompact && styles.inputCompact]}
                value={age}
                onChangeText={setAge}
                placeholder={isUltraCompact ? 'Age' : 'Enter your age'}
                keyboardType="numeric"
                ref={ageRef}
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={handleSubmit}
              />
            </View>
          </>
        )}

        {shouldShowEmailPassword && (
          <>
            <View style={[styles.inputGroup, isCompact && styles.inputGroupCompact]}>
              {!isUltraCompact && (
                <Text style={[styles.label, isCompact && styles.labelCompact]}>Email</Text>
              )}
              <TextInput
                style={[styles.input, isCompact && styles.inputCompact]}
                value={email}
                onChangeText={setEmail}
                placeholder={isUltraCompact ? 'Email' : 'Enter your email'}
                keyboardType="email-address"
                autoCapitalize="none"
                ref={emailRef}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>

            <View style={[styles.inputGroup, isCompact && styles.inputGroupCompact]}>
              {!isUltraCompact && (
                <Text style={[styles.label, isCompact && styles.labelCompact]}>Password</Text>
              )}
              <TextInput
                style={[styles.input, isCompact && styles.inputCompact]}
                value={password}
                onChangeText={setPassword}
                placeholder={isUltraCompact ? 'Password' : 'Enter your password'}
                secureTextEntry
                ref={passwordRef}
                returnKeyType={isLogin ? 'go' : 'next'}
                blurOnSubmit={isLogin}
                onSubmitEditing={isLogin ? handleSubmit : () => confirmPasswordRef.current?.focus()}
              />
              {!isLogin && password.length > 0 && (
                <View style={styles.passwordRequirements}>
                  <PasswordRequirement met={validatePassword(password).length} text="8+ characters" />
                  <PasswordRequirement met={validatePassword(password).uppercase} text="Uppercase letter" />
                  <PasswordRequirement met={validatePassword(password).lowercase} text="Lowercase letter" />
                  <PasswordRequirement met={validatePassword(password).number} text="Number" />
                  <PasswordRequirement met={validatePassword(password).special} text="Special character" />
                </View>
              )}
            </View>

            {!isLogin && (
              <View style={[styles.inputGroup, isCompact && styles.inputGroupCompact]}>
                {!isUltraCompact && (
                  <Text style={[styles.label, isCompact && styles.labelCompact]}>Confirm Password</Text>
                )}
                <TextInput
                  style={[styles.input, isCompact && styles.inputCompact]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder={isUltraCompact ? 'Confirm Password' : 'Confirm your password'}
                  secureTextEntry
                  ref={confirmPasswordRef}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={handleNextSignupStep}
                />
                {confirmPassword.length > 0 && (
                  <View style={styles.passwordMatch}>
                    <Text style={[styles.passwordMatchText, password === confirmPassword && styles.passwordMatchSuccess]}>
                      {password === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </>
        )}

        <TouchableOpacity
          style={[styles.submitButton, isCompact && styles.submitButtonCompact]}
          disabled={!isLogin && cooldownSec > 0}
          onPress={isLogin ? handleSubmit : (signupStep === 0 ? handleNextSignupStep : handleSubmit)}
        >
          <ExpoLinearGradient
            colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 28 }}
          />
          <Text style={styles.submitButtonText}>
            {isLogin ? 'Login' : signupStep === 0 ? 'Next' : (cooldownSec > 0 ? `Create Account (${cooldownSec}s)` : 'Create Account')}
          </Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={[styles.divider, isCompact && styles.dividerCompact]}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Google Sign In Button */}
        <TouchableOpacity
          style={[
            styles.googleButton, 
            isCompact && styles.googleButtonCompact,
            isGoogleHovered && Platform.OS === 'web' && styles.googleButtonHover
          ]}
          onPress={handleGoogleSignIn}
          {...(Platform.OS === 'web' && {
            onMouseEnter: () => setIsGoogleHovered(true),
            onMouseLeave: () => setIsGoogleHovered(false),
          } as any)}
        >
          <View style={styles.googleIconContainer}>
            <GoogleLogo />
          </View>
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        {isLogin && !isCompact && (
          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
        )}
      </View>

      {!isCompact && (
        <View style={[styles.footer, Platform.OS === 'web' && styles.footerWeb, { marginBottom: insets.bottom + 6 }]}>
          <Text style={styles.footerText}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      )}
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
  header: {
    paddingTop: 80,
    paddingBottom: 56,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  headerCompact: {
    paddingTop: 28,
    paddingBottom: 12,
  },
  logoImage: {
    width: 260,
    height: 104,
    marginBottom: 20,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  logoImageCompact: {
    width: 180,
    height: 72,
    marginBottom: 10,
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
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(26, 11, 46, 0.08)',
    borderRadius: 28,
    marginBottom: 36,
    padding: 6,
    shadowColor: Colors.brand.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  toggleContainerCompact: {
    marginBottom: 12,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 22,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0,
    shadowRadius: 4,
    elevation: 0,
  },
  activeToggle: {
    backgroundColor: Colors.brand.accentMagenta,
    shadowOpacity: 0.2,
    elevation: 4,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.brand.textSecondary,
    fontFamily: 'Inter_600SemiBold',
  },
  activeToggleText: {
    color: Colors.brand.textOnGradient,
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
  },
  submitButtonCompact: {
    paddingVertical: 14,
    borderRadius: 22,
  },
  submitButtonText: {
    color: Colors.brand.textOnGradient,
    fontSize: 17,
    fontWeight: 'bold',
    fontFamily: 'Inter_600SemiBold',
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: 'transparent',
  },
  forgotPasswordText: {
    color: Colors.brand.accentMagenta,
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    margin: 20,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  footerCompact: {
    margin: 8,
  },
  footerWeb: {
    maxWidth: 480,
    alignSelf: 'center',
    marginHorizontal: 'auto' as any,
    width: '100%',
  },
  footerText: {
    fontSize: 12,
    color: Colors.brand.textLight,
    textAlign: 'center',
    lineHeight: 18,
  },
  footerTextCompact: {
    fontSize: 11,
    lineHeight: 16,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    backgroundColor: 'transparent',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  backButtonText: {
    color: Colors.brand.accentMagenta,
    fontSize: 14,
    fontWeight: '600',
  },
  passwordRequirements: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(26, 11, 46, 0.05)',
    borderRadius: 12,
  },
  passwordReqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  passwordReqIcon: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
    width: 16,
  },
  passwordReqText: {
    fontSize: 12,
    color: '#666',
  },
  passwordReqMet: {
    color: Colors.brand.success,
  },
  passwordMatch: {
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  passwordMatchText: {
    fontSize: 12,
    color: '#ff4444',
  },
  passwordMatchSuccess: {
    color: Colors.brand.success,
  },
  // Google sign-in styles
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    backgroundColor: 'transparent',
  },
  dividerCompact: {
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 111, 0, 0.2)',
  },
  dividerText: {
    color: Colors.brand.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    marginHorizontal: 16,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#DADCE0',
    cursor: 'pointer' as any,
    transition: 'all 0.2s ease' as any,
  },
  googleButtonCompact: {
    paddingVertical: 12,
    borderRadius: 6,
  },
  googleButtonHover: {
    backgroundColor: '#F8F9FA',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    borderColor: '#C6C9CC',
  },
  googleIconContainer: {
    marginRight: 12,
    backgroundColor: 'transparent',
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    color: '#3C4043',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto-Medium',
      default: 'Inter_600SemiBold',
    }),
    letterSpacing: 0.25,
  },
});
