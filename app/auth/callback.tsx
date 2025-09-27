import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';

export default function AuthCallback() {
  const { code, error_description, error, linked } = useLocalSearchParams();
  const [status, setStatus] = useState<'loading'|'success'|'error'>('loading');
  const [message, setMessage] = useState('');

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
          setStatus('success');
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
                setStatus('success');
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
      {status === 'loading' && (
        <>
          <ActivityIndicator color={Colors.brand.accentMagenta} />
          <Text style={styles.title}>Confirming…</Text>
        </>
      )}
      {status === 'success' && (
        <>
          <Image
            source={require('@/Auro_side_side_no_bg.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Thanks for confirming 🎉</Text>
          <Text style={styles.body}>Your email has been verified. You can now sign in.</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.replace('/auth')}>
            <Text style={styles.buttonText}>Back to Sign In</Text>
          </TouchableOpacity>
        </>
      )}
      {status === 'error' && (
        <>
          <Image
            source={require('@/Auro_side_side_no_bg.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>We couldn't confirm your email</Text>
          <Text style={styles.body}>{message}</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.replace('/auth')}>
            <Text style={styles.buttonText}>Back to Sign In</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.brand.background, padding: 24 },
  title: { color: Colors.brand.textPrimary, fontSize: 20, fontWeight: '600' },
  body: { color: Colors.brand.textSecondary, marginTop: 8, textAlign: 'center' },
  logo: { width: 200, height: 80, marginBottom: 16 },
  button: { backgroundColor: Colors.brand.accentMagenta, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 24, marginTop: 16 },
  buttonText: { color: Colors.brand.textOnGradient, fontSize: 16, fontWeight: '600' },
});


