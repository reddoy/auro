import React, { useRef, useState } from 'react';
import { Platform, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image, KeyboardAvoidingView, useWindowDimensions, Modal, Animated } from 'react-native';
import { supabase } from '@/lib/supabase';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { AntDesign, MaterialIcons, Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { Text, View } from '@/components/Themed';
import { useLocalSearchParams, router } from 'expo-router';
import Colors from '@/constants/Colors';
import { ensureProfileForCurrentUser } from '@/lib/api';
import { getCurrentProfile, resolveOnboardingDestination } from '@/lib/profile';
import { MotionView, MotionPressable, cardEntrance, subtleFadeIn } from '@/components/motion';
import { MotionDelays } from '@/components/motion/tokens';
import { FadeInDown, ZoomIn } from 'react-native-reanimated';

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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [phone, setPhone] = useState('');
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const isCompact = screenHeight <= 900; // Ensure iPhone 15 (852pt) is compact
  const isUltraCompact = screenHeight <= 780;
  const [signupStep, setSignupStep] = useState(0);
  const [cooldownSec, setCooldownSec] = useState(0);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  // Use ref to prevent double-submission even if state hasn't updated yet
  const isSubmittingRef = useRef(false);
  // Track last signup attempt email to prevent rapid retries
  const lastSignupEmailRef = useRef<string | null>(null);
  const lastSignupTimeRef = useRef<number>(0);
  
  React.useEffect(() => {
    if (cooldownSec <= 0) {
      // Clear cooldown when it reaches 0
      if (cooldownSec < 0) setCooldownSec(0);
      return;
    }
    const t = setInterval(() => {
      setCooldownSec((s) => {
        const newValue = s > 0 ? s - 1 : 0;
        return newValue;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [cooldownSec]);

  // Animation for step transitions
  React.useEffect(() => {
    // Reset and animate in
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [signupStep, isLogin, forgotPasswordMode, fadeAnim, slideAnim]);

  const firstNameRef = useRef<any>(null);
  const lastNameRef = useRef<any>(null);
  const dobRef = useRef<any>(null);
  const emailRef = useRef<any>(null);
  const passwordRef = useRef<any>(null);
  const confirmPasswordRef = useRef<any>(null);
  const phoneRef = useRef<any>(null);

  // Calculate age from date of birth
  const calculateAge = (dob: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  // Format date for display
  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

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
            
            // Check if email is verified after OAuth login
            const { data: { user } } = await supabase.auth.getUser();
            if (user && !user.email_confirmed_at) {
              // Email not verified - redirect to confirmation screen
              await supabase.auth.signOut(); // Sign out to prevent partial session
              router.replace({ pathname: '/auth/confirm', params: { email: user.email || '' } });
              Alert.alert(
                'Email Verification Required',
                'Please verify your email address before logging in. We\'ve sent a confirmation email to your inbox.'
              );
              return;
            }
            
            // Ensure profile exists
            try { 
              await ensureProfileForCurrentUser();
            } catch {}
            
            // Check onboarding status and route accordingly
            try {
              const profile = await getCurrentProfile();
              const destination = resolveOnboardingDestination(profile);
              router.replace(destination as any);
            } catch (err) {
              console.warn('Failed to load profile for onboarding state', err);
              router.replace('/(tabs)/requests');
            }
          }
        }
      }
      // For web, the redirect happens automatically via Supabase
    } catch (err: any) {
      Alert.alert('Google Sign-In Error', err?.message || 'Failed to sign in with Google');
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotPasswordEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      const origin = typeof window !== 'undefined' && (window as any).location?.origin
        ? (window as any).location.origin
        : 'https://www.appauro.com';

      const redirectTo = Platform.select({
        web: `${origin}/auth/confirm?type=recovery`,
        default: 'auro://auth/confirm?type=recovery',
      });

      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
        redirectTo,
      });

      if (error) throw error;
      
      setForgotPasswordSent(true);
      Alert.alert('Email Sent', 'Check your inbox for password reset instructions.');
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (/security\s*purposes|too\s*many|rate/i.test(msg)) {
        const secMatch = msg.match(/after\s+(\d+)\s*seconds?/i);
        const wait = Number(secMatch?.[1]) || 60;
        setCooldownSec(wait);
        Alert.alert('Please wait', `For security purposes, please try again in ${wait} seconds.`);
      } else {
        Alert.alert('Error', msg || 'Failed to send reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Prevent double-submission using ref (faster than state check)
    if (isSubmittingRef.current || loading) {
      console.log('[Auth] handleSubmit called but already submitting, ignoring');
      return;
    }
    
    if (!email || !password || (!isLogin && (!firstName || !lastName || !dateOfBirth || !phone))) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    // Set both ref and state to prevent double-submission
    isSubmittingRef.current = true;
    setLoading(true);

      // Password validation for signup
      if (!isLogin) {
        if (!isPasswordValid(password)) {
          isSubmittingRef.current = false;
          setLoading(false); // Reset loading state
          Alert.alert('Password Requirements', 
            'Password must include:\n• At least 8 characters\n• One uppercase letter\n• One lowercase letter\n• One number\n• One special character');
          return;
        }
        
        if (password !== confirmPassword) {
          isSubmittingRef.current = false;
          setLoading(false); // Reset loading state
          Alert.alert('Error', 'Passwords do not match');
          return;
        }
      }

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          const message = String((error as any)?.message || '').toLowerCase();
          const status = (error as any)?.status;
          
          // Check for invalid credentials
          if (/invalid.*credentials|invalid.*email.*password|invalid.*login|wrong.*password|incorrect.*password/i.test(message) || 
              (status === 400 && /invalid|wrong|incorrect/i.test(message))) {
            Alert.alert(
              'Invalid Credentials',
              'Oops! That email and password combination doesn\'t look correct. Please try again.'
            );
            isSubmittingRef.current = false;
            setLoading(false);
            return;
          }
          
          // Check for email confirmation issues
          if (status === 400 || /confirm/i.test(message)) {
            if (/confirm/i.test(message) || /not\s*confirmed/i.test(message)) {
              router.replace({ pathname: '/auth/confirm', params: { email } });
              return;
            }
          }
          throw error;
        }

        // Check if email is verified before allowing login
        if (data.user && !data.user.email_confirmed_at) {
          // User exists but email is not verified - redirect to confirmation screen
          await supabase.auth.signOut(); // Sign out to prevent partial session
          router.replace({ pathname: '/auth/confirm', params: { email: data.user.email || email } });
          Alert.alert(
            'Email Verification Required',
            'Please verify your email address before logging in. We\'ve sent a confirmation email to your inbox.'
          );
          return;
        }

        // Ensure profile exists
        try { await ensureProfileForCurrentUser(); } catch {}
        
        // Check onboarding status and route accordingly
        try {
          const profile = await getCurrentProfile();
          const destination = resolveOnboardingDestination(profile);
          router.replace(destination as any);
        } catch (err) {
          console.warn('Failed to load profile for onboarding state', err);
          router.replace('/(tabs)/requests');
        }
      } else {
        // CRITICAL: Prevent rapid retries for the same email
        const now = Date.now();
        const timeSinceLastSignup = now - lastSignupTimeRef.current;
        const isSameEmail = lastSignupEmailRef.current === email.toLowerCase().trim();
        
        // If same email and less than 5 seconds since last attempt, block it
        if (isSameEmail && timeSinceLastSignup < 5000) {
          isSubmittingRef.current = false;
          setLoading(false);
          Alert.alert(
            'Please Wait',
            'You just attempted to sign up. Please wait a few seconds before trying again.',
            [{ text: 'OK' }]
          );
          return;
        }
        
        // Update tracking
        lastSignupEmailRef.current = email.toLowerCase().trim();
        lastSignupTimeRef.current = now;
        
        const origin =
          typeof window !== 'undefined' && (window as any).location?.origin
            ? (window as any).location.origin
            : 'https://www.appauro.com';

        const redirectTo = Platform.select({
          web: `${origin}/auth/confirm`,
          default: 'auro://auth/confirm',
        });

        const age = dateOfBirth ? calculateAge(dateOfBirth) : null;
        const fullName = `${firstName} ${lastName}`.trim();
        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { 
              name: fullName,
              firstName,
              lastName,
              dateOfBirth: dateOfBirth?.toISOString().split('T')[0] || null,
              age: age,
              phone 
            },
            emailRedirectTo: redirectTo,
          },
        });
        
        if (error) {
          isSubmittingRef.current = false;
          setLoading(false); // Reset loading state
          const errorMsg = String(error.message || '').toLowerCase();
          const errorCode = (error as any)?.status || (error as any)?.code || '';
          const errorCodeStr = String(errorCode).toLowerCase();
          
          // Check for rate limiting FIRST - handle 429 status code and email rate limit errors
          const secMatch = errorMsg.match(/after\s+(\d+)\s*seconds?/i);
          if (/security\s*purposes|too\s*many|rate|429|over_email_send_rate_limit|email.*rate.*limit/i.test(errorMsg) || 
              errorCode === 429 || 
              errorCodeStr.includes('429') ||
              errorCodeStr.includes('rate_limit')) {
            const wait = Number(secMatch?.[1]) || 60;
            setCooldownSec(wait);
            // Clear email tracking to allow retry after cooldown
            lastSignupEmailRef.current = null;
            lastSignupTimeRef.current = 0;
            Alert.alert(
              'Rate Limit Reached', 
              `Too many signup attempts for this email. Please wait ${wait} seconds before trying again. The timer will count down automatically.`,
              [{ text: 'OK' }]
            );
            return;
          }
          
          // Check if user already exists
          if (errorMsg.includes('already registered') || errorMsg.includes('user already exists') || errorMsg.includes('email address is already registered') || errorCode === 422) {
            // Clear email tracking since this is a different error
            lastSignupEmailRef.current = null;
            lastSignupTimeRef.current = 0;
            Alert.alert(
              'Account Already Exists',
              'An account with this email address already exists. Please use the "Login" tab to sign in.',
              [
                {
                  text: 'Go to Login',
                  onPress: () => {
                    setIsLogin(true);
                    setSignupStep(0);
                    setPassword('');
                    setConfirmPassword('');
                    setCooldownSec(0); // Clear any cooldown when switching to login
                    lastSignupEmailRef.current = null;
                    lastSignupTimeRef.current = 0;
                  },
                },
                {
                  text: 'OK',
                  style: 'cancel',
                },
              ]
            );
            return;
          }
          
          // For other errors, clear tracking after a delay to prevent rapid retries
          setTimeout(() => {
            lastSignupEmailRef.current = null;
            lastSignupTimeRef.current = 0;
          }, 10000); // Clear after 10 seconds
          
          throw error;
        }

        // Check if user was created and if email confirmation is needed
        if (signUpData.user) {
          // CRITICAL: Always check email_confirmed_at, not just session
          // Supabase may create a session even if email isn't confirmed
          const isEmailConfirmed = signUpData.user.email_confirmed_at !== null;
          
          // Also check if we have a session - if no session, definitely need confirmation
          const { data: { session } } = await supabase.auth.getSession();
          const hasValidSession = !!session && !!session.user;
          
          console.log('[Auth] Signup successful:', {
            userId: signUpData.user.id,
            email: signUpData.user.email,
            emailConfirmed: isEmailConfirmed,
            emailConfirmedAt: signUpData.user.email_confirmed_at,
            hasSession: hasValidSession
          });
          
          // CRITICAL: For email/password signup, ALWAYS redirect to confirm screen
          // Even if Supabase auto-confirms, we want users to see the verification screen
          // This ensures users always see the "please verify your email" screen after signup
          
          // ALWAYS redirect to confirm screen for new signups
          // The confirm screen will handle the case where email is already confirmed
          console.log('[Auth] New signup - redirecting to confirmation screen for:', email);
          
          // Clear tracking since signup was successful
          lastSignupEmailRef.current = null;
          lastSignupTimeRef.current = 0;
          isSubmittingRef.current = false; // Reset ref before navigation
          setLoading(false);
          
          // Use setTimeout to ensure state is reset before navigation
          setTimeout(() => {
            router.replace({ pathname: '/auth/confirm', params: { email } });
          }, 100);
          return;
          
          // Only create profile if email is confirmed - otherwise wait for email confirmation
          // This prevents double-counting (profile creation happens in confirm screen)
          try { 
            await ensureProfileForCurrentUser(); 
            // Phone is stored in user_metadata via signUp options above
          } catch (profileErr) {
            console.warn('Profile creation warning (non-critical):', profileErr);
            // Continue even if profile creation fails - user can complete onboarding later
          }
          
          // Check onboarding status and route accordingly
          try {
            const profile = await getCurrentProfile();
            const destination = resolveOnboardingDestination(profile);
            router.replace(destination as any);
          } catch (err) {
            console.warn('Failed to load profile for onboarding state', err);
            // Default to onboarding for new users if profile fetch fails
            router.replace('/onboarding/push-notifications');
          }
          
          // Clear tracking since signup was successful
          lastSignupEmailRef.current = null;
          lastSignupTimeRef.current = 0;
          // Reset loading state after navigation
          isSubmittingRef.current = false;
          setLoading(false);
        } else {
          // No user returned - should not happen, but handle gracefully
          // Clear tracking
          lastSignupEmailRef.current = null;
          lastSignupTimeRef.current = 0;
          isSubmittingRef.current = false;
          setLoading(false);
          Alert.alert('Signup Error', 'Account creation failed. Please try again.');
        }
      }
    } catch (err: any) {
      // Always reset submission state on error
      isSubmittingRef.current = false;
      const msg = String(err?.message || '').toLowerCase();
      const secMatch = msg.match(/after\s+(\d+)\s*seconds?/i);
      
      // Check for rate limiting / security cooldown - handle 429 and email rate limit
      const errorCode = (err as any)?.status || (err as any)?.code || '';
      const errorCodeStr = String(errorCode).toLowerCase();
      if (/security\s*purposes|too\s*many|rate|429|over_email_send_rate_limit|email.*rate.*limit/i.test(msg) || 
          errorCode === 429 || 
          errorCodeStr.includes('429') ||
          errorCodeStr.includes('rate_limit')) {
        const wait = Number(secMatch?.[1]) || 60;
        setCooldownSec(wait);
        // Clear email tracking to allow retry after cooldown
        lastSignupEmailRef.current = null;
        lastSignupTimeRef.current = 0;
        setLoading(false); // CRITICAL: Reset loading state so user can see the cooldown
        Alert.alert(
          'Rate Limit Reached', 
          `Too many signup attempts. Please wait ${wait} seconds before trying again. The timer will count down automatically.`,
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Check for invalid credentials (fallback in case it wasn't caught earlier)
      if (isLogin && (/invalid.*credentials|invalid.*email.*password|invalid.*login|wrong.*password|incorrect.*password/i.test(msg))) {
        Alert.alert(
          'Invalid Credentials',
          'Oops! That email and password combination doesn\'t look correct. Please try again.'
        );
        return;
      }
      
      // Check for duplicate email errors
      if (/already registered|user already exists|email address is already registered/i.test(msg)) {
        // Clear email tracking
        lastSignupEmailRef.current = null;
        lastSignupTimeRef.current = 0;
        setLoading(false); // Reset loading state
        Alert.alert(
          'Account Already Exists',
          'An account with this email address already exists. Please use the "Login" tab to sign in.',
          [
            {
              text: 'Go to Login',
              onPress: () => {
                setIsLogin(true);
                setSignupStep(0);
                setPassword('');
                setConfirmPassword('');
                setCooldownSec(0); // Clear any cooldown when switching to login
                lastSignupEmailRef.current = null;
                lastSignupTimeRef.current = 0;
              },
            },
            {
              text: 'OK',
              style: 'cancel',
            },
          ]
        );
        return;
      }
      
      // For all other errors, reset loading state and clear tracking after delay
      isSubmittingRef.current = false;
      setLoading(false);
      setTimeout(() => {
        lastSignupEmailRef.current = null;
        lastSignupTimeRef.current = 0;
      }, 10000); // Clear after 10 seconds
      
      // Generic error message - more user-friendly
      Alert.alert(
        'Oops!',
        isLogin 
          ? 'We couldn\'t sign you in. Please check your credentials and try again.'
          : 'Something went wrong. Please try again.'
      );
      // Don't redirect on error - stay on the same screen
    } finally {
      // CRITICAL: Always ensure ref is reset even if something unexpected happens
      // This prevents the button from being permanently disabled
      isSubmittingRef.current = false;
      setLoading(false);
    }
  };

  const checkEmailExists = async (emailToCheck: string): Promise<boolean> => {
    // Disabled: Email existence checking is unreliable and causes false positives
    // Supabase's signup endpoint will properly handle duplicate emails
    // This pre-check was causing issues where valid new emails were incorrectly flagged
    return false;
  };

  const handleNextSignupStep = async () => {
    if (signupStep === 0) {
      if (!email || !password || !confirmPassword) {
        Alert.alert('Error', 'Please enter your email and both passwords');
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        Alert.alert('Invalid Email', 'Please enter a valid email address');
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

      // Check if email already exists
      setCheckingEmail(true);
      setEmailError('');
      try {
        const emailExists = await checkEmailExists(email);
        if (emailExists) {
          setEmailError('An account with this email already exists. Please sign in instead.');
          setCheckingEmail(false);
          Alert.alert(
            'Account Already Exists',
            'An account with this email address already exists. Please use the "Login" tab to sign in, or use a different email address.',
            [
              {
                text: 'Go to Login',
                onPress: () => setIsLogin(true),
              },
              {
                text: 'OK',
                style: 'cancel',
              },
            ]
          );
          return;
        }
      } catch (err) {
        // If check fails, continue anyway - let signup attempt handle it
        console.warn('Email check failed:', err);
      }
      setCheckingEmail(false);

      setSignupStep(1);
      requestAnimationFrame(() => {
        firstNameRef.current?.focus?.();
      });
    } else if (signupStep === 1) {
      if (!firstName || !lastName) {
        Alert.alert('Error', 'Please enter your first and last name');
        return;
      }
      setSignupStep(2);
      // Don't auto-focus DOB, let user tap to open picker
    } else if (signupStep === 2) {
      if (!dateOfBirth) {
        Alert.alert('Error', 'Please select your date of birth');
        return;
      }
      // Validate age (must be 18+)
      const age = calculateAge(dateOfBirth);
      if (age < 18) {
        Alert.alert('Error', 'You must be at least 18 years old to sign up');
        return;
      }
      setSignupStep(3);
      requestAnimationFrame(() => {
        phoneRef.current?.focus?.();
      });
    }
  };

  const handleBackSignupStep = () => {
    if (signupStep === 3) {
      setSignupStep(2);
    } else if (signupStep === 2) {
      setSignupStep(1);
      requestAnimationFrame(() => {
        lastNameRef.current?.focus?.();
      });
    } else if (signupStep === 1) {
      setSignupStep(0);
      requestAnimationFrame(() => {
        emailRef.current?.focus?.();
      });
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDateOfBirth(selectedDate);
      if (Platform.OS === 'ios') {
        // On iOS, keep picker open until user confirms
      }
    }
  };

  const shouldShowEmailPassword = isLogin || (!isLogin && signupStep === 0);
  const shouldShowName = !isLogin && signupStep === 1;
  const shouldShowDOB = !isLogin && signupStep === 2;
  const shouldShowPhone = !isLogin && signupStep === 3;

  const scrollViewRef = useRef<ScrollView>(null);

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : Platform.OS === 'android' ? 20 : 0}
    >
      <View style={styles.container}>
      <StatusBar style="light" translucent />
      <ScrollView
        ref={scrollViewRef}
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
        {/* Logo and Brand Name - Outside and above the form card */}
        <MotionView entering={ZoomIn.duration(400).delay(MotionDelays.quick)}>
          <View style={[styles.logoContainer, isCompact && styles.logoContainerCompact, styles.logoContainerOutside]}>
            <Image 
              source={require('../auro_aura_logo_nobg.png')} 
              style={[styles.logoImage, isCompact && styles.logoImageCompact]}
              resizeMode="contain"
            />
            <Text style={[styles.brandText, isCompact && styles.brandTextCompact]}>Auro</Text>
          </View>
        </MotionView>

      <Animated.View 
        style={[
          styles.form,
          isCompact && styles.formCompact,
          Platform.OS === 'web' && styles.formWeb,
          { marginBottom: isCompact ? 8 : (16 + insets.bottom) },
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {!forgotPasswordMode ? (
          <>
            <MotionView entering={FadeInDown.duration(400).delay(MotionDelays.item)}>
              <View style={[styles.toggleContainer, isCompact && styles.toggleContainerCompact]}>
                <MotionPressable
                  style={[styles.toggleButton, isLogin && styles.activeToggle]}
                  onPress={() => { 
                    setIsLogin(true); 
                    setSignupStep(0);
                    setForgotPasswordMode(false);
                    // Reset signup fields when switching to login
                    setFirstName('');
                    setLastName('');
                    setDateOfBirth(null);
                    setPhone('');
                  }}
                >
                  <Text style={[styles.toggleText, isLogin && styles.activeToggleText]}>
                    Login
                  </Text>
                </MotionPressable>
                <MotionPressable
                  style={[styles.toggleButton, !isLogin && styles.activeToggle]}
                  onPress={() => { 
                    setIsLogin(false); 
                    setSignupStep(0);
                    setForgotPasswordMode(false);
                    // Reset login-specific fields when switching to signup
                    setConfirmPassword('');
                  }}
                >
                  <Text style={[styles.toggleText, !isLogin && styles.activeToggleText]}>
                    Sign Up
                  </Text>
                </MotionPressable>
              </View>
            </MotionView>
          </>
        ) : (
          <MotionView entering={FadeInDown.duration(400).delay(MotionDelays.item)}>
            <View style={styles.forgotPasswordHeader}>
              <TouchableOpacity 
                style={styles.backButton} 
                onPress={() => {
                  setForgotPasswordMode(false);
                  setForgotPasswordEmail('');
                  setForgotPasswordSent(false);
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent' }}>
                  <Ionicons name="arrow-back" size={20} color={Colors.brand.accentMagenta} />
                  <Text style={styles.backButtonText}>Back to {isLogin ? 'Login' : 'Sign Up'}</Text>
                </View>
              </TouchableOpacity>
              <Text style={styles.forgotPasswordTitle}>Reset Password</Text>
              <Text style={styles.forgotPasswordSubtitle}>
                Enter your email address and we'll send you instructions to reset your password.
              </Text>
            </View>
          </MotionView>
        )}

        {forgotPasswordMode && (
          <>
            <MotionView entering={cardEntrance(2)} style={[styles.inputGroup, isCompact && styles.inputGroupCompact]}>
              <Text style={[styles.label, isCompact && styles.labelCompact]}>Email</Text>
              <TextInput
                style={[styles.input, isCompact && styles.inputCompact]}
                value={forgotPasswordEmail}
                onChangeText={setForgotPasswordEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading && !forgotPasswordSent}
              />
              {forgotPasswordSent && (
                <View style={styles.successMessage}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.brand.success} />
                  <Text style={styles.successText}>
                    Password reset email sent! Check your inbox.
                  </Text>
                </View>
              )}
            </MotionView>

            <MotionView entering={cardEntrance(3)}>
              <MotionPressable
                style={[styles.submitButton, isCompact && styles.submitButtonCompact, loading && styles.submitButtonDisabled]}
                disabled={loading || forgotPasswordSent}
                onPress={handleForgotPassword}
              >
                <ExpoLinearGradient
                  colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 28 }}
                />
                {loading ? (
                  <Text style={styles.submitButtonText}>Sending...</Text>
                ) : forgotPasswordSent ? (
                  <Text style={styles.submitButtonText}>Email Sent ✓</Text>
                ) : (
                  <Text style={styles.submitButtonText}>Send Reset Link</Text>
                )}
              </MotionPressable>
            </MotionView>
          </>
        )}

        {shouldShowName && (
          <>
            <MotionView entering={subtleFadeIn().delay(MotionDelays.quick)}>
              <TouchableOpacity style={styles.backButton} onPress={handleBackSignupStep}>
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            </MotionView>
            <MotionView entering={cardEntrance(2)} style={[styles.inputGroup, isCompact && styles.inputGroupCompact]}>
              {!isUltraCompact && (
                <Text style={[styles.label, isCompact && styles.labelCompact]}>First Name</Text>
              )}
              <TextInput
                style={[styles.input, isCompact && styles.inputCompact]}
                value={firstName}
                onChangeText={setFirstName}
                placeholder={isUltraCompact ? 'First Name' : 'Enter your first name'}
                autoCapitalize="words"
                ref={firstNameRef}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => lastNameRef.current?.focus()}
              />
            </MotionView>

            <MotionView entering={cardEntrance(3)} style={[styles.inputGroup, isCompact && styles.inputGroupCompact]}>
              {!isUltraCompact && (
                <Text style={[styles.label, isCompact && styles.labelCompact]}>Last Name</Text>
              )}
              <TextInput
                style={[styles.input, isCompact && styles.inputCompact]}
                value={lastName}
                onChangeText={setLastName}
                placeholder={isUltraCompact ? 'Last Name' : 'Enter your last name'}
                autoCapitalize="words"
                ref={lastNameRef}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={handleNextSignupStep}
              />
            </MotionView>
          </>
        )}

        {shouldShowDOB && (
          <>
            <MotionView entering={subtleFadeIn().delay(MotionDelays.quick)}>
              <TouchableOpacity style={styles.backButton} onPress={handleBackSignupStep}>
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            </MotionView>
            <MotionView entering={cardEntrance(2)} style={[styles.inputGroup, isCompact && styles.inputGroupCompact]}>
              {!isUltraCompact && (
                <Text style={[styles.label, isCompact && styles.labelCompact]}>Date of Birth</Text>
              )}
              <TouchableOpacity
                style={[styles.input, styles.dateInput, isCompact && styles.inputCompact]}
                onPress={() => setShowDatePicker(true)}
                ref={dobRef}
              >
                <Text style={[styles.dateInputText, !dateOfBirth && styles.dateInputPlaceholder]}>
                  {dateOfBirth ? formatDate(dateOfBirth) : (isUltraCompact ? 'Date of Birth' : 'Select your date of birth')}
                </Text>
                <AntDesign name="calendar" size={20} color={dateOfBirth ? Colors.brand.textOnGradient : Colors.brand.textSecondary} />
              </TouchableOpacity>
              {dateOfBirth && (
                <Text style={styles.ageHint}>
                  Age: {calculateAge(dateOfBirth)} years old
                </Text>
              )}
            </MotionView>

            {Platform.OS === 'ios' && showDatePicker && (
              <Modal
                transparent
                animationType="slide"
                visible={showDatePicker}
                onRequestClose={() => setShowDatePicker(false)}
              >
                <View style={styles.datePickerModal}>
                  <View style={styles.datePickerContainer}>
                    <View style={styles.datePickerHeader}>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={styles.datePickerButton}>Cancel</Text>
                      </TouchableOpacity>
                      <Text style={styles.datePickerTitle}>Select Date of Birth</Text>
                      <TouchableOpacity
                        onPress={() => {
                          if (dateOfBirth) {
                            setShowDatePicker(false);
                          }
                        }}
                      >
                        <Text style={[styles.datePickerButton, dateOfBirth && styles.datePickerButtonActive]}>
                          Done
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={dateOfBirth || new Date(2000, 0, 1)}
                      mode="date"
                      display="spinner"
                      onChange={handleDateChange}
                      maximumDate={new Date()}
                      minimumDate={new Date(1900, 0, 1)}
                    />
                  </View>
                </View>
              </Modal>
            )}

            {Platform.OS === 'android' && showDatePicker && (
              <DateTimePicker
                value={dateOfBirth || new Date(2000, 0, 1)}
                mode="date"
                display="default"
                onChange={handleDateChange}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
              />
            )}

            {Platform.OS === 'web' && (
              <TextInput
                style={[styles.input, isCompact && styles.inputCompact, { marginTop: 8 }]}
                value={dateOfBirth ? dateOfBirth.toISOString().split('T')[0] : ''}
                onChangeText={(text) => {
                  // Handle YYYY-MM-DD format for web date input
                  if (text.length === 10) {
                    const date = new Date(text + 'T00:00:00');
                    if (date.getTime() && date <= new Date() && date >= new Date(1900, 0, 1)) {
                      setDateOfBirth(date);
                    }
                  } else if (text.length === 0) {
                    setDateOfBirth(null);
                  }
                }}
                placeholder="YYYY-MM-DD"
                {...(Platform.OS === 'web' && {
                  type: 'date',
                  max: new Date().toISOString().split('T')[0],
                  min: new Date(1900, 0, 1).toISOString().split('T')[0],
                } as any)}
              />
            )}
          </>
        )}

        {shouldShowPhone && (
          <>
            <MotionView entering={subtleFadeIn().delay(MotionDelays.quick)}>
              <TouchableOpacity style={styles.backButton} onPress={handleBackSignupStep}>
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            </MotionView>
            <MotionView entering={cardEntrance(2)} style={[styles.inputGroup, isCompact && styles.inputGroupCompact]}>
              {!isUltraCompact && (
                <Text style={[styles.label, isCompact && styles.labelCompact]}>Phone Number</Text>
              )}
              <TextInput
                style={[styles.input, isCompact && styles.inputCompact]}
                value={phone}
                onChangeText={setPhone}
                placeholder={isUltraCompact ? 'Phone' : 'Enter your phone number'}
                keyboardType="phone-pad"
                ref={phoneRef}
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={handleSubmit}
              />
            </MotionView>
          </>
        )}

        {shouldShowEmailPassword && (
          <>
            <MotionView entering={cardEntrance(2)} style={[styles.inputGroup, isCompact && styles.inputGroupCompact]}>
              {!isUltraCompact && (
                <Text style={[styles.label, isCompact && styles.labelCompact]}>Email</Text>
              )}
              <TextInput
                style={[styles.input, isCompact && styles.inputCompact, emailError && styles.inputError]}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setEmailError(''); // Clear error when user types
                }}
                placeholder={isUltraCompact ? 'Email' : 'Enter your email'}
                keyboardType="email-address"
                autoCapitalize="none"
                ref={emailRef}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => passwordRef.current?.focus()}
                editable={!checkingEmail}
              />
              {checkingEmail && (
                <Text style={styles.checkingEmailText}>Checking email...</Text>
              )}
              {emailError && (
                <Text style={styles.errorText}>{emailError}</Text>
              )}
            </MotionView>

            <MotionView entering={cardEntrance(3)} style={[styles.inputGroup, isCompact && styles.inputGroupCompact]}>
              {!isUltraCompact && (
                <Text style={[styles.label, isCompact && styles.labelCompact]}>Password</Text>
              )}
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput, isCompact && styles.inputCompact]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={isUltraCompact ? 'Password' : 'Enter your password'}
                  secureTextEntry={!showPassword}
                  ref={passwordRef}
                  returnKeyType={isLogin ? 'go' : 'next'}
                  blurOnSubmit={isLogin}
                  onSubmitEditing={isLogin ? handleSubmit : () => confirmPasswordRef.current?.focus()}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={Colors.brand.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              {!isLogin && password.length > 0 && (
                <View style={styles.passwordRequirements}>
                  <PasswordRequirement met={validatePassword(password).length} text="8+ characters" />
                  <PasswordRequirement met={validatePassword(password).uppercase} text="Uppercase letter" />
                  <PasswordRequirement met={validatePassword(password).lowercase} text="Lowercase letter" />
                  <PasswordRequirement met={validatePassword(password).number} text="Number" />
                  <PasswordRequirement met={validatePassword(password).special} text="Special character" />
                </View>
              )}
            </MotionView>

            {!isLogin && (
              <MotionView entering={cardEntrance(4)} style={[styles.inputGroup, isCompact && styles.inputGroupCompact]}>
                {!isUltraCompact && (
                  <Text style={[styles.label, isCompact && styles.labelCompact]}>Confirm Password</Text>
                )}
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={[styles.input, styles.passwordInput, isCompact && styles.inputCompact]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder={isUltraCompact ? 'Confirm Password' : 'Confirm your password'}
                    secureTextEntry={!showConfirmPassword}
                    ref={confirmPasswordRef}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={handleNextSignupStep}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={Colors.brand.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                {confirmPassword.length > 0 && (
                  <View style={styles.passwordMatch}>
                    <Text style={[styles.passwordMatchText, password === confirmPassword && styles.passwordMatchSuccess]}>
                      {password === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                    </Text>
                  </View>
                )}
              </MotionView>
            )}
          </>
        )}

        {!forgotPasswordMode && (
          <MotionView entering={cardEntrance(shouldShowEmailPassword ? 5 : 2)}>
            <MotionPressable
              style={[styles.submitButton, isCompact && styles.submitButtonCompact, (loading || (!isLogin && cooldownSec > 0) || checkingEmail) && styles.submitButtonDisabled]}
              disabled={loading || (!isLogin && cooldownSec > 0) || checkingEmail}
              onPress={isLogin ? handleSubmit : (signupStep < 3 ? handleNextSignupStep : handleSubmit)}
            >
              <ExpoLinearGradient
                colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 28 }}
              />
              {loading ? (
                <Text style={styles.submitButtonText}>
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </Text>
              ) : (
                <Text style={styles.submitButtonText}>
                  {isLogin ? 'Login' : (signupStep === 0 || signupStep === 1 || signupStep === 2) ? (checkingEmail ? 'Checking...' : 'Next') : (cooldownSec > 0 ? `Create Account (${cooldownSec}s)` : 'Create Account')}
                </Text>
              )}
            </MotionPressable>
          </MotionView>
        )}

        {/* Only show Google sign-in on login or first signup step */}
        {!forgotPasswordMode && (isLogin || signupStep === 0) && (
          <>
            {/* Divider */}
            <MotionView entering={subtleFadeIn().delay(MotionDelays.section)}>
              <View style={[styles.divider, isCompact && styles.dividerCompact]}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>
            </MotionView>

            {/* Google Sign In Button */}
            <MotionView entering={cardEntrance(shouldShowEmailPassword ? 6 : 3)}>
              <MotionPressable
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
              </MotionPressable>
            </MotionView>
          </>
        )}

        {isLogin && !isCompact && !forgotPasswordMode && (
          <MotionView entering={subtleFadeIn().delay(MotionDelays.section * 1.5)}>
            <TouchableOpacity 
              style={styles.forgotPassword}
              onPress={() => {
                setForgotPasswordEmail(email);
                setForgotPasswordMode(true);
              }}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </MotionView>
        )}
        </Animated.View>

      {!isCompact && (
        <MotionView entering={subtleFadeIn().delay(MotionDelays.section * 2)}>
          <View style={[styles.footer, Platform.OS === 'web' && styles.footerWeb, { marginBottom: insets.bottom + 6 }]}>
            <Text style={styles.footerText}>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>
        </MotionView>
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
  inputError: {
    borderColor: '#ff4444',
    borderWidth: 1.5,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 6,
  },
  checkingEmailText: {
    color: Colors.brand.textSecondary,
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
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
  forgotPassword: {
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: 'transparent',
    paddingVertical: 8,
  },
  forgotPasswordText: {
    color: Colors.brand.accentMagenta,
    fontSize: 14,
    fontWeight: '600',
  },
  forgotPasswordHeader: {
    marginBottom: 24,
    backgroundColor: 'transparent',
  },
  forgotPasswordTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'Poppins_700Bold',
  },
  forgotPasswordSubtitle: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
  passwordInputContainer: {
    position: 'relative',
    backgroundColor: 'transparent',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
    backgroundColor: 'transparent',
  },
  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(61, 220, 132, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(61, 220, 132, 0.3)',
  },
  successText: {
    color: Colors.brand.success,
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
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
    flexDirection: 'row',
    alignItems: 'center',
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
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 18,
  },
  dateInputText: {
    fontSize: 15,
    color: Colors.brand.textOnGradient,
    flex: 1,
  },
  dateInputPlaceholder: {
    color: Colors.brand.textSecondary,
  },
  ageHint: {
    fontSize: 13,
    color: Colors.brand.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  datePickerModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerContainer: {
    backgroundColor: Colors.brand.cardBackground || '#2A1B3D',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 111, 0, 0.2)',
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.brand.textOnGradient,
    fontFamily: 'Poppins_600SemiBold',
  },
  datePickerButton: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
    paddingHorizontal: 8,
  },
  datePickerButtonActive: {
    color: Colors.brand.accentMagenta,
    fontWeight: '600',
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
