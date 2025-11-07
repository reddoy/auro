import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, View as RNView, Linking, Image, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import Avatar from '@/components/Avatar';
import { getReviewerById, getRequestsByReviewer, getReviewerReviewsByReviewerId } from '@/lib/api';
import { getSignedAvatarUrl } from '@/lib/profile';
import { getReviewsReceived } from '@/lib/profile';
import type { DbReviewerSummary } from '@/types';

const socialIcons = {
  instagram: require('../../../../Instagram_icon-removebg-preview.png'),
  tiktok: require('../../../../tiktok-icon-free-png-removebg-preview.png'),
  linktree: require('../../../../linktreelogo.png'),
};

export default function ReviewerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [reviewer, setReviewer] = useState<DbReviewerSummary | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewerReviews, setReviewerReviews] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        if (!id) return;
        const r = await getReviewerById(String(id));
        setReviewer(r);
        let uri = r?.avatarUrl || '';
        if (uri) {
          try { uri = (await getSignedAvatarUrl(uri, 60 * 60 * 24 * 30)) || uri; } catch {}
        }
        setAvatarUri(uri || undefined);
        // Load stats in parallel
        try {
          const [reqs, recvd, reviewerRevws] = await Promise.all([
            getRequestsByReviewer(String(id)),
            getReviewsReceived(String(id)),
            getReviewerReviewsByReviewerId(String(id)),
          ]);
          const completed = (reqs || []).filter((rq: any) => rq.status === 'completed').length;
          setCompletedCount(completed);
          setReviews(recvd.items || []);
          setReviewerReviews(reviewerRevws || []);
          
          // Calculate average rating from reviewer reviews (preferred) or general reviews
          const reviewerRatings = (reviewerRevws || []).map((r: any) => r.rating).filter((n: number) => !isNaN(n) && n > 0);
          if (reviewerRatings.length > 0) {
            const avg = reviewerRatings.reduce((a: number, b: number) => a + b, 0) / reviewerRatings.length;
            setAvgRating(Number(avg.toFixed(2)));
          } else if (recvd.items && recvd.items.length) {
            const nums = recvd.items
              .map((it: any) => Number(it.rating) || 0)
              .filter((n: number) => !isNaN(n) && n > 0);
            if (nums.length) setAvgRating(Number((nums.reduce((a: number, b: number) => a + b, 0) / nums.length).toFixed(2)));
            else setAvgRating(r?.rating ?? null);
          } else {
            setAvgRating(r?.rating ?? null);
          }
        } catch {}
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id]);

  const openLink = (url?: string | null) => {
    if (!url) return;
    const hasScheme = /^https?:\/\//i.test(url);
    const finalUrl = hasScheme ? url : `https://${url}`;
    try { Linking.openURL(finalUrl); } catch {}
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ paddingTop: 12, paddingBottom: Platform.OS === 'web' ? 24 : 24, paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
        <RNView style={styles.card}>
          <RNView style={{ alignItems: 'center' }}>
            <Avatar uri={avatarUri} name={reviewer?.displayName} size={96} />
            <Text style={styles.name}>{reviewer?.displayName || 'Reviewer'}</Text>
            {!!reviewer?.bio && (
              <Text style={styles.bio}>{reviewer.bio}</Text>
            )}
          </RNView>

          {/* Stats */}
          <RNView style={styles.statsRow}>
            <RNView style={styles.statCard}>
              <Text style={styles.statNumber}>{completedCount}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </RNView>
            <RNView style={styles.statCard}>
              <Text style={styles.statNumber}>{avgRating != null ? avgRating : '—'}</Text>
              <Text style={styles.statLabel}>Avg Rating</Text>
            </RNView>
          </RNView>

          {/* Social links */}
          {!!reviewer?.links && (
            <RNView style={styles.section}>
              <Text style={styles.sectionTitle}>Socials</Text>
              <RNView style={{ gap: 10 }}>
                {(() => {
                  const l: any = reviewer.links || {};
                  const ig = (l.instagram || '').trim().replace(/^@+/, '');
                  const tt = (l.tiktok || '').trim().replace(/^@+/, '');
                  const lt = (l.linktree || '').trim().replace(/^@+/, '');
                  const items: { key: 'instagram' | 'tiktok' | 'linktree'; handle: string; url: string; text: string }[] = [];
                  if (ig) items.push({ key: 'instagram', handle: ig, url: `https://instagram.com/${ig}`, text: `@${ig}` });
                  if (tt) items.push({ key: 'tiktok', handle: tt, url: `https://www.tiktok.com/@${tt}`, text: `@${tt}` });
                  if (lt) items.push({ key: 'linktree', handle: lt, url: `https://linktr.ee/${lt}`, text: `${lt}` });
                  return items.map((it) => (
                    <TouchableOpacity key={it.key} style={styles.socialBtn} onPress={() => openLink(it.url)} accessibilityRole="link" accessibilityLabel={`Open ${it.key} ${it.handle}`}>
                      <Image source={socialIcons[it.key]} style={styles.socialIcon} resizeMode="contain" />
                      <Text style={styles.socialText}>{it.text}</Text>
                    </TouchableOpacity>
                  ));
                })()}
              </RNView>
            </RNView>
          )}
        </RNView>

        {/* Reviews from clients (reviewer reviews from completed requests) */}
        <RNView style={[styles.card, { marginTop: 16 }]}> 
          <Text style={styles.sectionTitle}>Client Reviews</Text>
          {reviewerReviews.length > 0 ? (
            <RNView>
              {reviewerReviews.slice(0, 5).map((rv: any) => (
                <RNView key={rv.id} style={styles.reviewItem}>
                  <RNView style={styles.reviewRatingRow}>
                    {[1, 2, 3, 4, 5].map((r) => (
                      <Text
                        key={r}
                        style={[
                          styles.reviewStar,
                          { color: r <= rv.rating ? Colors.brand.accentMagenta : Colors.brand.border }
                        ]}
                      >
                        ★
                      </Text>
                    ))}
                  </RNView>
                  {!!rv.comment && <Text style={styles.reviewComment}>{rv.comment}</Text>}
                  <Text style={styles.reviewMeta}>{new Date(rv.createdAt || Date.now()).toLocaleDateString()}</Text>
                </RNView>
              ))}
            </RNView>
          ) : reviews.length > 0 ? (
            <RNView>
              {reviews.slice(0, 5).map((rv: any) => (
                <RNView key={rv.id} style={styles.reviewItem}>
                  <Text style={styles.reviewRating}>{typeof rv.rating === 'number' ? `${rv.rating.toFixed(1)}★` : '—'}</Text>
                  {!!rv.comment && <Text style={styles.reviewComment}>{rv.comment}</Text>}
                  <Text style={styles.reviewMeta}>{new Date(rv.created_at || Date.now()).toLocaleDateString()}</Text>
                </RNView>
              ))}
            </RNView>
          ) : (
            <Text style={styles.emptyText}>No reviews yet.</Text>
          )}
        </RNView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.brand.background },
  card: { backgroundColor: Colors.brand.cardBackground, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.brand.border },
  name: { marginTop: 12, fontSize: 24, fontWeight: '800', color: Colors.brand.textPrimary, textAlign: 'center' },
  bio: { marginTop: 8, fontSize: 15, color: Colors.brand.textPrimary, textAlign: 'center', lineHeight: 21 },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: Colors.brand.textPrimary, marginBottom: 10 },
  socialBtn: { backgroundColor: 'rgba(32,21,50,1.00)', borderWidth: 1, borderColor: Colors.brand.border, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' },
  socialIcon: { width: 20, height: 20, marginRight: 10, borderRadius: 4 },
  socialText: { color: Colors.brand.textPrimary, fontWeight: '700', fontSize: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  statCard: { flex: 1, backgroundColor: Colors.brand.cardBackgroundLight, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginRight: 8 },
  statNumber: { color: Colors.brand.textPrimary, fontWeight: '800', fontSize: 18 },
  statLabel: { color: Colors.brand.textSecondary, fontWeight: '600', fontSize: 12 },
  reviewItem: { backgroundColor: Colors.brand.cardBackgroundLight, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 10 },
  reviewRating: { color: Colors.brand.accentMagenta, fontWeight: '800', marginBottom: 4 },
  reviewRatingRow: { flexDirection: 'row', marginBottom: 4, gap: 2 },
  reviewStar: { fontSize: 16 },
  reviewComment: { color: Colors.brand.textPrimary, marginBottom: 4 },
  reviewMeta: { color: Colors.brand.textSecondary, fontSize: 12 },
  emptyText: { color: Colors.brand.textSecondary },
  
});


