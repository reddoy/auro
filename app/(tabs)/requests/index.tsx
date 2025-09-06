import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, Alert, View as RNView, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { getReviewerById, getRequestsByUser, getUserProfile, updateRequestStatus, getRequestsByReviewer, getProfileById } from '@/lib/api';
import { getSignedAvatarUrl } from '@/lib/profile';
import { openPaymentSheet } from '@/lib/payments';
import type { DbReviewerSummary, DbRequestSummary } from '@/types';
import LightboxImage from '@/components/LightboxImage';
import StatusBadge from '@/components/StatusBadge';
import { Image } from 'expo-image';
import { useToast } from '@/components/Toast';
import Avatar from '@/components/Avatar';

export default function RequestsScreen() {
  const insets = useSafeAreaInsets();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<DbRequestSummary[]>([]);
  const [revMap, setRevMap] = useState<Record<string, DbReviewerSummary>>({});
  const [avatarMap, setAvatarMap] = useState<Record<string, string | undefined>>({});
  const [givenRequests, setGivenRequests] = useState<DbRequestSummary[]>([]);
  const [userMap, setUserMap] = useState<Record<string, { id: string; displayName: string; username?: string | null; avatarUrl?: string | null }>>({});
  const [mode, setMode] = useState<'received' | 'given'>('received');
  const PREF_KEY = 'auro:reviewsTab';

  useEffect(() => {
    const loadPref = async () => {
      try {
        const pref = await AsyncStorage.getItem(PREF_KEY);
        if (pref === 'received' || pref === 'given') setMode(pref as 'received' | 'given');
      } catch {}
    };
    loadPref();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(PREF_KEY, mode).catch(() => {});
  }, [mode]);
  const receivedCount = requests.length;
  const givenCount = givenRequests.length;

  useEffect(() => {
    const run = async () => {
      try {
        const profile = await getUserProfile();
        if (!profile?.id) {
          setRequests([]);
          return;
        }
        const reqs = await getRequestsByUser(profile.id);
        setRequests(reqs);
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

        // If this user is also a reviewer, load requests assigned to them
        try {
          const gReqs = await getRequestsByReviewer(profile.id);
          if (gReqs?.length) {
            setGivenRequests(gReqs);
            // Default to Given if reviewer and no saved preference
            try {
              const saved = await AsyncStorage.getItem(PREF_KEY);
              if (!saved) setMode('given');
            } catch {}
            const uniqueUserIds = Array.from(new Set(gReqs.map(r => r.userId).filter(Boolean))) as string[];
            const users = await Promise.all(uniqueUserIds.map(id => getProfileById(id)));
            const signedPairs = await Promise.all(
              users.filter(Boolean).map(async (u) => {
                const user = u as any;
                let uri = user.avatarUrl || '';
                if (uri && !/^https?:\/\//i.test(uri)) {
                  try { uri = (await getSignedAvatarUrl(uri, 3600)) || ''; } catch {}
                }
                return [user.id, { ...user, avatarUrl: uri }] as const;
              })
            );
            setUserMap(Object.fromEntries(signedPairs));
          }
        } catch {}
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
          setGivenRequests([]);
          return;
        }
        const [reqs, gReqs] = await Promise.all([
          getRequestsByUser(profile.id),
          getRequestsByReviewer(profile.id),
        ]);
        setRequests(reqs);
        setGivenRequests(gReqs || []);

        // Update reviewer map and avatars for received list
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

        // Update user map and avatars for given list
        const uniqueUserIds = Array.from(new Set((gReqs || []).map(r => r.userId).filter(Boolean))) as string[];
        const users = await Promise.all(uniqueUserIds.map(id => getProfileById(id)));
        const signedPairs = await Promise.all(
          users.filter(Boolean).map(async (u) => {
            const user = u as any;
            let uri = user.avatarUrl || '';
            if (uri && !/^https?:\/\//i.test(uri)) {
              try { uri = (await getSignedAvatarUrl(uri, 3600)) || ''; } catch {}
            }
            return [user.id, { ...user, avatarUrl: uri }] as const;
          })
        );
        setUserMap(Object.fromEntries(signedPairs));
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
    // Always open the review detail for the reviewee to see status, media, and feedback
    router.push(`/review/${requestId}`);
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
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.requestCard}
        onPress={() => handleRequestPress(item.id)}
      >
        <View style={styles.requestHeader}>
          <RNView style={styles.influencerImageWrapper}>
            <Avatar
              uri={(avatarMap[item.influencerId] || reviewer?.avatarUrl) || undefined}
              name={reviewer?.displayName}
              size={60}
            />
          </RNView>
          <View style={styles.requestInfo}>
            <Text style={styles.influencerName}>{reviewer?.displayName}</Text>
            <Text style={styles.requestDate}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <StatusBadge status={item.status as any} />
              {item.status === 'paid' && (item as any).review ? (
                <StatusBadge status={'completed'} label="Review completed" />
              ) : null}
            </View>
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
      </TouchableOpacity>
    );
  };

  const renderGivenItem = ({ item }: { item: DbRequestSummary }) => {
    const u = userMap[item.userId || ''];
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.requestCard}
        onPress={() => {
          router.push(`/(tabs)/requests/${item.id}`);
        }}
      >
        <View style={styles.requestHeader}>
          <RNView style={styles.influencerImageWrapper}>
            <Avatar
              uri={u?.avatarUrl || undefined}
              name={u?.displayName}
              size={60}
            />
          </RNView>
          <View style={styles.requestInfo}>
            <Text style={styles.influencerName}>{u?.displayName || 'User'}</Text>
            <Text style={styles.requestDate}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <StatusBadge status={item.status as any} />
              {item.status === 'paid' && (item as any).review ? (
                <StatusBadge status={'completed'} label="Review completed" />
              ) : null}
            </View>
          </View>
        </View>
        {/* Photo previews removed per request */}
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

  const data = mode === 'received' ? requests : givenRequests;
  const renderItem = mode === 'received' ? renderReceivedItem : renderGivenItem;

  return (
    <SafeAreaView style={styles.container}>
      <ExpoLinearGradient
        colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
        style={styles.backgroundGradient}
      />
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshing={loading}
        onRefresh={refreshData}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 24, paddingHorizontal: 16 }}
        ListHeaderComponent={(
          <>
            <ExpoLinearGradient
              colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.header}
            >
              <View style={styles.headerContent}>
                <Text style={styles.title}>My Reviews</Text>
                <Text style={styles.subtitle}>Track your review requests and feedback</Text>

                <RNView style={styles.countersRow}>
                  <TouchableOpacity
                    style={[styles.counterPill, mode === 'received' ? styles.counterPillActive : null]}
                    onPress={() => setMode('received')}
                    accessibilityLabel="Show reviews received"
                  >
                    <Text style={styles.counterText}>Received {receivedCount}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.counterPill, mode === 'given' ? styles.counterPillActive : null]}
                    onPress={() => setMode('given')}
                    accessibilityLabel="Show reviews given"
                  >
                    <Text style={styles.counterText}>Given {givenCount}</Text>
                  </TouchableOpacity>
                </RNView>
              </View>
            </ExpoLinearGradient>

            {mode === 'received' && (
              <TouchableOpacity style={[styles.newRequestButton, { marginHorizontal: 16, marginTop: 16 }]} onPress={handleNewRequest}>
                <ExpoLinearGradient
                  colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 14 }}
                />
                <Text style={styles.newRequestButtonText}>+ New Review Request</Text>
              </TouchableOpacity>
            )}
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
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>{mode === 'received' ? 'No reviews yet' : 'No reviews to give'}</Text>
                <Text style={styles.emptyStateText}>
                  {mode === 'received' ? 'Start your journey by requesting your first review from an influencer!' : 'Accepted and pending requests assigned to you will show here.'}
                </Text>
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
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
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
  headerContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: 'transparent',
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
  subtitle: {
    fontSize: 16,
    color: Colors.brand.textOnGradient,
    marginBottom: 28,
    textAlign: 'center',
    opacity: 0.9,
    fontWeight: '500',
    fontFamily: 'Inter_600SemiBold',
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
  counterPill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  counterPillActive: {
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  counterText: {
    color: Colors.brand.textOnGradient,
    fontWeight: '700',
    fontSize: 12,
  },
  newRequestButton: {
    paddingVertical: 18,
    paddingHorizontal: 36,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    backgroundColor: 'transparent',
  },
  newRequestButtonText: {
    color: Colors.brand.textOnGradient,
    fontSize: 16,
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
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.brand.textPrimary,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  requestCard: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 0,
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
    fontSize: 19,
    fontWeight: 'bold',
    fontFamily: 'Inter_600SemiBold',
    color: Colors.brand.textPrimary,
    marginBottom: 4,
  },
  requestDate: {
    fontSize: 14,
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
    backgroundColor: Colors.brand.cardBackgroundSecondary,
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
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


