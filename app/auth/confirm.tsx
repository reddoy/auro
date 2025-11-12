import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Image, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Linking, Animated } from 'react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { ensureProfileForCurrentUser } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';

export default function ConfirmEmailScreen() {
  const { email, token_hash, type } = useLocalSearchParams<{ email?: string; token_hash?: string; type?: string }>();
  const [sending, setSending] = useState(false);
  const [cooldownSec, setCooldownSec] = useState(0);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmationStatus, setConfirmationStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [confirmationStatus, fadeAnim, scaleAnim]);

  useEffect(() => {
    if (cooldownSec <= 0) return;
    const t = setInterval(() => setCooldownSec((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldownSec]);

  // Handle email confirmation when user comes from email link
  useEffect(() => {
    if (token_hash && type === 'signup') {
      setIsConfirming(true);
      const confirmEmail = async () => {
        try {
          const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: 'signup',
          });
          if (error) {
            setConfirmationStatus('error');
          } else {
            // Ensure profile exists after email confirmation
            // This should create the profile if it doesn't exist (new signups)
            try {
              await ensureProfileForCurrentUser();
            } catch (profileErr) {
              console.warn('Profile creation warning:', profileErr);
              // Continue even if profile creation fails
            }
            setConfirmationStatus('success');
            // Auto-redirect to push notifications screen after 2 seconds
            // All new users (email/password signup) go through onboarding
            setTimeout(() => {
              router.replace('/onboarding/push-notifications');
            }, 2000);
          }
        } catch (err) {
          setConfirmationStatus('error');
        } finally {
          setIsConfirming(false);
        }
      };
      confirmEmail();
    }
  }, [token_hash, type]);

  const handleResend = async () => {
    if (!email || typeof email !== 'string') {
      Alert.alert('No email found', 'Please go back and enter your email again.');
      return;
    }
    try {
      setSending(true);
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      Alert.alert('Sent', 'We’ve re-sent the confirmation email.');
    } catch (e: any) {
      const msg = String(e?.message || '');
      const secMatch = msg.match(/after\s+(\d+)\s*seconds?/i);
      const wait = Number(secMatch?.[1]) || 60;
      if (/security\s*purposes|too\s*many|rate/i.test(msg)) {
        setCooldownSec(wait);
        Alert.alert('Please wait', `You can request another email in ${wait} seconds.`);
      } else {
        Alert.alert('Could not resend', msg || 'Please try again.');
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <ExpoLinearGradient
        colors={[Colors.brand.background, Colors.brand.cardBackgroundLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.backgroundGradient}
      />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <ExpoLinearGradient
          colors={[Colors.brand.cardBackgroundLight, Colors.brand.cardBackground]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <Image source={require('@/Auro_side_side_no_bg.png')} style={styles.logoTop} resizeMode="contain" />
            <Text style={styles.tagline}>Your Aura, Amplified</Text>
          </View>
        </ExpoLinearGradient>

        <Animated.View 
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Image source={require('@/Auro_side_side_no_bg.png')} style={styles.logo} resizeMode="contain" />
          
          {isConfirming && (
            <>
              <View style={styles.iconContainer}>
                <ActivityIndicator color={Colors.brand.accentMagenta} size="large" />
              </View>
              <Text style={styles.title}>Confirming your email...</Text>
              <Text style={styles.body}>Please wait while we verify your email address.</Text>
            </>
          )}

          {confirmationStatus === 'success' && !isConfirming && (
            <>
              <View style={styles.iconContainer}>
                <Ionicons name="checkmark-circle" size={64} color={Colors.brand.success} />
              </View>
              <Text style={styles.title}>Email confirmed! 🎉</Text>
              <Text style={styles.body}>Welcome to Auro! Let's get you started with onboarding.</Text>

              <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/onboarding/push-notifications')}>
                <ExpoLinearGradient
                  colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryBtnGradient}
                />
                <Text style={styles.primaryBtnText}>Continue to Onboarding</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.replace('/(tabs)/requests')}>
                <Text style={styles.secondaryBtnText}>Skip to App</Text>
              </TouchableOpacity>
            </>
          )}

          {confirmationStatus === 'error' && !isConfirming && (
            <>
              <View style={styles.iconContainer}>
                <Ionicons name="close-circle" size={64} color={Colors.brand.error} />
              </View>
              <Text style={styles.title}>Confirmation failed</Text>
              <Text style={styles.body}>We couldn't verify your email. The link may have expired or been used already.</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/auth')}>
                <ExpoLinearGradient
                  colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryBtnGradient}
                />
                <Text style={styles.primaryBtnText}>Back to Sign In</Text>
              </TouchableOpacity>
            </>
          )}

          {confirmationStatus === 'pending' && !isConfirming && (
            <>
              <View style={styles.iconContainer}>
                <Ionicons name="mail-outline" size={64} color={Colors.brand.accentMagenta} />
              </View>
              <Text style={styles.title}>Please confirm your email</Text>
              {!!email && <Text style={styles.body}>We sent a confirmation link to <Text style={styles.emailHighlight}>{email}</Text>. Please check your inbox and click the link to verify your email address.</Text>}
              {!email && <Text style={styles.body}>We sent a confirmation link to your inbox. Please check your email and click the link to verify your email address.</Text>}
              
              <Text style={[styles.body, { marginTop: 8, fontSize: 14, opacity: 0.8 }]}>
                After verifying your email, you'll be able to continue with onboarding.
              </Text>

              <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/auth')}>
                <ExpoLinearGradient
                  colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryBtnGradient}
                />
                <Text style={styles.primaryBtnText}>Back to Sign In</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.secondaryBtn, (sending || cooldownSec > 0) && { opacity: 0.7 }]} 
                disabled={sending || cooldownSec > 0} 
                onPress={handleResend}
              >
                {sending ? (
                  <ActivityIndicator color={Colors.brand.textPrimary} />
                ) : (
                  <View style={styles.resendButtonContent}>
                    <Ionicons 
                      name="refresh-outline" 
                      size={18} 
                      color={Colors.brand.textPrimary} 
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.secondaryBtnText}>
                      {cooldownSec > 0 ? `Resend in ${cooldownSec}s` : 'Resend verification email'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.brand.background },
  backgroundGradient: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  scrollView: { flex: 1, backgroundColor: 'transparent' },
  header: { paddingTop: 80, paddingBottom: 40, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, shadowColor: Colors.brand.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 12 },
  headerContent: { alignItems: 'center', backgroundColor: 'transparent', width: '100%' },
  logoTop: { width: 120, height: 48, marginBottom: 10 },
  tagline: { fontSize: 16, color: Colors.brand.textOnGradient, textAlign: 'center', opacity: 0.9, fontWeight: '500' },
  card: { 
    margin: 28, 
    backgroundColor: Colors.brand.cardBackground, 
    borderRadius: 32, 
    padding: 32, 
    alignItems: 'center', 
    shadowColor: Colors.brand.shadow, 
    shadowOffset: { width: 0, height: 8 }, 
    shadowOpacity: 0.15, 
    shadowRadius: 24, 
    elevation: 12, 
    borderWidth: 1, 
    borderColor: Colors.brand.divider,
  },
  iconContainer: {
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  logo: { width: 180, height: 72, marginBottom: 24 },
  title: { 
    color: Colors.brand.textPrimary, 
    fontSize: 24, 
    fontWeight: '700', 
    textAlign: 'center', 
    marginBottom: 12,
    fontFamily: 'Poppins_700Bold',
  },
  body: { 
    color: Colors.brand.textSecondary, 
    textAlign: 'center', 
    marginBottom: 24,
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  emailHighlight: {
    color: Colors.brand.accentMagenta,
    fontWeight: '600',
  },
  primaryBtn: { 
    backgroundColor: Colors.brand.accentMagenta, 
    paddingVertical: 14, 
    paddingHorizontal: 24, 
    borderRadius: 24, 
    marginTop: 8, 
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: Colors.brand.accentMagenta,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryBtnGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 24,
  },
  primaryBtnText: { 
    color: Colors.brand.textOnGradient, 
    fontSize: 16, 
    fontWeight: '600',
    zIndex: 1,
  },
  secondaryBtn: { 
    backgroundColor: Colors.brand.cardBackground, 
    paddingVertical: 14, 
    paddingHorizontal: 24, 
    borderRadius: 24, 
    marginTop: 12, 
    width: '100%',
    maxWidth: 280,
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: Colors.brand.divider,
  },
  secondaryBtnText: { 
    color: Colors.brand.textPrimary, 
    fontSize: 16, 
    fontWeight: '600',
  },
  resendButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  storeBtn: { backgroundColor: Colors.brand.cardBackground, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 24, marginTop: 12, width: 260, alignItems: 'center', borderWidth: 1, borderColor: Colors.brand.divider },
  storeBtnText: { color: Colors.brand.textPrimary, fontSize: 16, fontWeight: '600' },
});


