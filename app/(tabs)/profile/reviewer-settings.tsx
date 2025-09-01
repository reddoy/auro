import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform } from 'react-native';

import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { getCurrentProfile, updateProfile } from '@/lib/profile';
import type { Profile, ReviewerPackage } from '@/types';

export default function ReviewerSettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isReviewer, setIsReviewer] = useState(false);
  const [hourlyRate, setHourlyRate] = useState<string>('');
  const [availability, setAvailability] = useState<string>('');
  const [packages, setPackages] = useState<ReviewerPackage[]>([]);

  useEffect(() => {
    const run = async () => {
      try {
        const p = await getCurrentProfile();
        setProfile(p);
        if (p) {
          setIsReviewer(!!p.is_reviewer);
          setHourlyRate(p.hourly_rate != null ? String(p.hourly_rate) : '');
          setAvailability(p.availability || '');
          const pkgs: ReviewerPackage[] = ((p as any).packages || []).slice(0, 5).map((x: any, idx: number) => ({
            id: x?.id || String(idx + 1),
            label: x?.label || '',
            minutes: x?.minutes ?? null,
            sessions: x?.sessions ?? null,
            price: x?.price ?? null,
          }));
          setPackages(pkgs);
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
        availability: availability || null,
        packages: packages.slice(0, 5),
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
        <Text style={styles.hint}>Set your rates and create up to 5 session packages. These appear on your request page.</Text>

        <LabeledInput label="Hourly Rate (optional)" value={hourlyRate} onChangeText={setHourlyRate} keyboardType="numeric" placeholder="e.g. 50" />
        <LabeledInput label="Availability (optional)" value={availability} onChangeText={setAvailability} placeholder="e.g. Weekends only" />

        <Text style={[styles.label, { marginTop: 10 }]}>Session Packages (up to 5)</Text>
        {packages.map((p, idx) => (
          <View key={p.id} style={{ borderWidth: 1, borderColor: Colors.brand.border, borderRadius: 10, padding: 10, marginBottom: 10 }}>
            <LabeledInput label={`Label`} value={p.label} onChangeText={(v: string) => setPackages(prev => prev.map((x, i) => i === idx ? { ...x, label: v } : x))} placeholder="e.g. 3 × 30-minute sessions" />
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1, paddingRight: 6 }}>
                <LabeledInput label="Minutes/session" value={String(p.minutes ?? '')} onChangeText={(v: string) => setPackages(prev => prev.map((x, i) => i === idx ? { ...x, minutes: v ? Number(v) : null } : x))} keyboardType="numeric" placeholder="30" />
              </View>
              <View style={{ flex: 1, paddingRight: 6 }}>
                <LabeledInput label="# Sessions" value={String(p.sessions ?? '')} onChangeText={(v: string) => setPackages(prev => prev.map((x, i) => i === idx ? { ...x, sessions: v ? Number(v) : null } : x))} keyboardType="numeric" placeholder="3" />
              </View>
              <View style={{ flex: 1 }}>
                <LabeledInput label="Price (USD)" value={String(p.price ?? '')} onChangeText={(v: string) => setPackages(prev => prev.map((x, i) => i === idx ? { ...x, price: v ? Number(v) : null } : x))} keyboardType="numeric" placeholder="99" />
              </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={() => setPackages(prev => prev.filter((_, i) => i !== idx))}>
                <Text style={{ color: Colors.brand.textSecondary }}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        {packages.length < 5 && (
          <TouchableOpacity style={{ borderWidth: 1, borderColor: Colors.brand.border, borderRadius: 10, padding: 12, alignItems: 'center' }} onPress={() => setPackages(prev => [...prev, { id: String(Date.now()), label: '', minutes: null, sessions: null, price: null }])}>
            <Text style={{ color: Colors.brand.textPrimary, fontWeight: '600' }}>+ Add Package</Text>
          </TouchableOpacity>
        )}
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
  const { label, style, multiline, numberOfLines, ...rest } = props;
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...rest}
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
  card: { margin: 16, backgroundColor: Colors.brand.cardBackground, borderRadius: 16, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.brand.textPrimary, marginBottom: 12 },
  label: { fontSize: 14, color: Colors.brand.textSecondary, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: Colors.brand.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: Colors.brand.textPrimary },
  hint: { marginBottom: 10, color: Colors.brand.textSecondary, fontSize: 12 },
  saveBar: { padding: 16 },
  saveButton: { backgroundColor: Colors.brand.accentMagenta, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});


