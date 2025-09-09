import React, { useRef, useState } from 'react';
import { Platform, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image, KeyboardAvoidingView, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';

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
        if (error) throw error;
        
        // Check if user has SMS 2FA enabled
        const { data: sms2fa, error: sms2faError } = await supabase
          .from('user_two_factor')
          .select('*')
          .single();

        if (sms2faError && sms2faError.code !== 'PGRST116') {
          throw sms2faError;
        }

        if (sms2fa && sms2fa.enabled) {
          // User has SMS 2FA enabled, send verification code
          const { data: smsData, error: smsError } = await supabase.functions.invoke('send-sms-code', {
            body: {
              phone: sms2fa.phone,
              action: 'verify'
            }
          });
          
          if (smsError) throw smsError;
          
          // Redirect to 2FA verification
          router.replace({
            pathname: '/two-factor-verify',
            params: { phoneNumber: sms2fa.phone }
          });
        } else {
          // No SMS 2FA, proceed normally
          router.replace('/(tabs)/requests');
        }
      } else {
        const origin =
          typeof window !== 'undefined' && (window as any).location?.origin
            ? (window as any).location.origin
            : 'https://yourdomain.com';

        const redirectTo = Platform.select({
          web: `${origin}/auth/callback`,
          default: 'auro://auth/callback',
        });

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name, age: Number(age) || null },
            emailRedirectTo: redirectTo,
          },
        });
        if (error) throw error;
        router.replace({ pathname: '/auth/confirm', params: { email } });
      }
    } catch (err: any) {
      Alert.alert('Auth error', err.message || 'Something went wrong');
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
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={insets.top + 12}>
      <View style={styles.container}>
      <StatusBar style="light" translucent />
      <ExpoLinearGradient
        colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
        style={styles.backgroundGradient}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ flexGrow: 1, justifyContent: isCompact ? 'center' : 'flex-start', paddingBottom: isCompact ? insets.bottom : 0 }}
        bounces={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.select({ ios: 'interactive', default: 'on-drag' })}
        contentInsetAdjustmentBehavior="never"
      >
      <View
        style={[
          styles.headerPlain,
          isCompact && styles.headerPlainCompact,
          { paddingTop: (isCompact ? insets.top * 0.5 : insets.top + 16) },
        ]}
      >
        <View style={styles.headerContent}>
          <Image
            source={require('@/auro_aura_logo.png')}
            style={[styles.logoImage, isCompact && styles.logoImageCompact]}
            resizeMode="contain"
          />
          <Text style={[styles.tagline, isCompact && styles.taglineCompact]}>Your Aura, Amplified</Text>
        </View>
      </View>

      <View style={[
        styles.form,
        isCompact && styles.formCompact,
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
          onPress={isLogin ? handleSubmit : (signupStep === 0 ? handleNextSignupStep : handleSubmit)}
        >
          <ExpoLinearGradient
            colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 28 }}
          />
          <Text style={styles.submitButtonText}>
            {isLogin ? 'Login' : signupStep === 0 ? 'Next' : 'Create Account'}
          </Text>
        </TouchableOpacity>

        {isLogin && !isCompact && (
          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
        )}
      </View>

      {!isCompact && (
        <View style={[styles.footer, { marginBottom: insets.bottom + 6 }]}>
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
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0,
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
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
  headerPlain: {
    paddingBottom: 12,
    backgroundColor: 'transparent',
  },
  headerPlainCompact: {
    paddingBottom: 8,
  },
  headerContent: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    width: '100%',
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
  tagline: {
    fontSize: 22,
    color: Colors.brand.textOnGradient,
    textAlign: 'center',
    opacity: 0.9,
    fontWeight: '500',
    fontFamily: 'Inter_600SemiBold',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  taglineCompact: {
    fontSize: 18,
  },
  form: {
    margin: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 32,
    padding: 36,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
  },
  formCompact: {
    margin: 12,
    padding: 14,
    borderRadius: 20,
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
    color: Colors.brand.background,
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
    color: Colors.brand.background,
    marginBottom: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  labelCompact: {
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(26, 11, 46, 0.15)',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    color: Colors.brand.background,
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
});
