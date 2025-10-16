import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import Spinner from '@/components/Spinner';
import AvatarUploader from '@/components/AvatarUploader';
import { getCurrentProfile, updateProfile, getSignedAvatarUrl } from '@/lib/profile';
import type { Profile } from '@/types';

export default function ProfileSettingsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Local form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [linktree, setLinktree] = useState('');
  
  
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  // SMS 2FA disabled
  const [hasMFA, setHasMFA] = useState(false);
  const [checkingMFA, setCheckingMFA] = useState(false);

  const firstNameRef = useRef<any>(null);
  const lastNameRef = useRef<any>(null);
  const usernameRef = useRef<any>(null);
  const instagramRef = useRef<any>(null);
  const tiktokRef = useRef<any>(null);
  const linktreeRef = useRef<any>(null);
  
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
          // Split full name into first and last name
          const fullName = p.full_name || '';
          const nameParts = fullName.trim().split(' ');
          setFirstName(nameParts[0] || '');
          setLastName(nameParts.slice(1).join(' ') || '');
          setUsername(p.username || '');
          setBio(p.bio || '');
          setInstagram(normalizeHandle((p.links as any)?.instagram || ''));
          setTiktok(normalizeHandle((p.links as any)?.tiktok || ''));
          setLinktree(normalizeHandle((p.links as any)?.linktree || ''));
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


  const handleSave = async () => {
    try {
      setSaving(true);
      const links = {
        instagram: normalizeHandle(instagram) || null,
        tiktok: normalizeHandle(tiktok) || null,
        linktree: normalizeHandle(linktree) || null,
      } as any;
      const payload: Partial<Profile> = {
        full_name: `${firstName} ${lastName}`.trim() || null,
        username: username || null,
        bio: bio || null,
        links,
        preferences: { email_notifications: emailNotif, push_notifications: pushNotif },
        avatar_url: avatarUrl || null,
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
        <Spinner size={40} color={Colors.brand.accentMagenta} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>
      
      <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.select({ ios: 'interactive', default: 'on-drag' })}
          contentInsetAdjustmentBehavior="always"
        >
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Profile Picture</Text>
        <View style={{ alignItems: 'center', marginTop: 16 }}>
          <AvatarUploader uri={avatarUrl || undefined} onUploaded={handleUploaded} onRemoved={handleRemoved} size={120} accessibilityLabel="Change profile photo" previousPathOrUrl={avatarUrl || undefined as any} />
          <Text style={styles.hint}>Tap to change, long-press to remove</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Public Profile</Text>
        <View style={styles.nameRow}>
          <View style={styles.nameField}>
            <LabeledInput label="First Name" value={firstName} onChangeText={setFirstName} placeholder="First name" inputRef={firstNameRef} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => lastNameRef.current?.focus()} />
          </View>
          <View style={styles.nameField}>
            <LabeledInput label="Last Name" value={lastName} onChangeText={setLastName} placeholder="Last name" inputRef={lastNameRef} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => usernameRef.current?.focus()} />
          </View>
        </View>
        <LabeledInput label="Username" value={username} onChangeText={setUsername} placeholder="username" autoCapitalize="none" inputRef={usernameRef} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => instagramRef.current?.focus()} />
        <LabeledInput label="Bio" value={bio} onChangeText={setBio} placeholder="Tell us about yourself" multiline numberOfLines={4} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Social Media</Text>
        <LabeledInput label="Instagram" value={instagram} onChangeText={setInstagram} placeholder="instagram handle (no @)" autoCapitalize="none" inputRef={instagramRef} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => tiktokRef.current?.focus()} />
        <LabeledInput label="TikTok" value={tiktok} onChangeText={setTiktok} placeholder="tiktok handle (no @)" autoCapitalize="none" inputRef={tiktokRef} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => linktreeRef.current?.focus()} />
        <LabeledInput label="Linktree" value={linktree} onChangeText={setLinktree} placeholder="linktree handle (no @)" autoCapitalize="none" inputRef={linktreeRef} returnKeyType="done" blurOnSubmit />
        <Text style={styles.hint}>Enter handles only. We’ll build profile links automatically.</Text>
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
    </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: Colors.brand.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.brand.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: Colors.brand.cardBackground,
  },
  backButtonText: {
    fontSize: 24,
    color: Colors.brand.textPrimary,
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    fontFamily: 'Poppins_700Bold',
  },
  headerSpacer: {
    width: 40,
  },
  content: { flex: 1 },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.brand.background },
  card: { 
    margin: 20, 
    backgroundColor: Colors.brand.cardBackground, 
    borderRadius: 20, 
    padding: 24, 
    borderWidth: 0, 
    shadowColor: Colors.brand.shadow, 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.12, 
    shadowRadius: 20, 
    elevation: 8 
  },
  sectionTitle: { 
    fontSize: 22, 
    fontWeight: '700', 
    fontFamily: 'Poppins_700Bold', 
    color: Colors.brand.textPrimary, 
    marginBottom: 20 
  },
  label: { 
    fontSize: 15, 
    color: Colors.brand.textSecondary, 
    marginBottom: 8, 
    fontWeight: '500' 
  },
  input: { 
    borderWidth: 1.5, 
    borderColor: Colors.brand.border, 
    borderRadius: 12, 
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    color: Colors.brand.textPrimary, 
    fontSize: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.02)'
  },
  switchRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 12 
  },
  hint: { 
    marginTop: 12, 
    color: Colors.brand.textSecondary, 
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18
  },
  saveBar: { 
    padding: 20, 
    paddingBottom: 40 
  },
  saveButton: { 
    backgroundColor: Colors.brand.accentMagenta, 
    paddingVertical: 16, 
    borderRadius: 16, 
    alignItems: 'center',
    shadowColor: Colors.brand.accentMagenta,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6
  },
  saveButtonDisabled: { 
    opacity: 0.6 
  },
  saveButtonText: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: '700' 
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12
  },
  nameField: {
    flex: 1
  },
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


