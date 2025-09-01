import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, Image, Alert, FlatList, Platform } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';

import { Text, View } from '@/components/Themed';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import AvatarUploader from '@/components/AvatarUploader';
import { getCurrentProfile, updateProfile, getReviewsGiven, getReviewsReceived, getReviewStats, getSignedAvatarUrl } from '@/lib/profile';
import type { Profile, UserReview } from '@/types';

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<{ given: number; received: number; avgReceivedRating: number }>({ given: 0, received: 0, avgReceivedRating: 0 });
  const [segment, setSegment] = useState<'given' | 'received'>('received');
  const [listGiven, setListGiven] = useState<UserReview[]>([]);
  const [listReceived, setListReceived] = useState<UserReview[]>([]);
  const [pageGiven, setPageGiven] = useState<number | null>(1);
  const [pageReceived, setPageReceived] = useState<number | null>(1);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const p = await getCurrentProfile();
        setProfile(p);
        if (p?.id) {
          const s = await getReviewStats(p.id);
          setStats(s);
          const [given, received] = await Promise.all([
            getReviewsGiven(p.id, { page: 1, pageSize: 10 }),
            getReviewsReceived(p.id, { page: 1, pageSize: 10 }),
          ]);
          setListGiven(given.items);
          setListReceived(received.items);
          setPageGiven(given.nextPage);
          setPageReceived(received.nextPage);
        }
      } finally {
        setLoading(false);
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

  const avgRating = stats.avgReceivedRating || 0;

  const hasNextPage = useMemo(() => {
    return segment === 'given' ? !!pageGiven : !!pageReceived;
  }, [segment, pageGiven, pageReceived]);

  useEffect(() => {
    setLoadingMore(false);
  }, [segment]);

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
      if (p?.id) {
        const s = await getReviewStats(p.id);
        setStats(s);
        const [given, received] = await Promise.all([
          getReviewsGiven(p.id, { page: 1, pageSize: 10 }),
          getReviewsReceived(p.id, { page: 1, pageSize: 10 }),
        ]);
        setListGiven(given.items);
        setListReceived(received.items);
        setPageGiven(given.nextPage);
        setPageReceived(received.nextPage);
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

  const loadMore = useCallback(async () => {
    if (loadingMore || !profile?.id || !hasNextPage) return;
    setLoadingMore(true);
    try {
      if (segment === 'given' && pageGiven) {
        const res = await getReviewsGiven(profile.id, { page: pageGiven, pageSize: 10 });
        setListGiven(prev => [...prev, ...res.items]);
        setPageGiven(res.nextPage);
      } else if (segment === 'received' && pageReceived) {
        const res = await getReviewsReceived(profile.id, { page: pageReceived, pageSize: 10 });
        setListReceived(prev => [...prev, ...res.items]);
        setPageReceived(res.nextPage);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, profile?.id, segment, pageGiven, pageReceived, hasNextPage]);

  

  return (
    <View style={styles.container}>
      <ExpoLinearGradient colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]} style={styles.backgroundGradient} />
      <FlatList
        data={segment === 'received' ? listReceived : listGiven}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.reviewCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image source={{ uri: (segment === 'received' ? item.author?.avatar_url : item.subject?.avatar_url) || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' }} style={styles.reviewAvatar} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{ color: Colors.brand.textPrimary, fontWeight: '600' }}>{segment === 'received' ? (item.author?.full_name || item.author?.username || 'User') : (item.subject?.full_name || item.subject?.username || 'User')}</Text>
                <Text style={{ color: Colors.brand.textSecondary, fontSize: 12 }}>{new Date(item.created_at).toLocaleDateString()}</Text>
              </View>
              <Text style={{ color: Colors.brand.accentMagenta, fontWeight: '700' }}>{item.rating.toFixed(1)}</Text>
            </View>
            {!!item.comment && <Text style={{ color: Colors.brand.textSecondary, marginTop: 8 }}>{item.comment}</Text>}
          </View>
        )}
        onEndReachedThreshold={0.2}
        onEndReached={hasNextPage && (segment === 'received' ? listReceived.length > 0 : listGiven.length > 0) ? loadMore : undefined}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View style={styles.emptyListWrapper}>
            <ExpoLinearGradient
              colors={[Colors.brand.cardBackground, 'rgba(255,255,255,0.03)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.emptyList}
            >
              <Text style={styles.emptyListEmoji}>🗒️</Text>
              <Text style={styles.emptyListTitle}>No reviews {segment === 'received' ? 'received' : 'given'} yet</Text>
              <Text style={styles.emptyListText}>When you start {segment === 'received' ? 'receiving' : 'giving'} reviews, they will appear here.</Text>
              {segment === 'received' ? (
                <TouchableOpacity style={styles.primaryCta} onPress={() => router.push('/(tabs)/requests/new')}>
                  <Text style={styles.primaryCtaText}>Request your first review</Text>
                </TouchableOpacity>
              ) : null}
            </ExpoLinearGradient>
          </View>
        }
        ListHeaderComponent={(
          <>
            <ExpoLinearGradient colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
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
                  <Text style={styles.editButtonText}>Edit Profile</Text>
                </TouchableOpacity>
              </View>
            </ExpoLinearGradient>

            <View style={styles.statsSection}>
              <Text style={styles.sectionTitle}>Your Stats</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{stats.given}</Text>
                  <Text style={styles.statLabel}>Reviews Given</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{stats.received}</Text>
                  <Text style={styles.statLabel}>Reviews Received</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{avgRating.toFixed(1)}</Text>
                  <Text style={styles.statLabel}>Avg Rating</Text>
                </View>
              </View>
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
                    <View key={`${s}-${idx}`} style={styles.chip}><Text style={styles.chipText}>{s}</Text></View>
                  ))}
                </View>
              </View>
            )}

            {!!(profile?.links?.twitter || profile?.links?.linkedin || profile?.links?.github) && (
              <View style={styles.bioSection}>
                <Text style={styles.sectionTitle}>Links</Text>
                <View style={{ flexDirection: 'row' }}>
                  {profile?.links?.twitter ? (
                    <TouchableOpacity onPress={() => router.push(profile.links!.twitter!)} style={styles.linkBtn}><Text style={styles.linkText}>Twitter</Text></TouchableOpacity>
                  ) : null}
                  {profile?.links?.linkedin ? (
                    <TouchableOpacity onPress={() => router.push(profile.links!.linkedin!)} style={styles.linkBtn}><Text style={styles.linkText}>LinkedIn</Text></TouchableOpacity>
                  ) : null}
                  {profile?.links?.github ? (
                    <TouchableOpacity onPress={() => router.push(profile.links!.github!)} style={styles.linkBtn}><Text style={styles.linkText}>GitHub</Text></TouchableOpacity>
                  ) : null}
                </View>
              </View>
            )}

            <View style={styles.actionsSection}>
              <View style={styles.segmentContainer}>
                <TouchableOpacity style={[styles.segmentBtn, segment === 'received' && styles.segmentBtnActive]} onPress={() => setSegment('received')} accessibilityLabel="Show reviews received">
                  <Text style={[styles.segmentText, segment === 'received' && styles.segmentTextActive]}>Received</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.segmentBtn, segment === 'given' && styles.segmentBtnActive]} onPress={() => setSegment('given')} accessibilityLabel="Show reviews given">
                  <Text style={[styles.segmentText, segment === 'given' && styles.segmentTextActive]}>Given</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
        ListFooterComponent={(
          <>
            {loadingMore && hasNextPage ? (
              <Text style={{ color: Colors.brand.textSecondary, textAlign: 'center', padding: 12 }}>Loading...</Text>
            ) : null}

            <View style={styles.actionsSection}>
              <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/(tabs)/requests/new')} accessibilityLabel="Request a review">
                <Text style={styles.actionIcon}>📝</Text>
                <Text style={styles.actionText}>Request New Review</Text>
                <Text style={styles.actionArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/(tabs)/requests')} accessibilityLabel="View my review requests">
                <Text style={styles.actionIcon}>⭐</Text>
                <Text style={styles.actionText}>My Reviews</Text>
                <Text style={styles.actionArrow}>›</Text>
              </TouchableOpacity>

              {profile?.is_reviewer ? (
                <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/(tabs)/profile/reviewer-settings')} accessibilityLabel="Manage reviewer settings">
                  <Text style={styles.actionIcon}>✅</Text>
                  <Text style={styles.actionText}>You're a reviewer — Manage settings</Text>
                  <Text style={styles.actionArrow}>›</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/(tabs)/profile/become-reviewer')} accessibilityLabel="Become a reviewer">
                  <Text style={styles.actionIcon}>🚀</Text>
                  <Text style={styles.actionText}>Become a reviewer</Text>
                  <Text style={styles.actionArrow}>›</Text>
                </TouchableOpacity>
              )}

              {profile?.is_reviewer ? (
                <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/(tabs)/profile/reviewer-inbox')} accessibilityLabel="Open reviewer inbox">
                  <Text style={styles.actionIcon}>📥</Text>
                  <Text style={styles.actionText}>Reviewer Inbox</Text>
                  <Text style={styles.actionArrow}>›</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/(tabs)/profile/settings')} accessibilityLabel="Open settings">
                <Text style={styles.actionIcon}>⚙️</Text>
                <Text style={styles.actionText}>Settings</Text>
                <Text style={styles.actionArrow}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dangerSection}>
              <TouchableOpacity style={styles.logoutButtonDark} onPress={handleLogout}>
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
  backgroundGradient: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  scrollView: { flex: 1, backgroundColor: 'transparent' },
  header: { paddingTop: 60, paddingBottom: 40, paddingHorizontal: 0, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, shadowColor: Colors.brand.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 12 },
  headerContent: { paddingHorizontal: 20, backgroundColor: 'transparent', width: '100%' },
  profileSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, backgroundColor: 'transparent' },
  avatarContainer: { position: 'relative', marginRight: 20, backgroundColor: 'transparent' },
  userInfo: { flex: 1, backgroundColor: 'transparent' },
  userName: { fontSize: 28, fontWeight: '700', fontFamily: 'Poppins_700Bold', color: Colors.brand.textOnGradient, marginBottom: 4, textShadowColor: 'rgba(0, 0, 0, 0.1)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  userEmail: { fontSize: 16, color: Colors.brand.textOnGradient, marginBottom: 4, opacity: 0.9, fontWeight: '500' },
  editButton: { backgroundColor: 'rgba(255,255,255,0.08)', paddingVertical: 16, paddingHorizontal: 36, borderRadius: 28, alignItems: 'center', shadowColor: Colors.brand.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  editButtonText: { color: Colors.brand.textOnGradient, fontSize: 16, fontWeight: '700', textShadowColor: 'rgba(0, 0, 0, 0.1)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  statsSection: { margin: 24, marginTop: 32, backgroundColor: Colors.brand.cardBackground, borderRadius: 28, padding: 28, shadowColor: Colors.brand.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 8, borderWidth: 0, overflow: 'hidden' },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', fontFamily: 'Poppins_700Bold', color: Colors.brand.textPrimary, marginBottom: 18 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'transparent' },
  statCard: { alignItems: 'center', flex: 1, backgroundColor: 'transparent' },
  statNumber: { fontSize: 26, fontWeight: 'bold', color: Colors.brand.accentMagenta, marginBottom: 6 },
  statLabel: { fontSize: 13, color: Colors.brand.textSecondary, textAlign: 'center', fontWeight: '500' },
  bioSection: { margin: 24, backgroundColor: Colors.brand.cardBackground, borderRadius: 28, padding: 28, shadowColor: Colors.brand.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 8, borderWidth: 0, overflow: 'hidden' },
  bioText: { fontSize: 16, color: Colors.brand.textSecondary, lineHeight: 24 },
  actionsSection: { margin: 24, backgroundColor: Colors.brand.cardBackground, borderRadius: 28, shadowColor: Colors.brand.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 8, borderWidth: 0, overflow: 'hidden' },
  actionItem: { flexDirection: 'row', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: Colors.brand.divider, marginHorizontal: 4 },
  actionIcon: { fontSize: 22, marginRight: 16, width: 32 },
  actionText: { flex: 1, fontSize: 16, color: Colors.brand.textPrimary, fontWeight: '500' },
  actionArrow: { fontSize: 22, color: Colors.brand.textLight },
  dangerSection: { margin: 24, marginBottom: 120 },
  logoutButtonDark: { backgroundColor: Colors.brand.cardBackground, height: 52, borderRadius: Platform.select({ web: 999, default: 26 }) as number, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, borderWidth: 1, borderColor: Colors.brand.divider, shadowColor: Colors.brand.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 6 },
  logoutText: { color: Colors.brand.textOnGradient, fontSize: 16, fontWeight: 'bold' },
  segmentContainer: { flexDirection: 'row', backgroundColor: Colors.brand.cardBackgroundSecondary, borderRadius: 10, margin: 16, overflow: 'hidden' },
  segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: 'rgba(255,255,255,0.06)' },
  segmentText: { color: Colors.brand.textSecondary },
  segmentTextActive: { color: Colors.brand.textPrimary, fontWeight: '700' },
  reviewCard: { marginHorizontal: 16, backgroundColor: Colors.brand.cardBackgroundSecondary, borderRadius: 12, padding: 12, marginBottom: 10 },
  reviewAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.brand.cardBackground },
  emptyListWrapper: { paddingHorizontal: 24, paddingVertical: 8 },
  emptyList: { padding: 24, alignItems: 'center', borderRadius: 20, borderWidth: 1, borderColor: Colors.brand.divider },
  emptyListEmoji: { fontSize: 28, marginBottom: 6 },
  emptyListTitle: { color: Colors.brand.textPrimary, fontWeight: '700', marginBottom: 6 },
  emptyListText: { color: Colors.brand.textSecondary, textAlign: 'center', marginBottom: 10 },
  primaryCta: { backgroundColor: Colors.brand.accentMagenta, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  primaryCtaText: { color: '#fff', fontWeight: '700' },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: Colors.brand.cardBackgroundSecondary, marginRight: 8, marginBottom: 8 },
  chipText: { color: Colors.brand.textSecondary, fontSize: 12 },
});


