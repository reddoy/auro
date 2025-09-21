import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, TextInput, TouchableOpacity, View, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import AvatarUploader from '@/components/AvatarUploader';
import { getCurrentProfile, updateProfile, getSignedAvatarUrl } from '@/lib/profile';
import type { Profile } from '@/types';

export default function ProfileSettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Local form state
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [linktree, setLinktree] = useState('');
  const [isReviewer, setIsReviewer] = useState(false);
  const [hourlyRate, setHourlyRate] = useState<string>('');
  
  
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  // SMS 2FA disabled
  const [hasMFA, setHasMFA] = useState(false);
  const [checkingMFA, setCheckingMFA] = useState(false);

  const fullNameRef = useRef<any>(null);
  const usernameRef = useRef<any>(null);
  const skillsRef = useRef<any>(null);
  const instagramRef = useRef<any>(null);
  const tiktokRef = useRef<any>(null);
  const linktreeRef = useRef<any>(null);
  const hourlyRateRef = useRef<any>(null);
  
  // Normalize any user-entered social value to a handle-only string (no leading '@', no URL)
  const normalizeHandle = (input: string): string => {
    const raw = (input || '').trim();
    if (!raw) return '';
    let working = raw;
    // If it's a URL, extract the last non-empty path segment
    try {
      const url = new URL(working);
      const segments = (url.pathname || '')
        .split('/')
        .map(s => s.trim())
        .filter(Boolean);
      if (segments.length) {
        working = segments[segments.length - 1];
      }
    } catch {}
    // Remove leading '@' if present and strip query/hash remnants
    working = working.replace(/^@+/, '').replace(/[#?].*$/, '');
    return working;
  };


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
          setInstagram(normalizeHandle((p.links as any)?.instagram || ''));
          setTiktok(normalizeHandle((p.links as any)?.tiktok || ''));
          setLinktree(normalizeHandle((p.links as any)?.linktree || ''));
          setIsReviewer(!!p.is_reviewer);
          setHourlyRate(p.hourly_rate != null ? String(p.hourly_rate) : '');
          // Resolve avatar to a displayable URL if it's a storage path
          let initialAvatar: string | null = p.avatar_url || null;
          if (initialAvatar && !/^https?:\/\//i.test(initialAvatar)) {
            try { initialAvatar = (await getSignedAvatarUrl(initialAvatar, 60 * 60 * 24 * 30)) || initialAvatar; } catch {}
          }
          setAvatarUrl(initialAvatar);

          setEmailNotif(p.preferences?.email_notifications ?? true);
          setPushNotif(p.preferences?.push_notifications ?? true);

        }
        
        // SMS 2FA disabled: skip MFA status check
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  // SMS 2FA disabled: no-op
  const checkMFAStatus = async () => {};

  const handleSetup2FA = () => {
    Alert.alert('Unavailable', 'SMS two-factor authentication is currently disabled.');
  };

  const handleDisable2FA = async () => {
    Alert.alert('Unavailable', 'SMS two-factor authentication is currently disabled.');
  };

  const handleUploaded = async ({ publicUrl, path }: { publicUrl: string; path: string }) => {
    try {
      // Prefer storing the storage path in DB; use signed URL for immediate display
      const displayUrl = publicUrl || (await getSignedAvatarUrl(path, 60 * 60 * 24 * 30)) || path;
      setAvatarUrl(displayUrl);
      const updated = await updateProfile({ avatar_url: path });
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
      const links = {
        instagram: normalizeHandle(instagram) || null,
        tiktok: normalizeHandle(tiktok) || null,
        linktree: normalizeHandle(linktree) || null,
      } as any;
      const payload: Partial<Profile> = {
        full_name: fullName || null,
        username: username || null,
        bio: bio || null,
        skills: parsedSkills.length ? parsedSkills : [],
        links,
        is_reviewer: isReviewer,
        hourly_rate: hourlyRate ? Number(hourlyRate) : null,
        preferences: { email_notifications: emailNotif, push_notifications: pushNotif },
        avatar_url: avatarUrl || null,
        // Store as JSON array (up to 5 entries)
        // Schema: profiles.packages JSONB (optional). RLS should allow own row update.
        
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
        <LabeledInput label="Skills" value={skills} onChangeText={setSkills} placeholder="e.g. fashion, design, photography" inputRef={skillsRef} returnKeyType="done" blurOnSubmit />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Social Media</Text>
        <LabeledInput label="Instagram" value={instagram} onChangeText={setInstagram} placeholder="instagram handle (no @)" autoCapitalize="none" inputRef={instagramRef} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => tiktokRef.current?.focus()} />
        <LabeledInput label="TikTok" value={tiktok} onChangeText={setTiktok} placeholder="tiktok handle (no @)" autoCapitalize="none" inputRef={tiktokRef} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => linktreeRef.current?.focus()} />
        <LabeledInput label="Linktree" value={linktree} onChangeText={setLinktree} placeholder="linktree handle (no @)" autoCapitalize="none" inputRef={linktreeRef} returnKeyType="done" blurOnSubmit />
        <Text style={styles.hint}>Enter handles only. We’ll build profile links automatically.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Reviewer</Text>
        <LabeledSwitch label="Become a reviewer" value={isReviewer} onValueChange={setIsReviewer} />
        {isReviewer && (
          <>
            <LabeledInput label="Price per Review (optional)" value={hourlyRate} onChangeText={setHourlyRate} keyboardType="numeric" placeholder="e.g. 25" inputRef={hourlyRateRef} returnKeyType="done" blurOnSubmit />
          </>
        )}
      </View>

      {/* SMS 2FA disabled: hide Security card */}

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
  card: { margin: 16, backgroundColor: Colors.brand.cardBackground, borderRadius: 28, padding: 24, borderWidth: 1, borderColor: 'rgba(255, 111, 0, 0.1)', shadowColor: Colors.brand.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 8 },
  sectionTitle: { fontSize: 24, fontWeight: 'bold', fontFamily: 'Poppins_700Bold', color: Colors.brand.textPrimary, marginBottom: 12 },
  label: { fontSize: 16, color: Colors.brand.textSecondary, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: Colors.brand.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, color: Colors.brand.textPrimary, fontSize: 16 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  hint: { marginTop: 8, color: Colors.brand.textSecondary, fontSize: 14 },
  saveBar: { padding: 16 },
  saveButton: { backgroundColor: Colors.brand.accentMagenta, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  securityRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 8,
    backgroundColor: 'transparent' 
  },
  securityInfo: { 
    flex: 1, 
    backgroundColor: 'transparent' 
  },
  securityDescription: { 
    fontSize: 14, 
    color: Colors.brand.textSecondary, 
    marginTop: 4 
  },
  securityButton: { 
    backgroundColor: Colors.brand.accentMagenta, 
    paddingVertical: 8, 
    paddingHorizontal: 16, 
    borderRadius: 16 
  },
  securityButtonDanger: { 
    backgroundColor: '#ff4444' 
  },
  securityButtonText: { 
    color: '#fff', 
    fontSize: 14, 
    fontWeight: '600' 
  },
  securityButtonTextDanger: { 
    color: '#fff' 
  },
});


