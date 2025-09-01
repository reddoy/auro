import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { getProfileById, getRequestsByReviewer, getUserProfile, updateRequestStatus } from '@/lib/api';
import { getSignedAvatarUrl } from '@/lib/profile';
import type { DbRequestSummary } from '@/types';

export default function ReviewerInboxScreen() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<DbRequestSummary[]>([]);
  const [userMap, setUserMap] = useState<Record<string, { id: string; displayName: string; username?: string | null; avatarUrl?: string | null }>>({});
  const [userAvatarMap, setUserAvatarMap] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    const run = async () => {
      try {
        const profile = await getUserProfile();
        if (!profile?.id) {
          setRequests([]);
          return;
        }
        const reqs = await getRequestsByReviewer(profile.id);
        setRequests(reqs);
        const uniqueUserIds = Array.from(new Set(reqs.map(r => r.userId).filter(Boolean))) as string[];
        const users = await Promise.all(uniqueUserIds.map(id => getProfileById(id)));
        const map: Record<string, any> = {};
        users.forEach(u => { if (u) map[u.id] = u; });
        setUserMap(map);
        // Prefetch signed avatar URLs if needed
        try {
          const pairs = await Promise.all(
            users.filter(Boolean).map(async (u) => {
              const user = u as any;
              let uri = user?.avatarUrl || '';
              if (uri && !/^https?:\/\//i.test(uri)) {
                try { uri = (await getSignedAvatarUrl(uri, 3600)) || ''; } catch {}
              }
              return [user.id, uri] as const;
            })
          );
          setUserAvatarMap(Object.fromEntries(pairs));
        } catch {}
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return '#009688';
      case 'accepted':
        return '#673AB7';
      case 'pending':
        return '#2196F3';
      case 'rejected':
        return '#F44336';
      default:
        return '#999';
    }
  };

  const handleAccept = async (request: DbRequestSummary) => {
    try {
      await updateRequestStatus(request.id, 'accepted');
      setRequests(prev => prev.map(r => (r.id === request.id ? { ...r, status: 'accepted' as any } : r)));
      Alert.alert('Request accepted', 'The requestor will be prompted to pay.');
    } catch (e: any) {
      Alert.alert('Failed', e?.message || 'Could not accept');
    }
  };

  const handleDecline = async (request: DbRequestSummary) => {
    try {
      await updateRequestStatus(request.id, 'rejected');
      setRequests(prev => prev.map(r => (r.id === request.id ? { ...r, status: 'rejected' as any } : r)));
    } catch (e: any) {
      Alert.alert('Failed', e?.message || 'Could not decline');
    }
  };

  const scheduleStub = (request: DbRequestSummary) => {
    Alert.alert('Schedule review', 'Coming soon: messaging and scheduling.');
  };

  return (
    <View style={styles.container}>
      <ExpoLinearGradient colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]} style={styles.backgroundGradient} />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 72 }}>
        <ExpoLinearGradient colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Reviewer Inbox</Text>
            <Text style={styles.subtitle}>Manage incoming requests</Text>
          </View>
        </ExpoLinearGradient>

        <View style={styles.requestsList}>
          {loading ? (
            <View style={styles.emptyState}><Text style={styles.emptyStateText}>Loading...</Text></View>
          ) : requests.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>No incoming requests</Text>
              <Text style={styles.emptyStateText}>You will see new requests here.</Text>
            </View>
          ) : (
            requests.map(request => {
              const u = userMap[request.userId || ''];
              return (
                <View key={request.id} style={styles.requestCard}>
                  <View style={styles.requestHeader}>
                    <Image source={{ uri: userAvatarMap[request.userId || ''] || u?.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' }} style={styles.userImage} />
                    <View style={styles.requestInfo}>
                      <Text style={styles.userName}>{u?.displayName || 'User'}</Text>
                      <Text style={styles.requestDate}>{new Date(request.createdAt).toLocaleDateString()}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
                        <Text style={styles.statusText}>{request.status.toUpperCase()}</Text>
                      </View>
                    </View>
                  </View>

                  {!!request.notes && (
                    <View style={styles.notesBox}>
                      <Text style={styles.notesLabel}>Notes</Text>
                      {(() => {
                        let n: any = request.notes as any;
                        try { if (typeof n === 'string') n = JSON.parse(n); } catch {}
                        if (n && typeof n === 'object') {
                          return (
                            <>
                              {n.message ? <Text style={styles.notesText}>{n.message}</Text> : null}
                              {(n.package?.label || n.package?.price) ? (
                                <Text style={styles.notesText}>
                                  Package: {n.package?.label ?? 'Package'}{n.package?.price ? ` — $${n.package.price}` : ''}
                                </Text>
                              ) : null}
                              {n.consent?.shareOnSocial != null ? (
                                <Text style={styles.notesText}>Sharing consent: {n.consent.shareOnSocial ? 'Yes' : 'No'}</Text>
                              ) : null}
                            </>
                          );
                        }
                        return <Text style={styles.notesText}>{String(request.notes)}</Text>;
                      })()}
                    </View>
                  )}

                  {request.photos?.length > 0 ? (
                    <View style={styles.photosPreview}>
                      <Text style={styles.photosLabel}>{request.photos.length} photo{request.photos.length > 1 ? 's' : ''} submitted</Text>
                      <View style={styles.photoThumbnails}>
                        {request.photos.slice(0, 3).map((photo, index) => (
                          <Image key={index} source={{ uri: photo }} style={styles.photoThumbnail} />
                        ))}
                      </View>
                    </View>
                  ) : null}

                  {request.status === 'pending' ? (
                    <View style={styles.actionsRow}>
                      <TouchableOpacity style={[styles.actionBtn, styles.declineBtn]} onPress={() => handleDecline(request)}>
                        <Text style={styles.actionText}>Decline</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]} onPress={() => handleAccept(request)}>
                        <Text style={styles.actionText}>Accept</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  {request.status === 'paid' ? (
                    <View style={styles.actionsRow}>
                      <View style={styles.paidPill}><Text style={styles.paidPillText}>PAID</Text></View>
                      <TouchableOpacity style={[styles.actionBtn, styles.scheduleBtn]} onPress={() => scheduleStub(request)}>
                        <Text style={styles.actionText}>Schedule review</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.brand.background },
  backgroundGradient: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  scrollView: { flex: 1, backgroundColor: 'transparent' },
  header: { paddingTop: 60, paddingBottom: 40, paddingHorizontal: 0, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, shadowColor: Colors.brand.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 12 },
  headerContent: { paddingHorizontal: 20, alignItems: 'center', backgroundColor: 'transparent', width: '100%' },
  title: { fontSize: 32, fontWeight: '700', fontFamily: 'Poppins_700Bold', marginBottom: 8, color: Colors.brand.textOnGradient, textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.1)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  subtitle: { fontSize: 16, color: Colors.brand.textOnGradient, marginBottom: 10, textAlign: 'center', opacity: 0.9, fontWeight: '500', fontFamily: 'Inter_600SemiBold' },
  requestsList: { padding: 24, paddingTop: 32, paddingBottom: 100 },
  emptyState: { alignItems: 'center', padding: 48, backgroundColor: Colors.brand.cardBackground, borderRadius: 28, marginTop: 24, shadowColor: Colors.brand.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 8, borderWidth: 0 },
  emptyStateTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.brand.textPrimary, marginBottom: 12 },
  emptyStateText: { fontSize: 16, color: Colors.brand.textSecondary, textAlign: 'center', lineHeight: 24 },
  requestCard: { backgroundColor: Colors.brand.cardBackground, borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: Colors.brand.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6, borderWidth: 0, overflow: 'hidden', minHeight: 100 },
  requestHeader: { flexDirection: 'row', marginBottom: 15, backgroundColor: 'transparent', alignItems: 'center' },
  userImage: { width: 60, height: 60, borderRadius: 30, marginRight: 16, borderWidth: 0, shadowColor: Colors.brand.shadowMedium, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4, overflow: 'hidden', backgroundColor: '#f0f0f0' },
  requestInfo: { flex: 1, backgroundColor: 'transparent', justifyContent: 'center' },
  userName: { fontSize: 19, fontWeight: 'bold', fontFamily: 'Inter_600SemiBold', color: Colors.brand.textPrimary, marginBottom: 4 },
  requestDate: { fontSize: 14, color: Colors.brand.textSecondary, marginBottom: 8 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  notesBox: { backgroundColor: Colors.brand.cardBackgroundSecondary, padding: 12, borderRadius: 12, marginBottom: 10 },
  notesLabel: { color: Colors.brand.textSecondary, marginBottom: 4, fontSize: 12 },
  notesText: { color: Colors.brand.textPrimary },
  photosPreview: { marginTop: 6, backgroundColor: 'transparent' },
  photosLabel: { fontSize: 14, color: Colors.brand.textSecondary, marginBottom: 8 },
  photoThumbnails: { flexDirection: 'row', backgroundColor: 'transparent' },
  photoThumbnail: { width: 54, height: 54, borderRadius: 12, marginRight: 10, borderWidth: 0, shadowColor: Colors.brand.shadowLight, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, overflow: 'hidden', backgroundColor: Colors.brand.cardBackground },
  actionsRow: { flexDirection: 'row', marginTop: 12, justifyContent: 'flex-end' },
  actionBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, marginLeft: 10 },
  declineBtn: { backgroundColor: '#6A1B9A22' },
  acceptBtn: { backgroundColor: '#43A04722' },
  scheduleBtn: { backgroundColor: '#2196F322' },
  actionText: { color: Colors.brand.textPrimary, fontWeight: '700' },
  paidPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#009688', alignSelf: 'center' },
  paidPillText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});


