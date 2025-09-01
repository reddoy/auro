import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, TextInput, TouchableOpacity, View, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';

import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import AvatarUploader from '@/components/AvatarUploader';
import { getCurrentProfile, updateProfile } from '@/lib/profile';
import type { Profile, ReviewerPackage } from '@/types';

export default function ProfileSettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Local form state
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');
  const [twitter, setTwitter] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [github, setGithub] = useState('');
  const [isReviewer, setIsReviewer] = useState(false);
  const [hourlyRate, setHourlyRate] = useState<string>('');
  const [availability, setAvailability] = useState<string>('');
  const [packages, setPackages] = useState<ReviewerPackage[]>([]);
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const fullNameRef = useRef<any>(null);
  const usernameRef = useRef<any>(null);
  const skillsRef = useRef<any>(null);
  const twitterRef = useRef<any>(null);
  const linkedinRef = useRef<any>(null);
  const githubRef = useRef<any>(null);
  const hourlyRateRef = useRef<any>(null);
  const availabilityRef = useRef<any>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const p = await getCurrentProfile();
        setProfile(p);
        if (p) {
          setFullName(p.full_name || '');
          setUsername(p.username || '');
          setBio(p.bio || '');
          setSkills((p.skills || []).join(', '));
          setTwitter(p.links?.twitter || '');
          setLinkedin(p.links?.linkedin || '');
          setGithub(p.links?.github || '');
          setIsReviewer(!!p.is_reviewer);
          setHourlyRate(p.hourly_rate != null ? String(p.hourly_rate) : '');
          setAvailability(p.availability || '');
          setEmailNotif(p.preferences?.email_notifications ?? true);
          setPushNotif(p.preferences?.push_notifications ?? true);
          setAvatarUrl(p.avatar_url || null);
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
        Alert.alert('Error', e?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const handleUploaded = async ({ publicUrl }: { publicUrl: string; path: string }) => {
    try {
      setAvatarUrl(publicUrl);
      const updated = await updateProfile({ avatar_url: publicUrl });
      setProfile(updated);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update avatar');
    }
  };

  const handleRemoved = async () => {
    try {
      setAvatarUrl(null);
      const updated = await updateProfile({ avatar_url: null });
      setProfile(updated);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to remove avatar');
    }
  };

  const parsedSkills = useMemo(() => skills.split(',').map(s => s.trim()).filter(Boolean), [skills]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload: Partial<Profile> = {
        full_name: fullName || null,
        username: username || null,
        bio: bio || null,
        skills: parsedSkills.length ? parsedSkills : [],
        links: { twitter: twitter || null, linkedin: linkedin || null, github: github || null },
        is_reviewer: isReviewer,
        hourly_rate: hourlyRate ? Number(hourlyRate) : null,
        availability: availability || null,
        preferences: { email_notifications: emailNotif, push_notifications: pushNotif },
        avatar_url: avatarUrl || null,
        // Store as JSON array (up to 5 entries)
        // Schema: profiles.packages JSONB (optional). RLS should allow own row update.
        ...(isReviewer ? { packages: packages.slice(0, 5) } : {}),
      };
      const updated = await updateProfile(payload);
      setProfile(updated);
      Alert.alert('Saved', 'Your profile has been updated.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer]}> 
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
        <Text style={styles.sectionTitle}>Avatar</Text>
        <View style={{ alignItems: 'center', marginTop: 8 }}>
          <AvatarUploader uri={avatarUrl || undefined} onUploaded={handleUploaded} onRemoved={handleRemoved} size={110} accessibilityLabel="Change profile photo" previousPathOrUrl={avatarUrl || undefined as any} />
          <Text style={styles.hint}>Tap to change, long-press to remove</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Public Profile</Text>
        <LabeledInput label="Full Name" value={fullName} onChangeText={setFullName} placeholder="Your name" inputRef={fullNameRef} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => usernameRef.current?.focus()} />
        <LabeledInput label="Username" value={username} onChangeText={setUsername} placeholder="username" autoCapitalize="none" inputRef={usernameRef} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => skillsRef.current?.focus()} />
        <LabeledInput label="Bio" value={bio} onChangeText={setBio} placeholder="Tell us about yourself" multiline numberOfLines={4} />
        <LabeledInput label="Skills" value={skills} onChangeText={setSkills} placeholder="e.g. fashion, design, photography" inputRef={skillsRef} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => twitterRef.current?.focus()} />
        <LabeledInput label="Twitter" value={twitter} onChangeText={setTwitter} placeholder="https://twitter.com/username" autoCapitalize="none" inputRef={twitterRef} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => linkedinRef.current?.focus()} />
        <LabeledInput label="LinkedIn" value={linkedin} onChangeText={setLinkedin} placeholder="https://linkedin.com/in/username" autoCapitalize="none" inputRef={linkedinRef} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => githubRef.current?.focus()} />
        <LabeledInput label="GitHub" value={github} onChangeText={setGithub} placeholder="https://github.com/username" autoCapitalize="none" inputRef={githubRef} returnKeyType="done" blurOnSubmit />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Reviewer</Text>
        <LabeledSwitch label="Become a reviewer" value={isReviewer} onValueChange={setIsReviewer} />
        {isReviewer && (
          <>
            <LabeledInput label="Hourly Rate (optional)" value={hourlyRate} onChangeText={setHourlyRate} keyboardType="numeric" placeholder="e.g. 50" inputRef={hourlyRateRef} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => availabilityRef.current?.focus()} />
            <LabeledInput label="Availability (optional)" value={availability} onChangeText={setAvailability} placeholder="e.g. Weekends only" inputRef={availabilityRef} returnKeyType="done" blurOnSubmit />

            <Text style={[styles.label, { marginTop: 10 }]}>Session Packages (up to 5)</Text>
            {packages.map((p, idx) => (
              <View key={p.id} style={{ borderWidth: 1, borderColor: Colors.brand.border, borderRadius: 10, padding: 10, marginBottom: 10 }}>
                <LabeledInput label={`Label`} value={p.label} onChangeText={(v: string) => setPackages(prev => prev.map((x, i) => i === idx ? { ...x, label: v } : x))} placeholder="e.g. 3 × 30-minute sessions" />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <LabeledInput label="Minutes/session" value={String(p.minutes ?? '')} onChangeText={(v: string) => setPackages(prev => prev.map((x, i) => i === idx ? { ...x, minutes: v ? Number(v) : null } : x))} keyboardType="numeric" placeholder="30" />
                  </View>
                  <View style={{ flex: 1 }}>
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
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Privacy & Notifications</Text>
        <LabeledSwitch label="Email notifications" value={emailNotif} onValueChange={setEmailNotif} />
        <LabeledSwitch label="Push notifications" value={pushNotif} onValueChange={setPushNotif} />
      </View>

      <View style={styles.saveBar}>
        <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} disabled={saving} onPress={handleSave} accessibilityLabel="Save profile settings">
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

function LabeledSwitch(props: { label: string; value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.label}>{props.label}</Text>
      <Switch value={props.value} onValueChange={props.onValueChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.brand.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.brand.background },
  card: { margin: 16, backgroundColor: Colors.brand.cardBackground, borderRadius: 16, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.brand.textPrimary, marginBottom: 12 },
  label: { fontSize: 14, color: Colors.brand.textSecondary, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: Colors.brand.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: Colors.brand.textPrimary },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  hint: { marginTop: 8, color: Colors.brand.textSecondary, fontSize: 12 },
  saveBar: { padding: 16 },
  saveButton: { backgroundColor: Colors.brand.accentMagenta, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});


