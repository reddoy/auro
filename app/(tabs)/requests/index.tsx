import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Image, Alert, View as RNView } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { getReviewerById, getRequestsByUser, getUserProfile, updateRequestStatus, getRequestsByReviewer, getProfileById } from '@/lib/api';
import { getSignedAvatarUrl } from '@/lib/profile';
import { openPaymentSheet } from '@/lib/payments';
import type { DbReviewerSummary, DbRequestSummary } from '@/types';

export default function RequestsScreen() {
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
            const umap: Record<string, any> = {};
            users.forEach(u => { if (u) umap[u.id] = u; });
            setUserMap(umap);
          }
        } catch {}
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'in_progress':
        return '#FF9800';
      case 'accepted':
        return '#673AB7';
      case 'paid':
        return '#009688';
      case 'pending':
        return '#2196F3';
      case 'rejected':
        return '#F44336';
      default:
        return '#999';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Review Complete';
      case 'in_progress':
        return 'In Progress';
      case 'accepted':
        return 'Accepted — Awaiting Payment';
      case 'paid':
        return 'Paid';
      case 'pending':
        return 'Pending Review';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  };

  const handleRequestPress = (requestId: string) => {
    const request = requests.find(r => r.id === requestId);
    if (!request) return;
    if (request.status === 'completed') {
      router.push(`/(tabs)/requests/${requestId}`);
      return;
    }
    // For non-completed requests, navigate to the reviewer's public profile
    router.push(`/(tabs)/discover/influencer/${request.influencerId}`);
  };

  const handleNewRequest = () => {
    router.push('/(tabs)/requests/new');
  };

  const handlePayNow = async (request: DbRequestSummary) => {
    const reviewer = revMap[request.influencerId];
    const amount = reviewer?.hourlyRate != null ? reviewer.hourlyRate : 50;
    try {
      const res = await openPaymentSheet({ amountCents: Math.round(amount * 100), currency: 'usd', requestId: request.id });
      if (!res.completed) {
        if (res.errorMessage) Alert.alert('Payment failed', res.errorMessage);
        return;
      }
      await updateRequestStatus(request.id, 'paid');
      setRequests(prev => prev.map(r => (r.id === request.id ? { ...r, status: 'paid' as any } : r)));
      Alert.alert('Payment successful', 'Thanks! Your reviewer has been notified.');
    } catch (e: any) {
      Alert.alert('Payment error', e?.message || 'Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <ExpoLinearGradient
        colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
        style={styles.backgroundGradient}
      />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 72 }}>
      <ExpoLinearGradient
        colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.title}>My Reviews</Text>
          <Text style={styles.subtitle}>Track your review requests and feedback</Text>

          <RNView style={styles.segmentedRow}>
            <TouchableOpacity
              style={[styles.segmentedBtn, mode === 'received' && styles.segmentedBtnActive]}
              onPress={() => setMode('received')}
            >
              <Text style={styles.segmentedText}>Received</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentedBtn, mode === 'given' && styles.segmentedBtnActive]}
              onPress={() => setMode('given')}
            >
              <Text style={styles.segmentedText}>Given</Text>
            </TouchableOpacity>
          </RNView>
          <RNView style={{ flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 6 }}>
            <RNView style={{ flexDirection: 'row', backgroundColor: mode === 'received' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.18)', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12 }}>
              <Text style={{ color: Colors.brand.textOnGradient, fontWeight: '700', fontSize: 12 }}>Received {receivedCount}</Text>
            </RNView>
            <RNView style={{ flexDirection: 'row', backgroundColor: mode === 'given' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.18)', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12 }}>
              <Text style={{ color: Colors.brand.textOnGradient, fontWeight: '700', fontSize: 12 }}>Given {givenCount}</Text>
            </RNView>
          </RNView>
          
          <TouchableOpacity style={styles.newRequestButton} onPress={handleNewRequest}>
            <ExpoLinearGradient
              colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 14,
              }}
            />
            <Text style={styles.newRequestButtonText}>+ New Review Request</Text>
          </TouchableOpacity>
        </View>
      </ExpoLinearGradient>

      <View style={styles.requestsList}>
        {loading ? (
          <View style={styles.emptyState}><Text style={styles.emptyStateText}>Loading...</Text></View>
        ) : mode === 'received' ? (
          requests.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>No reviews yet</Text>
              <Text style={styles.emptyStateText}>
                Start your journey by requesting your first review from an influencer!
              </Text>
            </View>
          ) : (
          requests.map((request) => {
            const reviewer = revMap[request.influencerId];
            return (
              <TouchableOpacity
                key={request.id}
                style={styles.requestCard}
                onPress={() => handleRequestPress(request.id)}
              >
                <View style={styles.requestHeader}>
                  <Image
                    source={{ uri: avatarMap[request.influencerId] || reviewer?.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' }}
                    style={styles.influencerImage}
                  />
                  <View style={styles.requestInfo}>
                    <Text style={styles.influencerName}>{reviewer?.displayName}</Text>
                    <Text style={styles.requestDate}>
                      {new Date(request.createdAt).toLocaleDateString()}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(request.status) },
                      ]}
                    >
                      <Text style={styles.statusText}>
                        {getStatusText(request.status)}
                      </Text>
                    </View>
                  </View>
                </View>

                {request.status === 'completed' && request.review && request.review.ratings?.overall != null && (
                  <View style={styles.reviewPreview}>
                    <Text style={styles.reviewLabel}>Overall Rating:</Text>
                    <Text style={styles.overallRating}>
                      {request.review.ratings?.overall}/10
                    </Text>
                  </View>
                )}

                {request.photos?.length > 0 && (
                  <View style={styles.photosPreview}>
                    <Text style={styles.photosLabel}>
                      {request.photos.length} photo{request.photos.length > 1 ? 's' : ''} submitted
                    </Text>
                    <View style={styles.photoThumbnails}>
                      {request.photos.slice(0, 3).map((photo, index) => (
                        <Image
                          key={index}
                          source={{ uri: photo }}
                          style={styles.photoThumbnail}
                        />
                      ))}
                      {request.photos.length > 3 && (
                        <View style={styles.morePhotos}>
                          <Text style={styles.morePhotosText}>
                            +{request.photos.length - 3}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {request.status === 'accepted' ? (
                  <TouchableOpacity
                    style={styles.payNowButton}
                    onPress={() => handlePayNow(request)}
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
          }))
        ) : (
          givenRequests.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>No reviews to give</Text>
              <Text style={styles.emptyStateText}>Accepted and pending requests assigned to you will show here.</Text>
            </View>
          ) : (
            givenRequests.map((request) => {
              const u = userMap[request.userId || ''];
              return (
                <TouchableOpacity
                  key={request.id}
                  style={styles.requestCard}
                  onPress={() => {
                    if (request.status === 'completed') router.push(`/(tabs)/requests/${request.id}`);
                    else Alert.alert('Request Status', `This request is currently ${getStatusText(request.status)}.`);
                  }}
                >
                  <View style={styles.requestHeader}>
                    <Image
                      source={{ uri: u?.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' }}
                      style={styles.influencerImage}
                    />
                    <View style={styles.requestInfo}>
                      <Text style={styles.influencerName}>{u?.displayName || 'User'}</Text>
                      <Text style={styles.requestDate}>
                        {new Date(request.createdAt).toLocaleDateString()}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
                        <Text style={styles.statusText}>{getStatusText(request.status)}</Text>
                      </View>
                    </View>
                  </View>
                  {request.photos?.length > 0 && (
                    <View style={styles.photosPreview}>
                      <Text style={styles.photosLabel}>
                        {request.photos.length} photo{request.photos.length > 1 ? 's' : ''} submitted
                      </Text>
                      <View style={styles.photoThumbnails}>
                        {request.photos.slice(0, 3).map((photo, index) => (
                          <Image
                            key={index}
                            source={{ uri: photo }}
                            style={styles.photoThumbnail}
                          />
                        ))}
                        {request.photos.length > 3 && (
                          <View style={styles.morePhotos}>
                            <Text style={styles.morePhotosText}>
                              +{request.photos.length - 3}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )
        )}
      </View>
      </ScrollView>
    </View>
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
    paddingTop: 60,
    paddingBottom: 40,
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
    padding: 24,
    paddingTop: 32,
    paddingBottom: 100, // Extra padding for floating tab bar
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
    padding: 20,
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
    backgroundColor: '#f0f0f0',
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
    width: 54,
    height: 54,
    borderRadius: 12,
    marginRight: 10,
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
    width: 54,
    height: 54,
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


