import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, View as RNView, Linking, Image, Platform, Modal, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';

import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import Avatar from '@/components/Avatar';
import { getReviewerById, getRequestsByReviewer, getReviewerReviewsByReviewerId } from '@/lib/api';
import { getSignedAvatarUrl } from '@/lib/profile';
import type { DbReviewerSummary } from '@/types';
import { supabase } from '@/lib/supabase';
import { getTierInfo } from '@/lib/iapPriceTiers';

// Lazy load IAP functions to avoid errors in Expo Go
let purchaseReviewRequest: any;
try {
  const iapModule = require('@/lib/inAppPurchases');
  purchaseReviewRequest = iapModule.purchaseReviewRequest;
} catch (error) {
  purchaseReviewRequest = null;
}

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
  const [reviewerReviews, setReviewerReviews] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [showPriceExplanation, setShowPriceExplanation] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'web' | 'inapp'>('web');

  useEffect(() => {
    const run = async () => {
      try {
        if (!id) return;
        const r = await getReviewerById(String(id));
        setReviewer(r);
        const initialCount =
          r?.reviewsGivenCount != null && !Number.isNaN(Number(r.reviewsGivenCount))
            ? Number(r.reviewsGivenCount)
            : 0;
        setCompletedCount(initialCount);
        let uri = r?.avatarUrl || '';
        if (uri) {
          try { uri = (await getSignedAvatarUrl(uri, 60 * 60 * 24 * 30)) || uri; } catch {}
        }
        setAvatarUri(uri || undefined);
        // Load stats in parallel
        try {
          const [reqs, reviewerRevws] = await Promise.all([
            getRequestsByReviewer(String(id)),
            getReviewerReviewsByReviewerId(String(id)),
          ]);
          console.log('[reviewer-profile] Loaded data:', {
            reviewerId: String(id),
            reviewerReviewsCount: reviewerRevws?.length || 0,
            reviewerReviews: reviewerRevws,
          });
          const requestCompleted = (reqs || []).filter((rq: any) => rq.status === 'completed').length;
          const reviewerReviewsCompleted = (reviewerRevws || []).length;
          const fallbackCount =
            r?.reviewsGivenCount != null && !Number.isNaN(Number(r.reviewsGivenCount))
              ? Number(r.reviewsGivenCount)
              : null;
          const bestCount = [fallbackCount, requestCompleted, reviewerReviewsCompleted]
            .filter((value): value is number => typeof value === 'number' && !Number.isNaN(Number(value)))
            .reduce((max, value) => Math.max(max, value), 0);
          setCompletedCount(
            bestCount
          );
          setReviewerReviews(reviewerRevws || []);
          
          // Use rating_average from profile (same as discover page) as primary source
          // This ensures consistency between discover page and profile page
          if (r?.rating != null && !isNaN(Number(r.rating))) {
            setAvgRating(Number(r.rating));
          } else {
            // Fallback: Calculate average rating from reviewer reviews if rating_average is not set
            const reviewerRatings = (reviewerRevws || []).map((r: any) => r.rating).filter((n: number) => !isNaN(n) && n > 0);
            if (reviewerRatings.length > 0) {
              const avg = reviewerRatings.reduce((a: number, b: number) => a + b, 0) / reviewerRatings.length;
              setAvgRating(Number(avg.toFixed(2)));
            } else {
              setAvgRating(null);
            }
          }
        } catch (error) {
          console.error('[reviewer-profile] Error loading stats:', error);
        }
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

  const handleWebPayment = async () => {
    if (!reviewer) return;
    
    // Build URL with creatorSlug (username) if available, otherwise use creatorId
    let requestUrl = 'https://www.appauro.com/request?';
    if (reviewer.username) {
      requestUrl += `creatorSlug=${encodeURIComponent(reviewer.username)}`;
    } else {
      requestUrl += `creatorId=${encodeURIComponent(reviewer.id)}`;
    }
    
    // Try to get current session and create auth code for seamless login
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token && session?.refresh_token) {
        // Call API to generate a temporary code
        const response = await fetch('https://www.appauro.com/api/auth/app-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            accessToken: session.access_token,
            refreshToken: session.refresh_token 
          }),
        });
        
        if (response.ok) {
          const { code } = await response.json();
          if (code) {
            requestUrl += `&authCode=${encodeURIComponent(code)}`;
          }
        }
      }
    } catch (error) {
      // If auth code generation fails, just continue without it
      console.warn('Failed to generate auth code:', error);
    }
    
    try {
      Linking.openURL(requestUrl);
    } catch (error) {
      console.error('Error opening request URL:', error);
    }
  };

  const handleIAPPayment = async () => {
    if (!reviewer) return;
    
    if (Platform.OS !== 'ios') {
      Alert.alert('Not Available', 'In-app purchases are only available on iOS.');
      return;
    }

    if (!purchaseReviewRequest) {
      Alert.alert(
        'Not Available',
        'In-app purchases require a development build. Please use EAS Build or a development build instead of Expo Go.'
      );
      return;
    }

    // Navigate to mobile request flow with preselected reviewer
    const params: any = {};
    if (reviewer.username) {
      params.creatorSlug = reviewer.username;
    } else {
      params.creatorId = reviewer.id;
    }
    
    router.push({
      pathname: '/request',
      params,
    });
  };

  const handlePayment = () => {
    if (paymentMethod === 'web') {
      handleWebPayment();
    } else {
      handleIAPPayment();
    }
  };

  // Calculate prices
  const reviewerRate = reviewer?.pricePerReview || 75;
  const tierInfo = getTierInfo(reviewerRate);
  const webPrice = tierInfo.webPrice;
  const iapPrice = tierInfo.iapPrice;

  const bottomPadding = Platform.OS === 'web' ? 24 : insets.bottom + 120;

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <RNView style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
      </RNView>
      <ScrollView
        contentContainerStyle={{ paddingTop: 12, paddingBottom: bottomPadding, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <RNView style={styles.card}>
          <RNView style={{ alignItems: 'center' }}>
            <Avatar uri={avatarUri} name={reviewer?.displayName} size={96} />
            <Text style={styles.name}>{reviewer?.displayName || 'Reviewer'}</Text>
            {!!reviewer?.bio && (
              <Text style={styles.bio}>{reviewer.bio}</Text>
            )}
          </RNView>

          {/* Payment Options */}
          <RNView style={styles.paymentSection}>
            <RNView style={styles.paymentHeader}>
              <Text style={styles.paymentTitle}>Request a Review</Text>
              <TouchableOpacity onPress={() => setShowPriceExplanation(true)}>
                <Text style={styles.explanationLink}>Why different prices?</Text>
              </TouchableOpacity>
            </RNView>

            {/* Web Payment Option */}
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'web' && styles.paymentOptionSelected,
              ]}
              onPress={() => setPaymentMethod('web')}
              activeOpacity={0.8}
            >
              <RNView style={styles.paymentOptionContent}>
                <RNView>
                  <Text style={styles.paymentOptionTitle}>Continue on the Web</Text>
                  <Text style={styles.paymentOptionSubtitle}>Lower price</Text>
                </RNView>
                <Text style={styles.paymentOptionPrice}>${webPrice}</Text>
              </RNView>
              <Text style={styles.paymentOptionDescription}>
                Complete your purchase on our website
              </Text>
            </TouchableOpacity>

            {/* In-App Purchase Option */}
            {Platform.OS === 'ios' && purchaseReviewRequest && (
              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  paymentMethod === 'inapp' && styles.paymentOptionSelected,
                ]}
                onPress={() => setPaymentMethod('inapp')}
                activeOpacity={0.8}
              >
                <RNView style={styles.paymentOptionContent}>
                  <RNView>
                    <Text style={styles.paymentOptionTitle}>Continue in App</Text>
                    <Text style={styles.paymentOptionSubtitle}>Higher price</Text>
                  </RNView>
                  <Text style={styles.paymentOptionPrice}>${iapPrice}</Text>
                </RNView>
                <Text style={styles.paymentOptionDescription}>
                  Purchase directly in the app
                </Text>
              </TouchableOpacity>
            )}

            {/* Payment Button */}
            <TouchableOpacity
              style={styles.requestButton}
              onPress={handlePayment}
              activeOpacity={0.8}
              accessibilityLabel="Request a review from this reviewer"
            >
              <ExpoLinearGradient
                colors={[Colors.brand.accentMagenta, Colors.brand.accentOrange]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.requestButtonGradient}
              >
                <Text style={styles.requestButtonText}>
                  {paymentMethod === 'web'
                    ? `Continue on Web - $${webPrice}`
                    : `Continue in App - $${iapPrice}`}
                </Text>
              </ExpoLinearGradient>
            </TouchableOpacity>
          </RNView>

          {/* Price Explanation Modal */}
          <Modal
            visible={showPriceExplanation}
            transparent
            animationType="fade"
            onRequestClose={() => setShowPriceExplanation(false)}
          >
            <RNView style={styles.modalOverlay}>
              <RNView style={styles.modalContent}>
                <RNView style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Why are these prices different?</Text>
                  <TouchableOpacity onPress={() => setShowPriceExplanation(false)}>
                    <Text style={styles.modalClose}>×</Text>
                  </TouchableOpacity>
                </RNView>
                <Text style={styles.modalBody}>
                  The fee for in-app purchases does not apply to purchases made directly through Auro. 
                  This is why the price is lower when you continue on the web.
                </Text>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setShowPriceExplanation(false)}
                >
                  <ExpoLinearGradient
                    colors={[Colors.brand.accentMagenta, Colors.brand.accentOrange]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.modalButtonGradient}
                  >
                    <Text style={styles.modalButtonText}>Got it</Text>
                  </ExpoLinearGradient>
                </TouchableOpacity>
              </RNView>
            </RNView>
          </Modal>

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
  header: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: Colors.brand.cardBackground,
  },
  backButtonText: {
    fontSize: 24,
    color: Colors.brand.textPrimary,
    fontWeight: '300',
  },
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
  paymentSection: {
    marginTop: 16,
    marginBottom: 16,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
  },
  explanationLink: {
    fontSize: 14,
    color: Colors.brand.accentOrange,
    textDecorationLine: 'underline',
  },
  paymentOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  paymentOptionSelected: {
    backgroundColor: 'rgba(255, 111, 0, 0.1)',
    borderColor: 'rgba(255, 111, 0, 0.5)',
  },
  paymentOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  paymentOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.brand.textPrimary,
    marginBottom: 4,
  },
  paymentOptionSubtitle: {
    fontSize: 13,
    color: Colors.brand.textSecondary,
  },
  paymentOptionPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
  },
  paymentOptionDescription: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
  },
  requestButton: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.brand.accentMagenta,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  requestButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: Colors.brand.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.brand.textPrimary,
    flex: 1,
  },
  modalClose: {
    fontSize: 28,
    color: Colors.brand.textSecondary,
    marginLeft: 16,
  },
  modalBody: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
    lineHeight: 24,
    marginBottom: 20,
  },
  modalButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});


