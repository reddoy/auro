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
  const [x, setX] = useState('');
  const [youtube, setYoutube] = useState('');
  const [onlyfans, setOnlyfans] = useState('');
  const [isReviewer, setIsReviewer] = useState(false);
  const [hourlyRate, setHourlyRate] = useState<string>('');
  
  
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [hasMFA, setHasMFA] = useState(false);
  const [checkingMFA, setCheckingMFA] = useState(false);

  const fullNameRef = useRef<any>(null);
  const usernameRef = useRef<any>(null);
  const skillsRef = useRef<any>(null);
  const instagramRef = useRef<any>(null);
  const tiktokRef = useRef<any>(null);
  const xRef = useRef<any>(null);
  const youtubeRef = useRef<any>(null);
  const onlyfansRef = useRef<any>(null);
  const hourlyRateRef = useRef<any>(null);
  

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
          setInstagram((p.links as any)?.instagram || '');
          setTiktok((p.links as any)?.tiktok || '');
          setX((p.links as any)?.x || (p.links as any)?.twitter || '');
          setYoutube((p.links as any)?.youtube || '');
          setOnlyfans((p.links as any)?.onlyfans || '');
          setIsReviewer(!!p.is_reviewer);
          setHourlyRate(p.hourly_rate != null ? String(p.hourly_rate) : '');
          // Resolve avatar to a displayable URL if it's a storage path
          let initialAvatar: string | null = p.avatar_url || null;
          if (initialAvatar && !/^https?:\/\//i.test(initialAvatar)) {
            try { initialAvatar = (await getSignedAvatarUrl(initialAvatar, 3600)) || initialAvatar; } catch {}
          }
          setAvatarUrl(initialAvatar);

          setEmailNotif(p.preferences?.email_notifications ?? true);
          setPushNotif(p.preferences?.push_notifications ?? true);

        }
        
        // Check MFA status
        await checkMFAStatus();
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const checkMFAStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('user_two_factor')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setHasMFA(data && data.enabled);
    } catch (error) {
      console.error('Error checking SMS 2FA status:', error);
    }
  };

  const handleSetup2FA = () => {
    router.push('/two-factor-setup');
  };

  const handleDisable2FA = async () => {
    Alert.alert(
      'Disable SMS Two-Factor Authentication',
      'Are you sure you want to disable SMS 2FA? This will make your account less secure.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Disable', 
          style: 'destructive',
          onPress: async () => {
            try {
              setCheckingMFA(true);
              
              const { error } = await supabase
                .from('user_two_factor')
                .update({ enabled: false, updated_at: new Date().toISOString() })
                .eq('user_id', (await supabase.auth.getUser()).data.user?.id);
                
              if (error) throw error;
              
              setHasMFA(false);
              Alert.alert('Success', 'SMS two-factor authentication has been disabled.');
            } catch (error: any) {
              Alert.alert('Error', 'Failed to disable SMS 2FA: ' + error.message);
            } finally {
              setCheckingMFA(false);
            }
          }
        }
      ]
    );
  };

  const handleUploaded = async ({ publicUrl, path }: { publicUrl: string; path: string }) => {
    try {
      // Prefer storing the storage path in DB; use signed URL for immediate display
      const displayUrl = publicUrl || (await getSignedAvatarUrl(path, 3600)) || path;
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
      const payload: Partial<Profile> = {
        full_name: fullName || null,
        username: username || null,
        bio: bio || null,
        skills: parsedSkills.length ? parsedSkills : [],
        links: { 
          instagram: instagram || null, 
          tiktok: tiktok || null, 
          x: x || null, 
          youtube: youtube || null, 
          onlyfans: onlyfans || null 
        },
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
        <LabeledInput label="Instagram" value={instagram} onChangeText={setInstagram} placeholder="@username or https://instagram.com/username" autoCapitalize="none" inputRef={instagramRef} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => tiktokRef.current?.focus()} />
        <LabeledInput label="TikTok" value={tiktok} onChangeText={setTiktok} placeholder="@username or https://tiktok.com/@username" autoCapitalize="none" inputRef={tiktokRef} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => xRef.current?.focus()} />
        <LabeledInput label="X (Twitter)" value={x} onChangeText={setX} placeholder="@username or https://x.com/username" autoCapitalize="none" inputRef={xRef} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => youtubeRef.current?.focus()} />
        <LabeledInput label="YouTube" value={youtube} onChangeText={setYoutube} placeholder="@username or channel URL" autoCapitalize="none" inputRef={youtubeRef} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => onlyfansRef.current?.focus()} />
        <LabeledInput label="OnlyFans" value={onlyfans} onChangeText={setOnlyfans} placeholder="@username or profile URL" autoCapitalize="none" inputRef={onlyfansRef} returnKeyType="done" blurOnSubmit />
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

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Security</Text>
        <View style={styles.securityRow}>
          <View style={styles.securityInfo}>
            <Text style={styles.label}>SMS Two-Factor Authentication</Text>
            <Text style={styles.securityDescription}>
              {hasMFA ? 'Enabled - SMS codes protect your account' : 'Secure your account with SMS verification'}
            </Text>
          </View>
          {checkingMFA ? (
            <ActivityIndicator color={Colors.brand.accentMagenta} />
          ) : (
            <TouchableOpacity 
              style={[styles.securityButton, hasMFA && styles.securityButtonDanger]} 
              onPress={hasMFA ? handleDisable2FA : handleSetup2FA}
            >
              <Text style={[styles.securityButtonText, hasMFA && styles.securityButtonTextDanger]}>
                {hasMFA ? 'Disable' : 'Enable'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
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


