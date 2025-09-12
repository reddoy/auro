import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, Alert, View as RNView, FlatList, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { getReviewerById, getRequestsByUser, getUserProfile, getRequestsByReviewer, getProfileById, archiveRequest, unarchiveRequest } from '@/lib/api';
import { getSignedAvatarUrl } from '@/lib/profile';
import { openPaymentSheet } from '@/lib/payments';
import type { DbReviewerSummary, DbRequestSummary } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import { useToast } from '@/components/Toast';
import Avatar from '@/components/Avatar';

export default function RequestsScreen() {
  const insets = useSafeAreaInsets();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<DbRequestSummary[]>([]);
  const [revMap, setRevMap] = useState<Record<string, DbReviewerSummary>>({});
  const [avatarMap, setAvatarMap] = useState<Record<string, string | undefined>>({});
  const [userMap, setUserMap] = useState<Record<string, { id: string; displayName: string; avatarUrl?: string | null }>>({});
  const [userAvatarMap, setUserAvatarMap] = useState<Record<string, string | undefined>>({});
  const [isReviewer, setIsReviewer] = useState(false);
  const receivedCount = requests.length;
  const [filter, setFilter] = useState<'active' | 'completed' | 'archived'>('active');

  useEffect(() => {
    const run = async () => {
      try {
        const profile = await getUserProfile();
        if (!profile?.id) {
          setRequests([]);
          return;
        }
        const reviewerMode = !!(profile as any)?.is_reviewer;
        setIsReviewer(reviewerMode);
        const reqs = reviewerMode ? await getRequestsByReviewer(profile.id) : await getRequestsByUser(profile.id);
        setRequests(reqs);
        if (reviewerMode) {
          // Build reviewee map for reviewer inbox
          const userIds = Array.from(new Set(reqs.map(r => r.userId).filter(Boolean))) as string[];
          const users = await Promise.all(userIds.map(uid => getProfileById(uid)));
          const uMap: Record<string, { id: string; displayName: string; avatarUrl?: string | null }> = {};
          users.forEach(u => { if (u) uMap[u.id] = u; });
          setUserMap(uMap);
          try {
            const pairs = await Promise.all(
              users.filter(Boolean).map(async (u) => {
                const usr = u as { id: string; displayName: string; avatarUrl?: string | null };
                let uri = usr.avatarUrl || '';
                if (uri && !/^https?:\/\//i.test(uri)) {
                  try { uri = (await getSignedAvatarUrl(uri, 3600)) || ''; } catch {}
                }
                return [usr.id, uri] as const;
              })
            );
            setUserAvatarMap(Object.fromEntries(pairs));
          } catch {}
        } else {
          // Build reviewer map for reviewee inbox
          const uniqueIds = Array.from(new Set(reqs.map(r => r.influencerId).filter(Boolean)));
          const reviewers = await Promise.all(uniqueIds.map(id => getReviewerById(String(id))));
          const map: Record<string, DbReviewerSummary> = {};
          reviewers.forEach(rev => { if (rev) map[rev.id] = rev; });
          setRevMap(map);
          // Prefetch signed avatar URLs if needed
          try {
            const pairs = await Promise.all(
              reviewers.filter(Boolean).map(async (rev) => {
                const r = rev as DbReviewerSummary;
                let uri = r.avatarUrl || '';
                if (uri && !/^https?:\/\//i.test(uri)) {
                  try { uri = (await getSignedAvatarUrl(uri, 3600)) || ''; } catch {}
                }
                return [r.id, uri] as const;
              })
            );
            setAvatarMap(Object.fromEntries(pairs));
          } catch {}
        }

      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  // Refresh data whenever this screen regains focus (e.g., after Accept/Deny)
  const refreshData = useCallback(() => {
    (async () => {
      try {
        const profile = await getUserProfile();
        if (!profile?.id) {
          setRequests([]);
          return;
        }
        const reviewerMode = !!(profile as any)?.is_reviewer;
        setIsReviewer(reviewerMode);
        const reqs = reviewerMode ? await getRequestsByReviewer(profile.id) : await getRequestsByUser(profile.id);
        setRequests(reqs);

        if (reviewerMode) {
          const userIds = Array.from(new Set(reqs.map(r => r.userId).filter(Boolean))) as string[];
          const users = await Promise.all(userIds.map(uid => getProfileById(uid)));
          const uMap: Record<string, { id: string; displayName: string; avatarUrl?: string | null }> = {};
          users.forEach(u => { if (u) uMap[u.id] = u; });
          setUserMap(uMap);
          try {
            const pairs = await Promise.all(
              users.filter(Boolean).map(async (u) => {
                const usr = u as { id: string; displayName: string; avatarUrl?: string | null };
                let uri = usr.avatarUrl || '';
                if (uri && !/^https?:\/\//i.test(uri)) {
                  try { uri = (await getSignedAvatarUrl(uri, 3600)) || ''; } catch {}
                }
                return [usr.id, uri] as const;
              })
            );
            setUserAvatarMap(Object.fromEntries(pairs));
          } catch {}
        } else {
          const uniqueIds = Array.from(new Set(reqs.map(r => r.influencerId).filter(Boolean)));
          const reviewers = await Promise.all(uniqueIds.map(id => getReviewerById(String(id))));
          const rMap: Record<string, DbReviewerSummary> = {};
          reviewers.forEach(rev => { if (rev) rMap[rev.id] = rev; });
          setRevMap(rMap);
          try {
            const pairs = await Promise.all(
              reviewers.filter(Boolean).map(async (rev) => {
                const r = rev as DbReviewerSummary;
                let uri = r.avatarUrl || '';
                if (uri && !/^https?:\/\//i.test(uri)) {
                  try { uri = (await getSignedAvatarUrl(uri, 3600)) || ''; } catch {}
                }
                return [r.id, uri] as const;
              })
            );
            setAvatarMap(Object.fromEntries(pairs));
          } catch {}
        }
      } catch {}
    })();
  }, []);

  useFocusEffect(useCallback(() => {
    refreshData();
    return () => {};
  }, [refreshData]));

  

  const handleRequestPress = (requestId: string) => {
    const request = requests.find(r => r.id === requestId);
    if (!request) return;
    // Route based on role: reviewers go to reviewer detail; reviewees go to review detail
    if (isReviewer) {
      router.push(`/requests/reviewer/${requestId}` as any);
    } else {
      router.push(`/review/${requestId}`);
    }
  };

  const handleNewRequest = () => {
    router.push('/(tabs)/requests/new');
  };

  const handlePayNow = async (request: DbRequestSummary) => {
    const reviewer = revMap[request.influencerId];
    const amount = reviewer?.pricePerReview != null ? reviewer.pricePerReview : 50;
    try {
      const res = await openPaymentSheet({ amountCents: Math.round(amount * 100), currency: 'usd', requestId: request.id });
      if (!res.completed) {
        if (res.errorMessage) Alert.alert('Payment failed', res.errorMessage);
        return;
      }
      // Rely on webhook to update DB; refresh UI shortly after
      show('Payment successful. Updating shortly...');
      setTimeout(() => {
        (async () => {
          try {
            const p = await getUserProfile();
            if (p?.id) {
              const refreshed = await getRequestsByUser(p.id);
              setRequests(refreshed);
            }
          } catch {}
        })();
      }, 1500);
    } catch (e: any) {
      Alert.alert('Payment error', e?.message || 'Please try again.');
    }
  };

  const renderReceivedItem = ({ item }: { item: DbRequestSummary }) => {
    const reviewer = revMap[item.influencerId];
    const reviewee = item.userId ? userMap[item.userId] : undefined;
    const avatarUri = isReviewer
      ? (item.userId ? userAvatarMap[item.userId] || reviewee?.avatarUrl || undefined : undefined)
      : (avatarMap[item.influencerId] || reviewer?.avatarUrl) || undefined;
    const displayName = isReviewer
      ? (reviewee?.displayName || 'User')
      : (reviewer?.displayName || 'Reviewer');
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.requestCard}
        onPress={() => handleRequestPress(item.id)}
      >
        <View style={styles.requestHeader}>
          <RNView style={styles.influencerImageWrapper}>
            {/* For reviewers, show the reviewee avatar/name; for reviewees, show reviewer */}
            <Avatar uri={avatarUri} name={displayName} size={60} />
          </RNView>
          <View style={styles.requestInfo}>
            <Text style={styles.influencerName}>{displayName}</Text>
            <Text style={styles.requestDate}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
            <RNView style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.brand.cardBackground }}>
              <StatusBadge
                status={item.status as any}
                label={isReviewer && item.status === 'paid' ? 'Pending acceptance' : undefined}
              />
              {item.status === 'paid' && (item as any).review ? (
                <StatusBadge status={'completed'} label="Review Submitted" />
              ) : null}
            </RNView>
          </View>
        </View>
        {item.status === 'completed' && (item as any).review && (item as any).review.ratings?.overall != null && (
          <View style={styles.reviewPreview}>
            <Text style={styles.reviewLabel}>Overall Rating:</Text>
            <Text style={styles.overallRating}>
              {(item as any).review.ratings?.overall}/10
            </Text>
          </View>
        )}
        {/* Photo previews removed per request */}
        {item.status === 'accepted' ? (
          <TouchableOpacity
            style={styles.payNowButton}
            onPress={() => handlePayNow(item)}
          >
            <ExpoLinearGradient
              colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 12 }}
            />
            <Text style={styles.payNowText}>Pay now</Text>
          </TouchableOpacity>
        ) : null}

        {item.status === 'completed' && (
          <RNView style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
            {!item.archived_at ? (
              <TouchableOpacity onPress={async () => {
                try { await archiveRequest(item.id); setRequests(prev => prev.map(r => r.id === item.id ? { ...r, archived_at: new Date().toISOString() } as any : r)); } catch {}
              }}>
                <Text style={{ color: Colors.brand.textSecondary }}>Archive</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={async () => {
                try { await unarchiveRequest(item.id); setRequests(prev => prev.map(r => r.id === item.id ? { ...r, archived_at: null } as any : r)); } catch {}
              }}>
                <Text style={{ color: Colors.brand.textSecondary }}>Unarchive</Text>
              </TouchableOpacity>
            )}
          </RNView>
        )}
      </TouchableOpacity>
    );
  };

  const SkeletonCard = () => (
    <View style={[styles.requestCard, { backgroundColor: Colors.brand.cardBackground }]}> 
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={[styles.influencerImage, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
        <View style={{ flex: 1 }}>
          <View style={{ height: 12, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 6, marginBottom: 10, width: '60%' }} />
          <View style={{ height: 10, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6, marginBottom: 6, width: '40%' }} />
        </View>
      </View>
      <View style={{ height: 10, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 6, marginTop: 16, width: '80%' }} />
    </View>
  );

  const data = requests.filter(r => {
    if (filter === 'archived') return !!r.archived_at;
    if (filter === 'completed') return r.status === 'completed' && !r.archived_at;
    // active
    return (r.status === 'pending' || r.status === 'accepted' || r.status === 'paid' || r.status === 'in_progress') && !r.archived_at;
  });
  const renderItem = renderReceivedItem;

  return (
    <SafeAreaView style={styles.container}>
      <RNView
        style={{
          height: insets.top,
          backgroundColor: Colors.brand.background,
          width: '100%',
        }}
      />
      <RNView
        style={{
          height: Platform.select({ web: 6, default: 4 }),
          backgroundColor: Colors.brand.background,
          width: '100%',
        }}
      />
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshing={loading}
        onRefresh={refreshData}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 0, paddingBottom: insets.bottom + 24, paddingHorizontal: 16 }}
        ListHeaderComponent={(
          <>
            <View style={styles.headerPlain}>
              <View style={styles.headerContentPlain}>
                <Text style={styles.titlePlain}>My Reviews</Text>
                <Text style={styles.subtitlePlain}>Track your review requests and feedback</Text>

                <RNView style={[styles.countersRowPlain, { justifyContent: 'center' }]}>
                  <TouchableOpacity onPress={() => setFilter('active')} style={[styles.counterPillPlain, filter === 'active' && { borderColor: 'rgba(255,255,255,0.4)', backgroundColor: Colors.brand.cardBackgroundLight }]}>
                    <Text style={styles.counterTextPlain}>Active {requests.filter(r => (r.status === 'pending' || r.status === 'accepted' || r.status === 'paid' || r.status === 'in_progress') && !r.archived_at).length}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setFilter('completed')} style={[styles.counterPillPlain, filter === 'completed' && { borderColor: 'rgba(255,255,255,0.4)', backgroundColor: Colors.brand.cardBackgroundLight }]}>
                    <Text style={styles.counterTextPlain}>Completed {requests.filter(r => r.status === 'completed' && !r.archived_at).length}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setFilter('archived')} style={[styles.counterPillPlain, filter === 'archived' && { borderColor: 'rgba(255,255,255,0.4)', backgroundColor: Colors.brand.cardBackgroundLight }]}>
                    <Text style={styles.counterTextPlain}>Archived {requests.filter(r => !!r.archived_at).length}</Text>
                  </TouchableOpacity>
                </RNView>
              </View>
            </View>
            <View style={styles.discoverButtonContainer}>
              <TouchableOpacity style={styles.newRequestButton} onPress={handleNewRequest}>
                <ExpoLinearGradient
                  colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 14 }}
                />
                <Text style={styles.newRequestButtonText}>Discover Reviewers</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
        ListEmptyComponent={(
          <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
            {loading ? (
              <>
                {[...Array(4)].map((_, i) => (
                  <SkeletonCard key={`s-${i}`} />
                ))}
              </>
            ) : (
              <View style={styles.emptyStateMinimal}>
                <Text style={styles.emptyStateTitle}>No reviews yet</Text>
                <Text style={styles.emptyStateText}>Start your journey by requesting your first review from an influencer!</Text>
              </View>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.brand.background,
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 0,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  headerPlain: {
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 0,
    backgroundColor: Colors.brand.background,
  },
  headerContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: 'transparent',
    width: '100%',
  },
  headerContentPlain: {
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: Colors.brand.background,
    width: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    marginBottom: 8,
    color: Colors.brand.textOnGradient,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  titlePlain: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    marginBottom: 8,
    color: Colors.brand.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.brand.textOnGradient,
    marginBottom: 28,
    textAlign: 'center',
    opacity: 0.9,
    fontWeight: '500',
  },
  subtitlePlain: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
    marginBottom: 28,
    textAlign: 'center',
    opacity: 0.9,
    fontWeight: '500',
  },
  segmentedRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    padding: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    gap: 8,
  },
  segmentedBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  segmentedBtnActive: {
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  segmentedText: {
    color: Colors.brand.textOnGradient,
    fontWeight: '600',
  },
  segmentedTextActive: {
    fontWeight: '700',
  },
  countersRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    marginBottom: 8,
  },
  countersRowPlain: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    marginBottom: 8,
    backgroundColor: Colors.brand.background,
  },
  counterPill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  counterPillPlain: {
    flexDirection: 'row',
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 111, 0, 0.15)',
  },
  counterPillActive: {
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  counterPillActivePlain: {
    backgroundColor: Colors.brand.cardBackground,
  },
  counterText: {
    color: Colors.brand.textOnGradient,
    fontWeight: '700',
    fontSize: 12,
  },
  counterTextPlain: {
    color: Colors.brand.textPrimary,
    fontWeight: '700',
    fontSize: 12,
  },
  discoverButtonContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.brand.background,
  },
  newRequestButton: {
    paddingVertical: 18,
    paddingHorizontal: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    backgroundColor: 'transparent',
  },
  newRequestButtonText: {
    color: Colors.brand.textOnGradient,
    fontSize: 18,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  requestsList: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 28,
    marginTop: 24,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 0,
  },
  emptyStateMinimal: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'transparent',
    marginTop: 12,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Poppins_700Bold',
    color: Colors.brand.textPrimary,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 18,
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
  },
  requestCard: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 111, 0, 0.15)',
    overflow: 'hidden',
    minHeight: 100,
  },
  requestHeader: {
    flexDirection: 'row',
    marginBottom: 15,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  influencerImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    borderWidth: 0,
    shadowColor: Colors.brand.shadowMedium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  influencerImageWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    overflow: 'hidden',
    backgroundColor: Colors.brand.avatarPlaceholder,
  },
  influencerImageOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestInfo: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
  },
  influencerName: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Poppins_700Bold',
    color: Colors.brand.textPrimary,
    marginBottom: 4,
  },
  requestDate: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  reviewPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.brand.cardBackgroundLight,
    padding: 16,
    borderRadius: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  reviewLabel: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
  },
  overallRating: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.brand.accentMagenta,
  },
  photosPreview: {
    marginTop: 10,
    backgroundColor: 'transparent',
  },
  photosLabel: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    marginBottom: 8,
  },
  photoThumbnails: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
  },
  photoThumbnail: {
    width: 72,
    height: 72,
    borderRadius: 12,
    marginRight: 0,
    borderWidth: 0,
    shadowColor: Colors.brand.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
    backgroundColor: Colors.brand.cardBackground,
  },
  morePhotos: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: Colors.brand.cardBackgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.brand.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  morePhotosSmall: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.brand.cardBackgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.brand.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  morePhotosText: {
    fontSize: 12,
    color: Colors.brand.textSecondary,
    fontWeight: '600',
  },
  payNowButton: {
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  payNowText: {
    color: Colors.brand.textOnGradient,
    fontSize: 16,
    fontWeight: '700',
  },
});


