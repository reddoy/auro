import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View, ActivityIndicator, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';

import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { getCurrentProfile, updateProfile } from '@/lib/profile';
import type { Profile } from '@/types';

export default function BecomeReviewerScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [skills, setSkills] = useState('');
  const [hourlyRate, setHourlyRate] = useState<string>('');
  const [availability, setAvailability] = useState<string>('');
  const [agree, setAgree] = useState(false);

  const skillsRef = useRef<any>(null);
  const hourlyRateRef = useRef<any>(null);
  const availabilityRef = useRef<any>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const p = await getCurrentProfile();
        setProfile(p);
        if (p) {
          setSkills((p.skills || []).join(', '));
          setHourlyRate(p.hourly_rate != null ? String(p.hourly_rate) : '');
          setAvailability(p.availability || '');
        }
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const parsedSkills = useMemo(() => skills.split(',').map(s => s.trim()).filter(Boolean), [skills]);

  const handleSave = async () => {
    if (!agree) {
      Alert.alert('Required', 'Please agree to the reviewer terms.');
      return;
    }
    try {
      setSaving(true);
      const payload: Partial<Profile> = {
        is_reviewer: true,
        skills: parsedSkills.length ? parsedSkills : [],
        hourly_rate: hourlyRate ? Number(hourlyRate) : null,
        availability: availability || null,
      };
      await updateProfile(payload);
      Alert.alert('Welcome!', "You're now a reviewer.", [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.brand.accentMagenta} />
      </View>
    );
  }

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
        <Text style={styles.title}>Become a Reviewer</Text>
        <Text style={styles.subtitle}>Share your expertise by giving helpful, constructive feedback.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Reviewer Details</Text>
        <LabeledInput label="Skills" value={skills} onChangeText={setSkills} placeholder="e.g. fashion, lighting, posing" inputRef={skillsRef} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => hourlyRateRef.current?.focus()} />
        <LabeledInput label="Hourly Rate (optional)" value={hourlyRate} onChangeText={setHourlyRate} keyboardType="numeric" placeholder="e.g. 50" inputRef={hourlyRateRef} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => availabilityRef.current?.focus()} />
        <LabeledInput label="Availability (optional)" value={availability} onChangeText={setAvailability} placeholder="e.g. Weeknights, Weekends only" inputRef={availabilityRef} returnKeyType="done" blurOnSubmit />
        <View style={styles.switchRow}>
          <Text style={styles.label}>I agree to the reviewer terms</Text>
          <Switch value={agree} onValueChange={setAgree} />
        </View>
      </View>

      <View style={styles.saveBar}>
        <TouchableOpacity style={[styles.saveButton, (saving) && styles.saveButtonDisabled]} disabled={saving} onPress={handleSave} accessibilityLabel="Save and become a reviewer">
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save & Activate'}</Text>
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
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.brand.background },
  card: { margin: 16, backgroundColor: Colors.brand.cardBackground, borderRadius: 16, padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.brand.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 14, color: Colors.brand.textSecondary },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.brand.textPrimary, marginBottom: 12 },
  label: { fontSize: 14, color: Colors.brand.textSecondary, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: Colors.brand.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: Colors.brand.textPrimary },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  saveBar: { padding: 16 },
  saveButton: { backgroundColor: Colors.brand.accentMagenta, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});


