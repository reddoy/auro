import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, Alert, FlatList, Platform, Linking, Switch, View as RNView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';

import { Text, View } from '@/components/Themed';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import AvatarUploader from '@/components/AvatarUploader';
import { getCurrentProfile, updateProfile, getSignedAvatarUrl } from '@/lib/profile';
import type { Profile } from '@/types';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const p = await getCurrentProfile();
        setProfile(p);
      } finally {
      }
    };
    run();
  }, []);

  // Generate a signed URL for private bucket avatars (or use existing absolute URL)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const src = profile?.avatar_url || null;
      if (!src) {
        if (!cancelled) setAvatarUri(undefined);
        return;
      }
      if (/^https?:\/\//i.test(src)) {
        if (!cancelled) setAvatarUri(src);
        return;
      }
      const signed = await getSignedAvatarUrl(src, 3600);
      if (!cancelled) setAvatarUri(signed || undefined);
    };
    run();
    return () => { cancelled = true; };
  }, [profile?.avatar_url]);

  

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' ? window.confirm('Are you sure you want to log out?') : true;
      if (!confirmed) return;
      (async () => {
        try {
          await supabase.auth.signOut();
        } catch (e: any) {
          Alert.alert('Logout failed', e?.message || 'Please try again.');
          return;
        }
        router.replace('/');
      })();
      return;
    }

    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          try {
            await supabase.auth.signOut();
          } catch (e: any) {
            Alert.alert('Logout failed', e?.message || 'Please try again.');
            return;
          }
          // Go to the auth gate which will redirect to /auth when no session exists
          router.replace('/');
        },
      },
    ]);
  };

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const p = await getCurrentProfile();
      setProfile(p);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Refresh profile when screen gains focus so recent changes (e.g., become reviewer) show up
  useFocusEffect(
    useCallback(() => {
      onRefresh();
    }, [onRefresh])
  );

  

  return (
    <View style={styles.container}>
      <RNView style={{ height: insets.top, backgroundColor: Colors.brand.background, width: '100%' }} />
      <FlatList
        data={[]}
        keyExtractor={(item) => String(item)}
        renderItem={() => null}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListHeaderComponent={(
          <>
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <View style={styles.profileSection}>
                  <View style={styles.avatarContainer}>
                    <AvatarUploader
                      uri={avatarUri}
                      previousPathOrUrl={profile?.avatar_url || undefined as any}
                      onUploaded={async ({ publicUrl, path }) => {
                        let signed: string | null = null;
                        try {
                          const updated = await updateProfile({ avatar_url: path });
                          setProfile(updated);
                        } catch (e: any) {
                          Alert.alert('Profile not updated', 'Showing your new photo locally. Enable profile update policy in Supabase to persist.');
                        } finally {
                          try { signed = await getSignedAvatarUrl(path, 3600); } catch {}
                          setAvatarUri(signed || publicUrl || undefined);
                        }
                      }}
                      onRemoved={async () => {
                        try {
                          await updateProfile({ avatar_url: null });
                          setProfile(prev => (prev ? { ...prev, avatar_url: null } : prev));
                          setAvatarUri(undefined);
                        } catch (e: any) {
                          setAvatarUri(undefined);
                          Alert.alert('Profile not updated', 'Removed locally. Enable profile update policy in Supabase to persist.');
                        }
                      }}
                      size={94}
                      accessibilityLabel="Change avatar"
                    />
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{profile?.full_name || profile?.username || 'User'}</Text>
                    {!!profile?.created_at && (
                      <Text style={styles.userEmail}>Joined {new Date(profile.created_at).toLocaleDateString()}</Text>
                    )}
                  </View>
                </View>

                <TouchableOpacity style={styles.editButton} onPress={() => router.push('/(tabs)/profile/settings')} accessibilityLabel="Edit profile">
                  <ExpoLinearGradient
                    colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.editButtonGradient}
                  />
                  <Text style={styles.editButtonText}>Edit Profile</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.bioSection}>
              <Text style={styles.sectionTitle}>Reviewer Settings</Text>
              <Text style={{ color: Colors.brand.textSecondary }}>Control your reviewer status and price per review.</Text>
              <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.statusChip, profile?.is_reviewer && styles.statusChipActive]}>
                    <Text style={[styles.statusChipText, profile?.is_reviewer && styles.statusChipTextActive]}>
                      {profile?.is_reviewer ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: Colors.brand.textSecondary, marginRight: 10 }}>Reviewer Status</Text>
                  <Switch
                    value={!!profile?.is_reviewer}
                    onValueChange={async (val) => {
                      try {
                        const updated = await updateProfile({ is_reviewer: val });
                        setProfile(updated);
                        if (val) {
                          Alert.alert('Reviewer enabled', 'Your reviewer profile is now active.');
                        } else {
                          Alert.alert('Reviewer disabled', 'You will no longer appear as a reviewer.');
                        }
                      } catch (e: any) {
                        Alert.alert('Error', e?.message || 'Failed to update reviewer status');
                      }
                    }}
                  />
                </View>
              </View>
              {profile?.is_reviewer ? (
                <>
                  <View style={{ marginTop: 12 }}>
                    <Text style={{ color: Colors.brand.textSecondary, marginBottom: 8 }}>Price per Review</Text>
                    <View style={styles.priceCard}>
                      <Text style={styles.priceText}>{profile?.hourly_rate != null ? `$${profile.hourly_rate}/review` : 'Not set'}</Text>
                      <TouchableOpacity onPress={() => router.push('/(tabs)/profile/reviewer-settings')} accessibilityLabel="Edit rate" style={styles.editRateButton}>
                        <ExpoLinearGradient
                          colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.editRateGradient}
                        />
                        <Text style={styles.editRateText}>Edit</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              ) : (
                <View style={{ marginTop: 12 }}>
                  <Text style={{ color: Colors.brand.textSecondary }}>Turn on your reviewer profile to set a price and accept requests.</Text>
                  <View style={{ marginTop: 12, flexDirection: 'row' }}>
                    <TouchableOpacity onPress={() => router.push('/(tabs)/profile/become-reviewer')} style={styles.primaryCta} accessibilityLabel="Become a reviewer">
                      <Text style={styles.primaryCtaText}>Become a Reviewer</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {profile?.bio && (
              <View style={styles.bioSection}>
                <Text style={styles.sectionTitle}>Bio</Text>
                <Text style={styles.bioText}>{profile.bio}</Text>
              </View>
            )}

            {!!profile?.skills?.length && (
              <View style={styles.bioSection}>
                <Text style={styles.sectionTitle}>Skills</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {profile.skills!.map((s, idx) => (
                    <View key={`${s}-${idx}`} style={styles.skillChip}><Text style={styles.skillChipText}>{s}</Text></View>
                  ))}
                </View>
              </View>
            )}

            {!!(profile?.links?.twitter || profile?.links?.linkedin || profile?.links?.github) && (
              <View style={styles.bioSection}>
                <Text style={styles.sectionTitle}>Links</Text>
                <View style={{ flexDirection: 'row' }}>
                  {profile?.links?.twitter ? (
                    <TouchableOpacity onPress={() => Linking.openURL(profile.links!.twitter!)} style={styles.socialLinkBtn}><Text style={styles.socialLinkText}>Twitter</Text></TouchableOpacity>
                  ) : null}
                  {profile?.links?.linkedin ? (
                    <TouchableOpacity onPress={() => Linking.openURL(profile.links!.linkedin!)} style={styles.socialLinkBtn}><Text style={styles.socialLinkText}>LinkedIn</Text></TouchableOpacity>
                  ) : null}
                  {profile?.links?.github ? (
                    <TouchableOpacity onPress={() => Linking.openURL(profile.links!.github!)} style={styles.socialLinkBtn}><Text style={styles.socialLinkText}>GitHub</Text></TouchableOpacity>
                  ) : null}
                </View>
              </View>
            )}
          </>
        )}
        ListFooterComponent={(
          <>
            <View style={styles.actionsSection}>
              <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/(tabs)/profile/settings')} accessibilityLabel="Open account settings">
                <View style={styles.actionIconContainer}>
                  <ExpoLinearGradient
                    colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.actionIconGradient}
                  />
                  <Text style={styles.actionIcon}>⚙️</Text>
                </View>
                <Text style={styles.actionText}>Account Settings</Text>
                <Text style={styles.actionArrow}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dangerSection}>
              <TouchableOpacity style={styles.logoutButtonDark} onPress={handleLogout}>
                <View style={styles.logoutButtonBorder} />
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.brand.background },
  scrollView: { flex: 1, backgroundColor: 'transparent' },
  header: { paddingTop: 60, paddingBottom: 40, paddingHorizontal: 0, backgroundColor: Colors.brand.cardBackground, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, shadowColor: Colors.brand.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 12 },
  headerContent: { paddingHorizontal: 20, backgroundColor: 'transparent', width: '100%' },
  profileSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, backgroundColor: 'transparent' },
  avatarContainer: { position: 'relative', marginRight: 20, backgroundColor: 'transparent' },
  userInfo: { flex: 1, backgroundColor: 'transparent' },
  userName: { fontSize: 32, fontWeight: '700', fontFamily: 'Poppins_700Bold', color: Colors.brand.textPrimary, marginBottom: 4 },
  userEmail: { fontSize: 18, color: Colors.brand.textSecondary, marginBottom: 4, fontWeight: '500' },
  editButton: { paddingVertical: 16, paddingHorizontal: 36, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.brand.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 8, overflow: 'hidden', position: 'relative' },
  editButtonGradient: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 28 },
  editButtonText: { color: Colors.brand.textOnGradient, fontSize: 18, fontWeight: '700', zIndex: 1, textShadowColor: 'rgba(0, 0, 0, 0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  statsSection: { margin: 24, marginTop: 32, backgroundColor: Colors.brand.cardBackground, borderRadius: 28, padding: 28, shadowColor: Colors.brand.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 8, borderWidth: 0, overflow: 'hidden' },
  sectionTitle: { fontSize: 28, fontWeight: 'bold', fontFamily: 'Poppins_700Bold', color: Colors.brand.textPrimary, marginBottom: 18 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'transparent' },
  statCard: { alignItems: 'center', flex: 1, backgroundColor: 'transparent' },
  statNumber: { fontSize: 26, fontWeight: 'bold', color: Colors.brand.accentMagenta, marginBottom: 6 },
  statLabel: { fontSize: 13, color: Colors.brand.textSecondary, textAlign: 'center', fontWeight: '500' },
  bioSection: { margin: 24, backgroundColor: Colors.brand.cardBackground, borderRadius: 28, padding: 28, shadowColor: Colors.brand.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 12, borderWidth: 1, borderColor: 'rgba(255, 111, 0, 0.15)', overflow: 'hidden' },
  bioText: { fontSize: 18, color: Colors.brand.textSecondary, lineHeight: 26 },
  actionsSection: { margin: 24, backgroundColor: Colors.brand.cardBackground, borderRadius: 28, shadowColor: Colors.brand.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 8, borderWidth: 1, borderColor: 'rgba(255, 111, 0, 0.1)', overflow: 'hidden' },
  actionItem: { flexDirection: 'row', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: Colors.brand.divider, marginHorizontal: 4 },
  actionIconContainer: { width: 44, height: 44, borderRadius: 22, marginRight: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', shadowColor: Colors.brand.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },
  actionIconGradient: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 22 },
  actionIcon: { fontSize: 20, zIndex: 1 },
  actionText: { flex: 1, fontSize: 18, color: Colors.brand.textPrimary, fontWeight: '500' },
  actionArrow: { fontSize: 22, color: Colors.brand.textLight },
  dangerSection: { margin: 24, marginBottom: 120 },
  logoutButtonDark: { backgroundColor: Colors.brand.cardBackground, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, shadowColor: Colors.brand.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 6, overflow: 'hidden', position: 'relative' },
  logoutButtonBorder: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 26, borderWidth: 2, borderColor: 'rgba(255, 111, 0, 0.3)' },
  logoutText: { color: Colors.brand.textPrimary, fontSize: 18, fontWeight: 'bold', zIndex: 1 },
  // New enhanced component styles
  statusChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.brand.cardBackgroundLight, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  statusChipActive: { backgroundColor: 'rgba(255, 111, 0, 0.15)', borderColor: 'rgba(255, 111, 0, 0.3)' },
  statusChipText: { color: Colors.brand.textSecondary, fontSize: 14, fontWeight: '600' },
  statusChipTextActive: { color: Colors.brand.accentOrange, fontWeight: '700' },
  
  priceCard: { backgroundColor: Colors.brand.cardBackgroundLight, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
  priceText: { color: Colors.brand.textPrimary, fontWeight: '700', fontSize: 16 },
  
  skillChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.brand.cardBackgroundLight, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255, 111, 0, 0.1)' },
  skillChipText: { color: Colors.brand.textPrimary, fontSize: 14, fontWeight: '500' },
  
  socialLinkBtn: { backgroundColor: Colors.brand.cardBackgroundLight, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, marginRight: 8, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  socialLinkText: { color: Colors.brand.textPrimary, fontWeight: '600', fontSize: 14 },
  
  // Legacy styles (keeping for backward compatibility)
  segmentContainer: { flexDirection: 'row', backgroundColor: Colors.brand.cardBackgroundLight, borderRadius: 10, margin: 16, overflow: 'hidden' },
  segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: 'rgba(255,255,255,0.06)' },
  segmentText: { color: Colors.brand.textSecondary },
  segmentTextActive: { color: Colors.brand.textPrimary, fontWeight: '700' },
  reviewCard: { marginHorizontal: 16, backgroundColor: Colors.brand.cardBackgroundLight, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
  reviewAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.brand.cardBackground },
  emptyListWrapper: { paddingHorizontal: 24, paddingVertical: 8 },
  emptyList: { padding: 24, alignItems: 'center', borderRadius: 20, borderWidth: 1, borderColor: Colors.brand.divider },
  emptyListEmoji: { fontSize: 28, marginBottom: 6 },
  emptyListTitle: { color: Colors.brand.textPrimary, fontWeight: '700', marginBottom: 6 },
  emptyListText: { color: Colors.brand.textSecondary, textAlign: 'center', marginBottom: 10 },
  primaryCta: { backgroundColor: Colors.brand.accentMagenta, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  primaryCtaText: { color: '#fff', fontWeight: '700' },
  linkBtn: { backgroundColor: Colors.brand.cardBackgroundLight, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 8 },
  linkText: { color: Colors.brand.textPrimary, fontWeight: '600' },
  editRateButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', shadowColor: Colors.brand.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },
  editRateGradient: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 16 },
  editRateText: { color: Colors.brand.textOnGradient, fontWeight: '700', fontSize: 14, zIndex: 1, textShadowColor: 'rgba(0, 0, 0, 0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
});


