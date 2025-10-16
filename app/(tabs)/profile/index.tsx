import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, Alert, FlatList, Platform, Linking, Switch, View as RNView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import Clipboard from '@react-native-clipboard/clipboard';

import { Text, View } from '@/components/Themed';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import AvatarUploader from '@/components/AvatarUploader';
import { getCurrentProfile, updateProfile, getSignedAvatarUrl } from '@/lib/profile';
import type { Profile } from '@/types';
import { createStripeExpressLoginLink, createStripeExpressOnboardingLink } from '@/lib/payments';
import { getRequestsByReviewer } from '@/lib/api';

const socialIcons = {
  instagram: require('../../../Instagram_icon-removebg-preview.png'),
  tiktok: require('../../../tiktok-icon-free-png-removebg-preview.png'),
  linktree: require('../../../linktreelogo.png'),
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [stripePortalUrl, setStripePortalUrl] = useState<string | null>(null);
  const [earnings, setEarnings] = useState({ total: 0, count: 0, average: 0, pendingAmount: 0, pendingCount: 0 });

  useEffect(() => {
    const run = async () => {
      try {
        const p = await getCurrentProfile();
        setProfile(p);
        if (p?.id && p?.is_reviewer) {
          try {
            const link = await createStripeExpressLoginLink(p.id);
            setStripePortalUrl(link);
          } catch {}
          // Fetch earnings data
          try {
            const requests = await getRequestsByReviewer(p.id);
            const completedRequests = requests.filter(r => r.status === 'completed' && r.net_amount_cents);
            const pendingRequests = requests.filter(r => r.status === 'pending' && r.amount_cents);
            const totalEarnings = completedRequests.reduce((sum, r) => sum + (r.net_amount_cents || 0), 0);
            const pendingAmount = pendingRequests.reduce((sum, r) => sum + (r.amount_cents || 0), 0);
            const count = completedRequests.length;
            const pendingCount = pendingRequests.length;
            const average = count > 0 ? totalEarnings / count : 0;
            setEarnings({ 
              total: totalEarnings / 100, 
              count, 
              average: average / 100, 
              pendingAmount: pendingAmount / 100, 
              pendingCount 
            }); // Convert cents to dollars
          } catch (e) {
            console.log('[earnings] error fetching', e);
          }
        } else {
          setStripePortalUrl(null);
          setEarnings({ total: 0, count: 0, average: 0, pendingAmount: 0, pendingCount: 0 });
        }
      } finally {
      }
    };
    run();
  }, []);

  // Generate a signed URL for private bucket avatars (always attempt to re-sign even if https)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const raw = (profile?.avatar_url || '').trim().replace(/^@+/, '');
      if (!raw) {
        if (!cancelled) setAvatarUri(undefined);
        return;
      }
      // Always try to re-sign (handles stored public/signed Supabase URLs and bucket paths)
      let finalUri: string | undefined = raw;
      try {
        const signed = await getSignedAvatarUrl(raw, 60 * 60 * 24 * 30);
        if (signed) finalUri = signed;
      } catch {}
      if (!cancelled) setAvatarUri(finalUri || undefined);
    };
    run();
    return () => { cancelled = true; };
  }, [profile?.avatar_url]);

  // Debug: expose the current access token and user id when the profile tab loads
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const userId = session?.user?.id;
        console.log('[profile] auth session', { userId, hasToken: !!token });
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          (window as any).__auroSession = { token, userId };
        }
      } catch (e) {
        console.log('[profile] getSession error', e);
      }
    })();
  }, []);

  

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

  const handleCopyReviewerLink = useCallback(async () => {
    if (!profile?.is_reviewer) {
      Alert.alert('Not a Reviewer', 'You need to be an active reviewer to copy your link.');
      return;
    }

    try {
      // Use username if available, otherwise fall back to ID
      const slug = profile.username || profile.id;
      const reviewerUrl = `https://www.appauro.com/${slug}`;
      
      await Clipboard.setString(reviewerUrl);
      Alert.alert('Copied!', 'Your reviewer link has been copied to clipboard. You can now paste it in your social media bios!');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy link to clipboard');
    }
  }, [profile]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const p = await getCurrentProfile();
      setProfile(p);
      if (p?.id && p?.is_reviewer) {
        try {
          const link = await createStripeExpressLoginLink(p.id);
          setStripePortalUrl(link);
        } catch {}
        // Refresh earnings data
        try {
          const requests = await getRequestsByReviewer(p.id);
          const completedRequests = requests.filter(r => r.status === 'completed' && r.net_amount_cents);
          const pendingRequests = requests.filter(r => r.status === 'pending' && r.amount_cents);
          const totalEarnings = completedRequests.reduce((sum, r) => sum + (r.net_amount_cents || 0), 0);
          const pendingAmount = pendingRequests.reduce((sum, r) => sum + (r.amount_cents || 0), 0);
          const count = completedRequests.length;
          const pendingCount = pendingRequests.length;
          const average = count > 0 ? totalEarnings / count : 0;
          setEarnings({ 
            total: totalEarnings / 100, 
            count, 
            average: average / 100, 
            pendingAmount: pendingAmount / 100, 
            pendingCount 
          });
        } catch {}
      }
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
              
              {profile?.is_reviewer ? (
                <>
                  {/* Earnings Tracker - Moved to top */}
                  <View style={{ marginTop: 12, backgroundColor: Colors.brand.cardBackground }}>
                    <Text style={{ color: Colors.brand.textSecondary, marginBottom: 8 }}>💰 Earnings Overview</Text>
                    <View style={styles.earningsCard}>
                      <View style={styles.earningsHeaderMobile}>
                        <View style={{ backgroundColor: 'transparent', marginBottom: 16 }}>
                          <Text style={styles.earningsLabel}>Total Earned</Text>
                          <Text style={styles.earningsTotal}>${earnings.total.toFixed(2)}</Text>
                        </View>
                        <TouchableOpacity
                          onPress={async () => {
                            try {
                              if (stripePortalUrl) {
                                console.log('[stripe-login] Opening', stripePortalUrl);
                                Linking.openURL(stripePortalUrl);
                                return;
                              }
                              const reviewerId = profile?.id || '';
                              const url = await createStripeExpressOnboardingLink(reviewerId);
                              console.log('[stripe-onboarding] reviewerId:', reviewerId, 'url:', url);
                              if (url) Linking.openURL(url);
                              else Alert.alert('Stripe', 'Setup link not available. Check env EXPO_PUBLIC_SUPABASE_URL and function URL envs.');
                            } catch (e: any) {
                              console.log('[stripe-onboarding] error', e?.message || e);
                              Alert.alert('Stripe', e?.message || 'Failed to open Stripe');
                            }
                          }}
                          accessibilityLabel={stripePortalUrl ? 'Open Stripe Dashboard' : 'Set up Stripe payouts'}
                          style={styles.stripeDashboardButtonMobile}
                        >
                          <ExpoLinearGradient
                            colors={['#635BFF', '#4F46E5']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.stripeDashboardGradient}
                          />
                          <Text style={styles.stripeDashboardText}>
                            {stripePortalUrl ? '🔗 Dashboard' : '⚡ Setup Stripe'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.earningsStats}>
                        <View style={styles.earningStat}>
                          <ExpoLinearGradient
                            colors={['rgba(16, 185, 129, 0.15)', 'rgba(5, 150, 105, 0.15)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.earningStatBg}
                          />
                          <Text style={styles.earningStatNumber}>{earnings.count}</Text>
                          <Text style={styles.earningStatLabel}>Completed Reviews</Text>
                        </View>
                        <View style={styles.earningStat}>
                          <ExpoLinearGradient
                            colors={['rgba(255, 193, 7, 0.15)', 'rgba(255, 152, 0, 0.15)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.earningStatBg}
                          />
                          <Text style={styles.earningStatNumber}>${earnings.pendingAmount.toFixed(2)}</Text>
                          <Text style={styles.earningStatLabel}>Pending Requests</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </>
              ) : null}
              
              {/* Reviewer Status Toggle */}
              <View style={styles.reviewerStatusRow}>
                <Text style={styles.reviewerStatusLabel}>Reviewer Status</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'transparent' }}>
                  <View style={[styles.statusIndicator, profile?.is_reviewer && styles.statusIndicatorActive]}>
                    <Text style={[styles.statusIndicatorText, profile?.is_reviewer && styles.statusIndicatorTextActive]}>
                      {profile?.is_reviewer ? '● Active' : '● Inactive'}
                    </Text>
                  </View>
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
                    trackColor={{ false: '#3e3e3e', true: '#10b981' }}
                    thumbColor={profile?.is_reviewer ? '#ffffff' : '#f4f3f4'}
                  />
                </View>
              </View>
              {profile?.is_reviewer ? (
                <>
                  <View style={{ marginTop: 12, backgroundColor: Colors.brand.cardBackground }}>
                    <Text style={{ color: Colors.brand.textSecondary, marginBottom: 8 }}>Share Your Reviewer Profile</Text>
                    <View style={styles.priceCard}>
                      <Text style={[styles.priceText, { flex: 1, marginRight: 12, fontSize: 14 }]} numberOfLines={1} ellipsizeMode="middle">
                        {`appauro.com/${profile.username || profile.id}`}
                      </Text>
                      <TouchableOpacity onPress={handleCopyReviewerLink} accessibilityLabel="Copy reviewer link" style={styles.copyLinkButton}>
                        <ExpoLinearGradient
                          colors={['#10b981', '#059669']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.editRateGradient}
                        />
                        <Text style={styles.editRateText}>📋 Copy</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={{ marginTop: 12, backgroundColor: Colors.brand.cardBackground }}>
                    <Text style={{ color: Colors.brand.textSecondary, marginBottom: 8 }}>Price per Review</Text>
                    <View style={styles.priceCard}>
                      <Text style={styles.priceText}>{profile?.hourly_rate != null ? `$${profile.hourly_rate}/review` : 'Tap to set your rate →'}</Text>
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
              ) : null}
            </View>

            {profile?.bio && (
              <View style={styles.bioSection}>
                <Text style={styles.sectionTitle}>Bio</Text>
                <Text style={styles.bioText}>{profile.bio}</Text>
              </View>
            )}

            {!!profile?.links && (
              <View style={styles.bioSection}>
                <Text style={styles.sectionTitle}>Socials</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', backgroundColor: Colors.brand.cardBackground }}>
                  {(() => {
                    const items: { label: string; url: string; key: 'instagram' | 'tiktok' | 'linktree' }[] = [];
                    const l: any = profile?.links || {};
                    const ig = (l.instagram || '').trim();
                    const tt = (l.tiktok || '').trim();
                    const lt = (l.linktree || '').trim();
                    if (ig) items.push({ label: 'Instagram', url: `https://instagram.com/${ig.replace(/^@+/, '')}`, key: 'instagram' });
                    if (tt) items.push({ label: 'TikTok', url: `https://www.tiktok.com/@${tt.replace(/^@+/, '')}`, key: 'tiktok' });
                    if (lt) items.push({ label: 'Linktree', url: `https://linktr.ee/${lt.replace(/^@+/, '')}`, key: 'linktree' });
                    return items.map((it, idx) => (
                      <TouchableOpacity key={`${it.label}-${idx}`} onPress={() => Linking.openURL(it.url)} style={styles.socialLinkBtn}>
                        <Image source={socialIcons[it.key]} style={styles.socialIcon} resizeMode="contain" />
                        <Text style={styles.socialLinkText}>{it.label}</Text>
                      </TouchableOpacity>
                    ));
                  })()}
                </View>
              </View>
            )}

            {/* Removed separate payouts banner; consolidated into Reviewer Settings card above */}

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

              <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/profile/video-review-demo' as any)} accessibilityLabel="Open video review demo">
                <View style={styles.actionIconContainer}>
                  <ExpoLinearGradient
                    colors={[Colors.brand.accentOrange, Colors.brand.primary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.actionIconGradient}
                  />
                  <Text style={styles.actionIcon}>🎥</Text>
                </View>
                <Text style={styles.actionText}>Video Review Demo</Text>
                <Text style={styles.actionArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/(tabs)/profile/hinge-clone')} accessibilityLabel="Open Hinge profile clone">
                <View style={styles.actionIconContainer}>
                  <ExpoLinearGradient
                    colors={['#FF6B6B', '#FF8E8E']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.actionIconGradient}
                  />
                  <Text style={styles.actionIcon}>💕</Text>
                </View>
                <Text style={styles.actionText}>Hinge Profile Clone</Text>
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
  bioSection: { margin: 24, backgroundColor: Colors.brand.cardBackground, borderRadius: 28, padding: 28, shadowColor: Colors.brand.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 12, borderWidth: 2, borderColor: Colors.brand.accentOrange, overflow: 'hidden' },
  bioText: { fontSize: 18, color: Colors.brand.textSecondary, lineHeight: 26 },
  actionsSection: { margin: 24, backgroundColor: Colors.brand.cardBackground, borderRadius: 28, shadowColor: Colors.brand.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 8, borderWidth: 2, borderColor: Colors.brand.accentOrange, overflow: 'hidden' },
  actionItem: { flexDirection: 'row', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: Colors.brand.divider, marginHorizontal: 4 },
  actionIconContainer: { width: 44, height: 44, borderRadius: 22, marginRight: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', shadowColor: Colors.brand.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },
  actionIconGradient: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 22 },
  actionIcon: { fontSize: 20, zIndex: 1 },
  actionText: { flex: 1, fontSize: 18, color: Colors.brand.textPrimary, fontWeight: '500' },
  actionArrow: { fontSize: 22, color: Colors.brand.textLight },
  dangerSection: { margin: 24, marginBottom: 120 },
  logoutButtonDark: { backgroundColor: Colors.brand.cardBackground, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, shadowColor: Colors.brand.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 6, overflow: 'hidden', position: 'relative', borderWidth: 2, borderColor: Colors.brand.accentOrange },
  logoutButtonBorder: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 26, borderWidth: 2, borderColor: Colors.brand.accentOrange },
  logoutText: { color: Colors.brand.textPrimary, fontSize: 18, fontWeight: 'bold', zIndex: 1 },
  // New enhanced component styles
  statusChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.brand.cardBackgroundLight, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  statusChipActive: { backgroundColor: 'rgba(255, 111, 0, 0.15)', borderColor: 'rgba(255, 111, 0, 0.3)' },
  statusChipText: { color: Colors.brand.textSecondary, fontSize: 14, fontWeight: '600' },
  statusChipTextActive: { color: Colors.brand.accentOrange, fontWeight: '700' },
  
  // Reviewer status row
  reviewerStatusRow: {
    marginTop: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: Colors.brand.cardBackgroundLight,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  reviewerStatusLabel: {
    color: Colors.brand.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  statusIndicatorActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusIndicatorText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '700',
  },
  statusIndicatorTextActive: {
    color: '#10b981',
  },
  
  priceCard: { backgroundColor: Colors.brand.cardBackgroundLight, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
  priceText: { color: Colors.brand.textPrimary, fontWeight: '700', fontSize: 16 },
  
  skillChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.brand.cardBackgroundLight, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255, 111, 0, 0.1)' },
  skillChipText: { color: Colors.brand.textPrimary, fontSize: 14, fontWeight: '500' },
  
  socialLinkBtn: { backgroundColor: 'rgba(32,21,50,1.00)', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, marginRight: 8, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', flexDirection: 'row', alignItems: 'center' },
  socialLinkText: { color: Colors.brand.textPrimary, fontWeight: '700', fontSize: 16 },
  socialIcon: { width: 20, height: 20, marginRight: 10, borderRadius: 4 },
  
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
  copyLinkButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', shadowColor: '#10b981', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },
  
  // Earnings tracker styles
  earningsCard: { 
    backgroundColor: 'rgba(32, 21, 50, 0.8)', 
    borderRadius: 24, 
    padding: 20, 
    borderWidth: 1.5, 
    borderColor: 'rgba(255, 111, 0, 0.2)',
    shadowColor: Colors.brand.accentOrange,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  earningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  earningsHeaderMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    backgroundColor: 'transparent',
  },
  earningsLabel: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  earningsTotal: {
    fontSize: 40,
    fontWeight: '800',
    color: Colors.brand.textPrimary,
    fontFamily: 'Poppins_700Bold',
    textShadowColor: 'rgba(255, 111, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  stripeDashboardButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#635BFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  stripeDashboardButtonMobile: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#635BFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    width: '100%',
  },
  stripeDashboardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 20,
  },
  stripeDashboardText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    zIndex: 1,
    letterSpacing: 0.5,
  },
  earningsStats: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'transparent',
  },
  earningStat: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  earningStatBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 18,
  },
  earningStatNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.brand.textPrimary,
    marginBottom: 4,
    zIndex: 1,
    fontFamily: 'Poppins_700Bold',
  },
  earningStatLabel: {
    fontSize: 12,
    color: Colors.brand.textSecondary,
    fontWeight: '600',
    zIndex: 1,
    letterSpacing: 0.5,
  },
});


