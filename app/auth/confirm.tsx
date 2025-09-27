import React, { useEffect, useState } from 'react';
import { StyleSheet, Image, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';

export default function ConfirmEmailScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [sending, setSending] = useState(false);
  const [cooldownSec, setCooldownSec] = useState(0);

  useEffect(() => {
    if (cooldownSec <= 0) return;
    const t = setInterval(() => setCooldownSec((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldownSec]);

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
        colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
        style={styles.backgroundGradient}
      />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <ExpoLinearGradient
          colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <Image source={require('@/Auro_side_side_no_bg.png')} style={styles.logoTop} resizeMode="contain" />
            <Text style={styles.tagline}>Your Aura, Amplified</Text>
          </View>
        </ExpoLinearGradient>

        <View style={styles.card}>
          <Image source={require('@/Auro_side_side_no_bg.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>Please confirm your email</Text>
          {!!email && <Text style={styles.body}>We sent a link to {email}.</Text>}
          {!email && <Text style={styles.body}>We sent a confirmation link to your inbox.</Text>}

          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/auth')}>
            <Text style={styles.primaryBtnText}>Back to Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.secondaryBtn, (sending || cooldownSec > 0) && { opacity: 0.7 }]} disabled={sending || cooldownSec > 0} onPress={handleResend}>
            {sending ? (
              <ActivityIndicator color={Colors.brand.textOnGradient} />
            ) : (
              <Text style={styles.secondaryBtnText}>{cooldownSec > 0 ? `Resend in ${cooldownSec}s` : 'Resend verification email'}</Text>
            )}
          </TouchableOpacity>
        </View>
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
  card: { margin: 28, backgroundColor: Colors.brand.cardBackground, borderRadius: 32, padding: 28, alignItems: 'center', shadowColor: Colors.brand.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 12, borderWidth: 0 },
  logo: { width: 200, height: 80, marginBottom: 12 },
  title: { color: Colors.brand.textPrimary, fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  body: { color: Colors.brand.textSecondary, textAlign: 'center', marginBottom: 16 },
  primaryBtn: { backgroundColor: Colors.brand.accentMagenta, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 24, marginTop: 8, width: 260, alignItems: 'center' },
  primaryBtnText: { color: Colors.brand.textOnGradient, fontSize: 16, fontWeight: '600' },
  secondaryBtn: { backgroundColor: Colors.brand.cardBackground, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 24, marginTop: 12, width: 260, alignItems: 'center', borderWidth: 1, borderColor: Colors.brand.divider },
  secondaryBtnText: { color: Colors.brand.textPrimary, fontSize: 16, fontWeight: '600' },
});


