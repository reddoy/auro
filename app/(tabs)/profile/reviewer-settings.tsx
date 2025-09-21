import React, { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform, Linking } from 'react-native';

import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { getCurrentProfile, updateProfile } from '@/lib/profile';
import type { Profile } from '@/types';
import { createStripeExpressLoginLink, createStripeExpressOnboardingLink } from '@/lib/payments';

export default function ReviewerSettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isReviewer, setIsReviewer] = useState(false);
  const [hourlyRate, setHourlyRate] = useState<string>('');
  const hourlyRateRef = useRef<any>(null);
  const [stripePortalUrl, setStripePortalUrl] = useState<string | null>(null);
  const [payoutsLoading, setPayoutsLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const p = await getCurrentProfile();
        setProfile(p);
        if (p) {
          setIsReviewer(!!p.is_reviewer);
          setHourlyRate(p.hourly_rate != null ? String(p.hourly_rate) : '');
          try {
            const link = await createStripeExpressLoginLink(p.id);
            setStripePortalUrl(link);
          } catch {}
        }
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload: Partial<Profile> = {
        is_reviewer: true,
        hourly_rate: hourlyRate ? Number(hourlyRate) : null,
        
      };
      const updated = await updateProfile(payload);
      setProfile(updated);
      Alert.alert('Saved', 'Your reviewer settings have been updated.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.select({ ios: 'interactive', default: 'on-drag' })}
        contentInsetAdjustmentBehavior="always"
      >
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Reviewer Settings</Text>
        <Text style={styles.hint}>Set your price per review. This appears on your request page.</Text>

        <LabeledInput label="Price per Review (optional)" value={hourlyRate} onChangeText={setHourlyRate} keyboardType="numeric" placeholder="e.g. 25" inputRef={hourlyRateRef} returnKeyType="done" blurOnSubmit />
        {!!hourlyRate && !isNaN(Number(hourlyRate)) && (
          <View style={{ marginTop: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.brand.border, backgroundColor: Colors.brand.cardBackground }}>
            {(() => {
              const price = Math.max(0, Number(hourlyRate) || 0);
              const auroFee = price * 0.15; // founders 15%
              const stripeFee = Math.max(0, price * 0.029 + 0.3); // estimate
              const net = Math.max(0, price - auroFee - stripeFee);
              return (
                <>
                  <Text style={{ color: Colors.brand.textSecondary }}>Your price: ${price.toFixed(2)}</Text>
                  <Text style={{ color: Colors.brand.textSecondary }}>Auro fee (15% founders): -${auroFee.toFixed(2)}</Text>
                  <Text style={{ color: Colors.brand.textSecondary }}>Stripe est. fee (2.9% + $0.30): -${stripeFee.toFixed(2)}</Text>
                  <Text style={{ color: Colors.brand.textPrimary, fontWeight: '900', marginTop: 4 }}>Estimated take-home: ${net.toFixed(2)}</Text>
                </>
              );
            })()}
          </View>
        )}
      </View>

      {/* Payouts section */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Payouts</Text>
        <Text style={styles.hint}>Get paid via Stripe. Use the button below to set up or open your Stripe dashboard.</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            style={[styles.saveButton, { flex: 1, opacity: payoutsLoading ? 0.7 : 1 }]}
            disabled={payoutsLoading}
            onPress={async () => {
              try {
                setPayoutsLoading(true);
                if (stripePortalUrl) {
                  console.log('[stripe-login] Opening', stripePortalUrl);
                  Linking.openURL(stripePortalUrl);
                  return;
                }
                const reviewerId = profile?.id || '';
                const url = await createStripeExpressOnboardingLink(reviewerId);
                console.log('[stripe-onboarding] reviewerId:', reviewerId, 'url:', url);
                if (url) {
                  Linking.openURL(url);
                } else {
                  Alert.alert('Stripe', 'Setup link not available. Check env EXPO_PUBLIC_SUPABASE_URL and function URL envs.');
                }
              } catch (e: any) {
                console.log('[stripe-onboarding] error', e?.message || e);
                Alert.alert('Stripe', e?.message || 'Failed to open Stripe');
              } finally {
                setPayoutsLoading(false);
              }
            }}
          >
            <Text style={styles.saveButtonText}>{payoutsLoading ? 'Loading…' : (stripePortalUrl ? 'Open Stripe Dashboard' : 'Set up Stripe Payouts')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.saveBar}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function LabeledInput(props: any) {
  const { label, style, multiline, numberOfLines, inputRef, ...rest } = props;
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...rest}
        ref={inputRef}
        style={[styles.input, multiline && { height: Math.max(96, (numberOfLines || 4) * 22) }, style]}
        placeholderTextColor={Colors.brand.textSecondary}
        multiline={multiline}
        numberOfLines={numberOfLines}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.brand.background },
  card: { margin: 16, backgroundColor: Colors.brand.cardBackground, borderRadius: 28, padding: 24, borderWidth: 1, borderColor: 'rgba(255, 111, 0, 0.1)', shadowColor: Colors.brand.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 8 },
  sectionTitle: { fontSize: 24, fontWeight: 'bold', fontFamily: 'Poppins_700Bold', color: Colors.brand.textPrimary, marginBottom: 12 },
  label: { fontSize: 16, color: Colors.brand.textSecondary, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: Colors.brand.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, color: Colors.brand.textPrimary, fontSize: 16 },
  hint: { marginBottom: 10, color: Colors.brand.textSecondary, fontSize: 14 },
  saveBar: { padding: 16 },
  saveButton: { backgroundColor: Colors.brand.accentMagenta, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});


