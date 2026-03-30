import { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ensureProfileForCurrentUser } from '@/lib/api';
import { getCurrentProfile, resolveOnboardingDestination } from '@/lib/profile';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { AuroMark } from '@/components/AuroMark';

export default function AuthCallback() {
  const { code, error_description, error, linked } = useLocalSearchParams();
  const [status, setStatus] = useState<'loading'|'success'|'error'>('loading');
  const [message, setMessage] = useState('');
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
  }, [status, fadeAnim, scaleAnim]);

  useEffect(() => {
    const run = async () => {
      if (error || error_description) {
        setStatus('error');
        setMessage(String(error_description || error));
        return;
      }
      if (linked === '1') {
        setStatus('success');
        setMessage('Linked!');
        setTimeout(() => router.replace('/(tabs)/profile'), 300);
        return;
      }
      if (typeof code === 'string') {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setStatus('error');
          setMessage(error.message);
        } else {
          // Check if email is verified after OAuth login
          const { data: { user } } = await supabase.auth.getUser();
          if (user && !user.email_confirmed_at) {
            // Email not verified - redirect to confirmation screen
            await supabase.auth.signOut(); // Sign out to prevent partial session
            router.replace({ pathname: '/auth/confirm', params: { email: user.email || '' } });
            return;
          }
          
          setStatus('success');
          // Ensure user profile exists after OAuth login
          // Check if this is a new user (profile was just created)
          let isNewUser = false;
          try { 
            isNewUser = await ensureProfileForCurrentUser();
          } catch {}
          
          // If new user, redirect to onboarding; otherwise go to main app
          if (isNewUser) {
            setTimeout(() => router.replace('/onboarding/push-notifications'), 800);
          } else {
            setTimeout(() => router.replace('/(tabs)/requests'), 800);
          }
        }
      } else {
        // Fallback for web links that deliver tokens or errors in the URL hash
        if (typeof window !== 'undefined' && window.location.hash) {
          const rawHash = window.location.hash.replace(/^#/, '');
          const params = new URLSearchParams(rawHash);

          const hashError = params.get('error');
          const hashErrorDescription = params.get('error_description');
          if (hashError || hashErrorDescription) {
            setStatus('error');
            setMessage(String(hashErrorDescription || hashError));
            return;
          }

          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          const expires_in = params.get('expires_in');
          const token_type = params.get('token_type');

          if (access_token && refresh_token && token_type) {
            try {
              const expiresInSeconds = expires_in ? parseInt(expires_in, 10) : undefined;
              const nowSeconds = Math.floor(Date.now() / 1000);
              const expiresAt = expiresInSeconds ? nowSeconds + expiresInSeconds : undefined;

              const { error: setError } = await supabase.auth.setSession({
                access_token,
                refresh_token,
              } as any);

              if (setError) {
                setStatus('error');
                setMessage(setError.message);
              } else {
                // Check if email is verified after OAuth login
                const { data: { user } } = await supabase.auth.getUser();
                if (user && !user.email_confirmed_at) {
                  // Email not verified - redirect to confirmation screen
                  await supabase.auth.signOut(); // Sign out to prevent partial session
                  router.replace({ pathname: '/auth/confirm', params: { email: user.email || '' } });
                  return;
                }
                
                setStatus('success');
                // Ensure user profile exists after OAuth login
                try { 
                  await ensureProfileForCurrentUser();
                } catch {}
                
                // Check onboarding status and route accordingly
                try {
                  const profile = await getCurrentProfile();
                  const destination = resolveOnboardingDestination(profile);
                  setTimeout(() => router.replace(destination as any), 800);
                } catch (err) {
                  console.warn('Failed to load profile for onboarding state', err);
                  setTimeout(() => router.replace('/(tabs)/requests'), 800);
                }
              }
            } catch (e: any) {
              setStatus('error');
              setMessage(e?.message || 'Unable to complete sign-in.');
            }
          } else {
            setStatus('error');
            setMessage('Missing authorization code.');
          }
        } else {
          setStatus('error');
          setMessage('Missing authorization code.');
        }
      }
    };
    run();
  }, [code]);

  return (
    <View style={styles.container}>
      <ExpoLinearGradient
        colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
        style={styles.backgroundGradient}
      />
      {status === 'loading' && (
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <ActivityIndicator color={Colors.brand.accentMagenta} size="large" />
          <Text style={styles.title}>Confirming…</Text>
          <Text style={styles.body}>Please wait while we complete your sign-in.</Text>
        </Animated.View>
      )}
      {status === 'success' && (
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.iconContainer}>
            <Ionicons name="checkmark-circle" size={64} color={Colors.brand.success} />
          </View>
          <AuroMark height={56} style={styles.logo} />
          <Text style={styles.title}>Welcome to Auro! 🎉</Text>
          <Text style={styles.body}>Successfully signed in. Redirecting you now...</Text>
        </Animated.View>
      )}
      {status === 'error' && (
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.iconContainer}>
            <Ionicons name="close-circle" size={64} color={Colors.brand.error} />
          </View>
          <AuroMark height={56} style={styles.logo} />
          <Text style={styles.title}>We couldn't confirm your email</Text>
          <Text style={styles.body}>{message || 'An error occurred during authentication.'}</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.replace('/auth')}>
            <ExpoLinearGradient
              colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            />
            <Text style={styles.buttonText}>Back to Sign In</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: Colors.brand.background, 
    padding: 24 
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0.1,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    width: '100%',
    maxWidth: 400,
  },
  iconContainer: {
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  title: { 
    color: Colors.brand.textPrimary, 
    fontSize: 24, 
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'Poppins_700Bold',
  },
  body: { 
    color: Colors.brand.textSecondary, 
    marginTop: 8, 
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  logo: { 
    width: 180, 
    height: 72, 
    marginBottom: 24,
  },
  button: { 
    backgroundColor: Colors.brand.accentMagenta, 
    paddingVertical: 14, 
    paddingHorizontal: 32, 
    borderRadius: 24, 
    marginTop: 24,
    overflow: 'hidden',
    shadowColor: Colors.brand.accentMagenta,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 24,
  },
  buttonText: { 
    color: Colors.brand.textOnGradient, 
    fontSize: 16, 
    fontWeight: '600',
    zIndex: 1,
  },
});


