import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StyleSheet, Alert, View as RNView, FlatList, Platform, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { getReviewerById, getRequestsByUser, getUserProfile, getRequestsByReviewer, getProfileById, archiveRequest, unarchiveRequest } from '@/lib/api';
import { getSignedAvatarUrl } from '@/lib/profile';
import type { DbReviewerSummary, DbRequestSummary } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import { useToast } from '@/components/Toast';
import Avatar from '@/components/Avatar';
import { MotionPressable, MotionView, cardEntrance, cardExit, subtleFadeIn } from '@/components/motion';
import EmptyState from '@/components/EmptyState';
import { copyToClipboard } from '@/lib/clipboard';
import { SkeletonBlock, SkeletonCircle } from '@/components/Skeletons';

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
  const [reviewerStatus, setReviewerStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const [userProfile, setUserProfile] = useState<{ id: string; username?: string | null } | null>(null);
  const receivedCount = requests.length;
  const [filter, setFilter] = useState<'active' | 'completed' | 'archived'>('active');
  const [refreshing, setRefreshing] = useState(false);
  const skipNextFocusRefresh = useRef(true);
  const loadingRef = useRef(loading);
  const [initialLoad, setInitialLoad] = useState(true);
  const initialLoadCompleteRef = useRef(false);
  const hasAnimatedListRef = useRef(false);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    if (!initialLoad && !hasAnimatedListRef.current) {
      hasAnimatedListRef.current = true;
    }
  }, [initialLoad]);

  useEffect(() => {
    const run = async () => {
      if (initialLoadCompleteRef.current) return;
      console.log('[my-reviews] initial load started');
      try {
        const profile = await getUserProfile();
        if (!profile?.id) {
          setRequests([]);
          setInitialLoad(false);
          initialLoadCompleteRef.current = true;
          console.log('[my-reviews] no profile found during initial load');
          return;
        }
        const reviewerMode = !!(profile as any)?.is_reviewer;
        const reviewerStatusValue = (profile as any)?.is_reviewer;
        setIsReviewer(reviewerMode);
        setReviewerStatus(reviewerStatusValue === 'approved' || reviewerStatusValue === 'pending' || reviewerStatusValue === 'rejected' ? reviewerStatusValue : null);
        setUserProfile({ id: profile.id, username: (profile as any)?.username });
        
        // If user is a reviewer, fetch BOTH requests where they are reviewer AND where they are reviewee
        let reqs: DbRequestSummary[] = [];
        if (reviewerMode) {
          const [reviewerReqs, revieweeReqs] = await Promise.all([
            getRequestsByReviewer(profile.id),
            getRequestsByUser(profile.id)
          ]);
          // Merge both sets, removing duplicates by ID
          const reqMap = new Map<string, DbRequestSummary>();
          [...reviewerReqs, ...revieweeReqs].forEach(req => {
            reqMap.set(req.id, req);
          });
          reqs = Array.from(reqMap.values()).sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        } else {
          reqs = await getRequestsByUser(profile.id);
        }
        
        setRequests(reqs);
        console.log('[my-reviews] initial load fetched requests', {
          count: reqs.length,
          reviewerMode,
        });
        
        if (reviewerMode) {
          // Build reviewee map for requests where user is reviewer
          const reviewerReqUserIds = Array.from(new Set(reqs.filter(r => r.influencerId === profile.id).map(r => r.userId).filter(Boolean))) as string[];
          // Build reviewer map for requests where user is reviewee
          const revieweeReqReviewerIds = Array.from(new Set(reqs.filter(r => r.userId === profile.id).map(r => r.influencerId).filter(Boolean)));
          
          const [users, reviewers] = await Promise.all([
            Promise.all(reviewerReqUserIds.map(uid => getProfileById(uid))),
            Promise.all(revieweeReqReviewerIds.map(id => getReviewerById(String(id))))
          ]);
          
          // Build user map for reviewees
          const uMap: Record<string, { id: string; displayName: string; avatarUrl?: string | null }> = {};
          users.forEach(u => { if (u) uMap[u.id] = u; });
          setUserMap(uMap);
          
          // Build reviewer map for reviewers
          const rMap: Record<string, DbReviewerSummary> = {};
          reviewers.forEach(rev => { if (rev) rMap[rev.id] = rev; });
          setRevMap(rMap);
          
          // Prefetch signed avatar URLs for both users and reviewers
          try {
            const [userEntries, reviewerEntries] = await Promise.all([
              Promise.all(
                users.filter(Boolean).map(async (u) => {
                  const usr = u as { id: string; displayName: string; avatarUrl?: string | null };
                  const raw = (usr.avatarUrl || '').trim().replace(/^@+/, '');
                  if (!raw) return [usr.id, undefined] as const;
                  let uri: string | undefined = raw;
                  try { 
                    const signed = await getSignedAvatarUrl(raw, 60 * 60 * 24 * 30);
                    uri = signed || raw; 
                  } catch {
                    uri = raw; // Fallback to raw URL if signing fails
                  }
                  return [usr.id, uri] as const;
                })
              ),
              Promise.all(
                reviewers.filter(Boolean).map(async (rev) => {
                  const r = rev as DbReviewerSummary;
                  const raw = (r.avatarUrl || '').trim().replace(/^@+/, '');
                  if (!raw) return [r.id, undefined] as const;
                  let uri: string | undefined = raw;
                  try { 
                    const signed = await getSignedAvatarUrl(raw, 60 * 60 * 24 * 30);
                    uri = signed || raw; 
                  } catch {
                    uri = raw; // Fallback to raw URL if signing fails
                  }
                  return [r.id, uri] as const;
                })
              )
            ]);
            
            setUserAvatarMap((prev) => {
              const merged: Record<string, string | undefined> = { ...prev };
              for (const [id, uri] of userEntries) {
                merged[id] = uri || prev[id];
              }
              return merged;
            });
            
            setAvatarMap((prev) => {
              const merged: Record<string, string | undefined> = { ...prev };
              for (const [id, uri] of reviewerEntries) {
                merged[id] = uri || prev[id];
              }
              return merged;
            });
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
            const entries = await Promise.all(
              reviewers.filter(Boolean).map(async (rev) => {
                const r = rev as DbReviewerSummary;
                const raw = (r.avatarUrl || '').trim().replace(/^@+/, '');
                if (!raw) return [r.id, undefined] as const;
                let uri: string | undefined = raw;
                try { 
                  const signed = await getSignedAvatarUrl(raw, 60 * 60 * 24 * 30);
                  uri = signed || raw; 
                } catch {
                  uri = raw; // Fallback to raw URL if signing fails
                }
                return [r.id, uri] as const;
              })
            );
            setAvatarMap((prev) => {
              const merged: Record<string, string | undefined> = { ...prev };
              for (const [id, uri] of entries) {
                merged[id] = uri || prev[id];
              }
              return merged;
            });
          } catch {}
        }

      } finally {
        setLoading(false);
        // Set initialLoad to false after a microtask to ensure all state updates are batched
        Promise.resolve().then(() => {
          setInitialLoad(false);
          initialLoadCompleteRef.current = true;
        });
        console.log('[my-reviews] initial load finished');
      }
    };
    run();
  }, []);

  // Refresh data whenever this screen regains focus (e.g., after Accept/Deny)
  const refreshData = useCallback((trigger: 'focus' | 'pull' = 'focus') => {
    if (loadingRef.current) {
      console.log('[my-reviews] refresh skipped because loading is in progress');
      return;
    }
    if (trigger === 'pull') {
      setRefreshing(true);
    }
    (async () => {
      console.log('[my-reviews] refresh triggered', { trigger });
      try {
        const profile = await getUserProfile();
        if (!profile?.id) {
          setRequests([]);
          return;
        }
        const reviewerMode = !!(profile as any)?.is_reviewer;
        const reviewerStatusValue = (profile as any)?.is_reviewer;
        setIsReviewer(reviewerMode);
        setReviewerStatus(reviewerStatusValue === 'approved' || reviewerStatusValue === 'pending' || reviewerStatusValue === 'rejected' ? reviewerStatusValue : null);
        setUserProfile({ id: profile.id, username: (profile as any)?.username });
        
        // If user is a reviewer, fetch BOTH requests where they are reviewer AND where they are reviewee
        let reqs: DbRequestSummary[] = [];
        if (reviewerMode) {
          const [reviewerReqs, revieweeReqs] = await Promise.all([
            getRequestsByReviewer(profile.id),
            getRequestsByUser(profile.id)
          ]);
          // Merge both sets, removing duplicates by ID
          const reqMap = new Map<string, DbRequestSummary>();
          [...reviewerReqs, ...revieweeReqs].forEach(req => {
            reqMap.set(req.id, req);
          });
          reqs = Array.from(reqMap.values()).sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        } else {
          reqs = await getRequestsByUser(profile.id);
        }
        
        setRequests(reqs);
        console.log('[my-reviews] refresh fetched requests', {
          count: reqs.length,
          reviewerMode,
        });

        if (reviewerMode) {
          // Build reviewee map for requests where user is reviewer
          const reviewerReqUserIds = Array.from(new Set(reqs.filter(r => r.influencerId === profile.id).map(r => r.userId).filter(Boolean))) as string[];
          // Build reviewer map for requests where user is reviewee
          const revieweeReqReviewerIds = Array.from(new Set(reqs.filter(r => r.userId === profile.id).map(r => r.influencerId).filter(Boolean)));
          
          const [users, reviewers] = await Promise.all([
            Promise.all(reviewerReqUserIds.map(uid => getProfileById(uid))),
            Promise.all(revieweeReqReviewerIds.map(id => getReviewerById(String(id))))
          ]);
          
          // Build user map for reviewees
          const uMap: Record<string, { id: string; displayName: string; avatarUrl?: string | null }> = {};
          users.forEach(u => { if (u) uMap[u.id] = u; });
          setUserMap(uMap);
          
          // Build reviewer map for reviewers
          const rMap: Record<string, DbReviewerSummary> = {};
          reviewers.forEach(rev => { if (rev) rMap[rev.id] = rev; });
          setRevMap(rMap);
          
          // Prefetch signed avatar URLs for both users and reviewers
          try {
            const [userEntries, reviewerEntries] = await Promise.all([
              Promise.all(
                users.filter(Boolean).map(async (u) => {
                  const usr = u as { id: string; displayName: string; avatarUrl?: string | null };
                  const raw = (usr.avatarUrl || '').trim().replace(/^@+/, '');
                  if (!raw) return [usr.id, undefined] as const;
                  let uri: string | undefined = raw;
                  try { 
                    const signed = await getSignedAvatarUrl(raw, 60 * 60 * 24 * 30);
                    uri = signed || raw; 
                  } catch {
                    uri = raw; // Fallback to raw URL if signing fails
                  }
                  return [usr.id, uri] as const;
                })
              ),
              Promise.all(
                reviewers.filter(Boolean).map(async (rev) => {
                  const r = rev as DbReviewerSummary;
                  const raw = (r.avatarUrl || '').trim().replace(/^@+/, '');
                  if (!raw) return [r.id, undefined] as const;
                  let uri: string | undefined = raw;
                  try { 
                    const signed = await getSignedAvatarUrl(raw, 60 * 60 * 24 * 30);
                    uri = signed || raw; 
                  } catch {
                    uri = raw; // Fallback to raw URL if signing fails
                  }
                  return [r.id, uri] as const;
                })
              )
            ]);
            
            setUserAvatarMap((prev) => {
              const merged: Record<string, string | undefined> = { ...prev };
              for (const [id, uri] of userEntries) {
                merged[id] = uri || prev[id];
              }
              return merged;
            });
            
            setAvatarMap((prev) => {
              const merged: Record<string, string | undefined> = { ...prev };
              for (const [id, uri] of reviewerEntries) {
                merged[id] = uri || prev[id];
              }
              return merged;
            });
          } catch {}
        } else {
          const uniqueIds = Array.from(new Set(reqs.map(r => r.influencerId).filter(Boolean)));
          const reviewers = await Promise.all(uniqueIds.map(id => getReviewerById(String(id))));
          const rMap: Record<string, DbReviewerSummary> = {};
          reviewers.forEach(rev => { if (rev) rMap[rev.id] = rev; });
          setRevMap(rMap);
          try {
            const entries = await Promise.all(
              reviewers.filter(Boolean).map(async (rev) => {
                const r = rev as DbReviewerSummary;
                const raw = (r.avatarUrl || '').trim().replace(/^@+/, '');
                if (!raw) return [r.id, undefined] as const;
                let uri: string | undefined = raw;
                try { 
                  const signed = await getSignedAvatarUrl(raw, 60 * 60 * 24 * 30);
                  uri = signed || raw; 
                } catch {
                  uri = raw; // Fallback to raw URL if signing fails
                }
                return [r.id, uri] as const;
              })
            );
            setAvatarMap((prev) => {
              const merged: Record<string, string | undefined> = { ...prev };
              for (const [id, uri] of entries) {
                merged[id] = uri || prev[id];
              }
              return merged;
            });
          } catch {}
        }
      } catch {}
      finally {
        if (trigger === 'pull') {
          setRefreshing(false);
        }
      }
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (skipNextFocusRefresh.current) {
        skipNextFocusRefresh.current = false;
        console.log('[my-reviews] focus refresh skipped on first focus');
        return () => {};
      }
      console.log('[my-reviews] screen focused, running refreshData');
      refreshData('focus');
      return () => {};
    }, [refreshData])
  );

  useEffect(() => {
    console.log('[my-reviews] loading state changed', { loading });
  }, [loading]);

  

  const handleRequestPress = (requestId: string) => {
    const request = requests.find(r => r.id === requestId);
    if (!request || !userProfile?.id) return;
    // Route based on role for this specific request: if user is reviewer, go to reviewer detail; if reviewee, go to review detail
    const userIsReviewer = request.influencerId === userProfile.id;
    if (userIsReviewer) {
      router.push(`/requests/reviewer/${requestId}` as any);
    } else {
      router.push(`/review/${requestId}`);
    }
  };

  const handleNewRequest = () => {
    router.push('/(tabs)/requests/new');
  };

  const handleCopyProfileLink = useCallback(async () => {
    if (!userProfile?.id) {
      Alert.alert('Error', 'Profile not loaded');
      return;
    }

    try {
      const slug = userProfile.username || userProfile.id;
      const profileUrl = `https://www.appauro.com/${slug}`;
      
      await copyToClipboard(profileUrl);
      Alert.alert('Copied!', 'Your profile link has been copied to clipboard. You can now paste it in your social media bios!');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy link to clipboard');
    }
  }, [userProfile]);

  // Payment is handled on web only. In-app pay is disabled.

  const renderReceivedItem = ({ item, index }: { item: DbRequestSummary; index: number }) => {
    const cardEntering = hasAnimatedListRef.current ? undefined : cardEntrance(index);
    
    // Determine if current user is the reviewer or reviewee for this specific request
    const userIsReviewer = userProfile?.id && item.influencerId === userProfile.id;
    const userIsReviewee = userProfile?.id && item.userId === userProfile.id;
    
    const reviewer = revMap[item.influencerId];
    const reviewee = item.userId ? userMap[item.userId] : undefined;
    
    // Show reviewee info if user is reviewer, show reviewer info if user is reviewee
    // Try signed URL first, then raw URL, ensuring we don't use empty strings
    const avatarUri = userIsReviewer
      ? (item.userId 
          ? (userAvatarMap[item.userId] && userAvatarMap[item.userId].trim() ? userAvatarMap[item.userId] : (reviewee?.avatarUrl && reviewee.avatarUrl.trim() ? reviewee.avatarUrl : undefined))
          : undefined)
      : ((avatarMap[item.influencerId] && avatarMap[item.influencerId].trim()) 
          ? avatarMap[item.influencerId] 
          : (reviewer?.avatarUrl && reviewer.avatarUrl.trim() ? reviewer.avatarUrl : undefined));
    const displayName = userIsReviewer
      ? (reviewee?.displayName || 'User')
      : (reviewer?.displayName || 'Reviewer');
    
    return (
      <MotionPressable
        key={item.id}
        style={styles.requestCard}
        onPress={() => handleRequestPress(item.id)}
        entering={cardEntering}
        exiting={cardExit()}
        accessibilityRole="button"
        accessibilityLabel={`Open request with ${displayName}`}
      >
        <View style={styles.requestHeader}>
          <RNView style={styles.influencerImageWrapper}>
            {/* Show reviewee avatar/name if user is reviewer, show reviewer if user is reviewee */}
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
                label={userIsReviewer && item.status === 'paid' ? 'Pending acceptance' : undefined}
              />
            </RNView>
          </View>
        </View>
        {item.status === 'completed' && (item as any).review && (item as any).review.ratings?.overall != null && (
          <View style={styles.reviewPreview}>
            <Text style={styles.reviewLabel}>Video Review Completed ✨</Text>
            <Text style={styles.overallRating}>
              Overall Rating: {(item as any).review.ratings?.overall}/10
            </Text>
            {(item as any).review.media?.videoUrl && (
              <Text style={styles.videoHint}>Video review available</Text>
            )}
          </View>
        )}
        {/* Photo previews removed per request */}
        {(item.status === 'accepted' || item.status === 'pending') ? (
          <RNView style={{ marginTop: 12, backgroundColor: Colors.brand.cardBackgroundLight, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.brand.border }}>
            <Text style={{ color: Colors.brand.textSecondary, fontWeight: '700' }}>Payment pending</Text>
            <Text style={{ color: Colors.brand.textSecondary, marginTop: 4 }}>
              {userIsReviewer ? 'Waiting for the requester to finish payment. They have 48 hours to finish payment.' : 'Please check your email regarding payment. You have 48 hours to complete payment.'}
            </Text>
          </RNView>
        ) : null}

        {item.status === 'completed' && (
          <RNView style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
            {!item.archived_at ? (
              <MotionPressable scaleEffect={false} onPress={async () => {
                try { await archiveRequest(item.id); setRequests(prev => prev.map(r => r.id === item.id ? { ...r, archived_at: new Date().toISOString() } as any : r)); } catch {}
              }}>
                <Text style={{ color: Colors.brand.textSecondary }}>Archive</Text>
              </MotionPressable>
            ) : (
              <MotionPressable scaleEffect={false} onPress={async () => {
                try { await unarchiveRequest(item.id); setRequests(prev => prev.map(r => r.id === item.id ? { ...r, archived_at: null } as any : r)); } catch {}
              }}>
                <Text style={{ color: Colors.brand.textSecondary }}>Unarchive</Text>
              </MotionPressable>
            )}
          </RNView>
        )}
      </MotionPressable>
    );
  };

  const SkeletonCard = ({ index }: { index: number }) => (
    <RNView
      style={[styles.requestCard, { backgroundColor: Colors.brand.cardBackground }]}
    >
      <RNView style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent' }}>
        <RNView style={{ marginRight: 16, backgroundColor: 'transparent' }}>
          <SkeletonCircle size={60} delay={index * 100} />
        </RNView>
        <RNView style={{ flex: 1, backgroundColor: 'transparent' }}>
          <SkeletonBlock width="60%" height={12} radius={6} delay={index * 100 + 50} style={{ marginBottom: 10 }} />
          <SkeletonBlock width="40%" height={10} radius={6} delay={index * 100 + 100} style={{ marginBottom: 6 }} />
        </RNView>
      </RNView>
      <SkeletonBlock width="80%" height={10} radius={6} delay={index * 100 + 150} style={{ marginTop: 16 }} />
    </RNView>
  );

  const data = requests.filter(r => {
    if (filter === 'archived') return !!r.archived_at;
    if (filter === 'completed') return r.status === 'completed' && !r.archived_at;
    // active
    return (r.status === 'pending' || r.status === 'accepted' || r.status === 'paid' || r.status === 'in_progress') && !r.archived_at;
  });
  const renderItem = renderReceivedItem;

  // Calculate counts for filter pills (use 0 during initial load to prevent flashing)
  const activeCount = initialLoad ? 0 : requests.filter(r => (r.status === 'pending' || r.status === 'accepted' || r.status === 'paid' || r.status === 'in_progress') && !r.archived_at).length;
  const completedCount = initialLoad ? 0 : requests.filter(r => r.status === 'completed' && !r.archived_at).length;
  const archivedCount = initialLoad ? 0 : requests.filter(r => !!r.archived_at).length;

  // Header component - always visible, never part of skeleton
  const headerComponent = (
    <RNView style={styles.headerPlain}>
      <RNView style={styles.headerContentPlain}>
        <Text style={styles.titlePlain}>My Reviews</Text>
        <Text style={styles.subtitlePlain} numberOfLines={1}>Track your review requests and feedback</Text>

        <MotionPressable
          onPress={handleNewRequest}
          style={styles.discoverButton}
          scaleEffect={false}
          accessibilityRole="button"
        >
          <Text style={styles.discoverButtonText}>Discover Reviewers</Text>
        </MotionPressable>

        <RNView style={[styles.countersRowPlain, { justifyContent: 'center' }]}>
          <MotionPressable
            onPress={() => setFilter('active')}
            style={[styles.counterPillPlain, filter === 'active' ? styles.counterPillActive : styles.counterPillInactive]}
            scaleEffect={false}
            accessibilityRole="button"
          >
            <Text style={styles.counterTextPlain}>Active {activeCount}</Text>
          </MotionPressable>
          <MotionPressable
            onPress={() => setFilter('completed')}
            style={[styles.counterPillPlain, filter === 'completed' ? styles.counterPillActive : styles.counterPillInactive]}
            scaleEffect={false}
            accessibilityRole="button"
          >
            <Text style={styles.counterTextPlain}>Completed {completedCount}</Text>
          </MotionPressable>
          <MotionPressable
            onPress={() => setFilter('archived')}
            style={[styles.counterPillPlain, filter === 'archived' ? styles.counterPillActive : styles.counterPillInactive]}
            scaleEffect={false}
            accessibilityRole="button"
          >
            <Text style={styles.counterTextPlain}>Archived {archivedCount}</Text>
          </MotionPressable>
        </RNView>
      </RNView>
    </RNView>
  );

  return (
    <View style={[styles.container, { paddingTop: 0 }]}>
      {headerComponent}
      {initialLoad ? (
        <RNView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 24, backgroundColor: 'transparent' }}>
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={`s-${i}`} index={i} />
          ))}
        </RNView>
      ) : (
        <MotionView 
          entering={subtleFadeIn()}
          style={{ flex: 1 }}
        >
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => refreshData('pull')}
                tintColor={Colors.brand.textPrimary}
                colors={[Colors.brand.accentMagenta]}
                progressBackgroundColor={Colors.brand.background}
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 16, paddingTop: 0 }}
            ListHeaderComponent={null}
            ListEmptyComponent={(
              <View style={{ paddingHorizontal: 16, paddingTop: 24, alignItems: 'center' }}>
                <EmptyState
                  title="No reviews yet"
                  message={isReviewer && reviewerStatus === 'approved'
                    ? "You haven't received any review requests yet."
                    : isReviewer && reviewerStatus === 'pending'
                    ? "Your reviewer application is pending approval. Once approved, you'll be able to receive review requests."
                    : "Start your journey by requesting your first review from one of our Reviewers!"}
                  icon="⭐"
                />
                {isReviewer && reviewerStatus === 'approved' && (
                  <RNView style={styles.shareProfileSection}>
                    <MotionPressable
                      onPress={handleCopyProfileLink}
                      style={styles.shareProfileButton}
                      scaleEffect={false}
                      accessibilityRole="button"
                    >
                      <Text style={styles.shareProfileButtonText}>Share your profile link</Text>
                    </MotionPressable>
                  </RNView>
                )}
              </View>
            )}
          />
        </MotionView>
      )}
    </View>
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
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
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
    marginBottom: 12,
    textAlign: 'center',
    opacity: 0.9,
    fontWeight: '500',
    flexWrap: 'nowrap',
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
    borderWidth: 2,
  },
  counterPillActive: {
    borderColor: Colors.brand.accentOrange,
    backgroundColor: Colors.brand.cardBackgroundLight,
  },
  counterPillInactive: {
    borderColor: Colors.brand.textSecondary,
    backgroundColor: Colors.brand.cardBackground,
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
    paddingTop: 8,
    marginBottom: 16,
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
    borderWidth: 2,
    borderColor: Colors.brand.accentOrange,
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
    flexDirection: 'column',
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
    marginBottom: 8,
  },
  overallRating: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.brand.accentMagenta,
    marginBottom: 8,
  },
  videoHint: {
    fontSize: 12,
    color: Colors.brand.textSecondary,
    fontStyle: 'italic',
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
  discoverButton: {
    backgroundColor: Colors.brand.accentOrange,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginTop: 0,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  discoverButtonText: {
    color: Colors.brand.textOnGradient,
    fontSize: 16,
    fontWeight: '700',
  },
  shareProfileSection: {
    alignItems: 'center',
    marginTop: -20,
    backgroundColor: 'transparent',
  },
  shareProfileButton: {
    backgroundColor: Colors.brand.accentOrange,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  shareProfileButtonText: {
    color: Colors.brand.textOnGradient,
    fontSize: 16,
    fontWeight: '700',
  },
});


