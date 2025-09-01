import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { getInfluencerById, getReviewerById, getUserProfile, getRequestsByUser, updateRequestStatus } from '@/lib/api';
import type { DbInfluencerSummary, DbReviewerSummary, DbRequestSummary } from '@/types';
import { getSignedAvatarUrl } from '@/lib/profile';
import { openPaymentSheet } from '@/lib/payments';

export default function InfluencerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [influencer, setInfluencer] = useState<DbInfluencerSummary | null>(null);
  const [reviewer, setReviewer] = useState<DbReviewerSummary | null>(null);
  const [avatar, setAvatar] = useState<string>('');
  const [currentRequest, setCurrentRequest] = useState<DbRequestSummary | null>(null);
  const [paying, setPaying] = useState(false);

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
        return 'rgba(0,0,0,0.18)';
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

  useEffect(() => {
    const run = async () => {
      if (!id) return;
      try {
        const [inf, rev] = await Promise.all([
          getInfluencerById(String(id)),
          getReviewerById(String(id)),
        ]);
        setInfluencer(inf);
        setReviewer(rev);
        const raw = (rev?.avatarUrl || inf?.profileImage) ?? '';
        let uri = raw;
        if (uri && !/^https?:\/\//i.test(uri)) {
          try { uri = (await getSignedAvatarUrl(uri, 3600)) || ''; } catch {}
        }
        setAvatar(uri);

        // Load user's latest request with this reviewer, if any
        try {
          const profile = await getUserProfile();
          if (profile?.id) {
            const reqs = await getRequestsByUser(profile.id);
            const match = reqs.find(r => String(r.influencerId) === String(id));
            if (match) setCurrentRequest(match);
          }
        } catch {}
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id]);

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: Colors.brand.background }} />;
  }

  if (!influencer && !reviewer) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.brand.background }}>
        <Text style={{ color: Colors.brand.textSecondary }}>Influencer not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <ExpoLinearGradient
        colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Image source={{ uri: avatar || influencer?.profileImage || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' }} style={styles.avatar} />
          <Text style={styles.name}>{influencer?.name || reviewer?.displayName}</Text>
          <Text style={styles.username}>{influencer?.username || reviewer?.username}</Text>
          <View style={styles.rowGap} />
          <View style={styles.tagsRow}>
            {(influencer?.specialties || reviewer?.skills || []).map((s: any, idx: number) => (
              <Text key={idx} style={styles.tag}>{s}</Text>
            ))}
          </View>
          <View style={styles.metaRow}>
            {(influencer?.rating != null || reviewer?.rating != null) ? (
              <Text style={styles.meta}>⭐ {(influencer?.rating ?? reviewer?.rating) as any}</Text>
            ) : null}
            {(influencer?.pricePerReview != null || reviewer?.hourlyRate != null) ? (
              <Text style={styles.meta}>${influencer?.pricePerReview ?? reviewer?.hourlyRate}</Text>
            ) : null}
          </View>

          {currentRequest ? (
            <View style={[styles.statusBanner, { backgroundColor: getStatusColor(String(currentRequest.status)) }]}>
              <Text style={styles.statusBannerText}>Your request is {getStatusText(String(currentRequest.status))}</Text>
              {currentRequest.status === 'accepted' ? (
                <TouchableOpacity
                  style={styles.payBtn}
                  disabled={paying}
                  onPress={async () => {
                    if (!currentRequest) return;
                    const amount = reviewer?.hourlyRate != null ? reviewer.hourlyRate : (influencer?.pricePerReview ?? 50);
                    try {
                      setPaying(true);
                      const res = await openPaymentSheet({ amountCents: Math.round((amount || 50) * 100), currency: 'usd', requestId: currentRequest.id });
                      if (res.completed) {
                        const updated = await updateRequestStatus(currentRequest.id, 'paid');
                        setCurrentRequest(updated);
                        Alert.alert(
                          'Payment successful',
                          'You can view your request details or return to My Reviews.',
                          [
                            { text: 'View details', onPress: () => router.push(`/(tabs)/requests/${currentRequest.id}`) },
                            { text: 'My Reviews', onPress: () => router.push('/(tabs)/requests') },
                            { text: 'Close', style: 'cancel' },
                          ]
                        );
                      }
                    } finally {
                      setPaying(false);
                    }
                  }}
                >
                  <Text style={styles.payBtnText}>{paying ? 'Processing…' : 'Pay now'}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.detailsBtn}
                  onPress={() => router.push(`/(tabs)/requests/${currentRequest.id}`)}
                >
                  <Text style={styles.detailsBtnText}>{currentRequest.status === 'completed' ? 'View review' : 'View details'}</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.cta}
            onPress={() => router.push(`/(tabs)/requests/new?influencerId=${influencer?.id || reviewer?.id}`)}
          >
            <Text style={styles.ctaText}>Request a Review</Text>
          </TouchableOpacity>
        </View>
      </ExpoLinearGradient>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.brand.background,
  },
  header: {
    paddingTop: 80,
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  name: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.brand.textOnGradient,
  },
  username: {
    marginTop: 4,
    fontSize: 14,
    color: Colors.brand.textOnGradient,
    opacity: 0.9,
  },
  rowGap: { height: 12 },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 8,
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    color: Colors.brand.textOnGradient,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    margin: 4,
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  meta: {
    color: Colors.brand.textOnGradient,
    fontWeight: '700',
  },
  cta: {
    marginTop: 18,
    backgroundColor: '#FF2D55',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  ctaText: { color: '#fff', fontWeight: '700' },
  statusBanner: {
    marginTop: 14,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignSelf: 'stretch',
  },
  statusBannerText: {
    color: '#fff',
    fontWeight: '700',
    marginBottom: 8,
  },
  payBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#FF2D55',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  payBtnText: { color: '#fff', fontWeight: '700' },
  detailsBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  detailsBtnText: { color: '#fff', fontWeight: '700' },
});


