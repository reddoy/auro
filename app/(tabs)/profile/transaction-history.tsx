import React, { useCallback, useEffect, useState, useRef } from 'react';
import { StyleSheet, TouchableOpacity, FlatList, RefreshControl, Platform, Alert, Linking, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';

import { Text, View } from '@/components/Themed';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import { getRequestsByReviewer, getRequestsByUser, getReviewerById } from '@/lib/api';
import { createStripeExpressLoginLink, createStripeExpressOnboardingLink } from '@/lib/payments';
import type { Profile } from '@/types';
import { MotionView, cardEntrance, subtleFadeIn } from '@/components/motion';
import { SkeletonBlock, SkeletonCircle, SkeletonParagraph } from '@/components/Skeletons';

interface TransactionItem {
  id: string;
  status: string;
  amount_cents: number;
  application_fee_cents: number;
  reviewer_amount_cents?: number;
  payment_distributed: boolean;
  payment_distributed_at?: string | null;
  payment_distribution_error?: string | null;
  payment_status?: string | null;
  created_at: string;
  completed_at?: string | null;
  requester_name?: string | null;
  requester_username?: string | null;
  reviewer_name?: string | null;
  reviewer_username?: string | null;
  is_reviewer_view?: boolean;
}

export default function TransactionBreakdownScreen() {
  const insets = useSafeAreaInsets();
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stripePortalUrl, setStripePortalUrl] = useState<string | null>(null);
  const skipNextFocusRefresh = useRef(true);
  const loadInFlightRef = useRef(false);

  const renderSkeleton = (overlay = false) => {
    const header = (
      <MotionView entering={subtleFadeIn()} style={[styles.header, { paddingTop: 12 }]}>
        <View style={{ marginRight: 12 }}>
          <SkeletonCircle size={40} />
        </View>
        <SkeletonBlock width={180} height={24} radius={12} />
      </MotionView>
    );

    const body = (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <MotionView entering={cardEntrance(0)} style={styles.summaryCard}>
          <SkeletonBlock width="50%" height={18} />
          <SkeletonParagraph
            lines={2}
            lineHeight={12}
            widths={['100%', '75%']}
            style={{ marginTop: 12 }}
          />
        </MotionView>
        {[...Array(3)].map((_, idx) => (
          <MotionView key={idx} entering={cardEntrance(idx + 1)} style={styles.transactionCard}>
            <View style={styles.transactionSkeletonHeader}>
              <View style={{ flex: 1 }}>
                <SkeletonBlock width="70%" height={18} />
                <SkeletonBlock width="45%" height={12} style={{ marginTop: 8 }} />
              </View>
              <SkeletonBlock width={72} height={26} radius={12} />
            </View>
            <SkeletonBlock width="80%" height={12} style={{ marginBottom: 16 }} />
            <SkeletonParagraph
              lines={4}
              lineHeight={12}
              widths={['55%', '60%', '65%', '70%']}
            />
          </MotionView>
        ))}
      </ScrollView>
    );

    if (overlay) {
      return (
        <View style={styles.refreshOverlay}>
          {header}
          {body}
        </View>
      );
    }

    return (
      <View style={styles.container}>
        {header}
        {body}
      </View>
    );
  };

  const loadTransactions = useCallback(
  async (reason: 'initial' | 'focus' | 'pull' = 'initial') => {
    if (loadInFlightRef.current) {
      console.log('[transactions] load skipped', { reason, inFlight: true });
      return;
    }

    loadInFlightRef.current = true;
    if (reason === 'initial') {
      setLoading(true);
    } else if (reason === 'pull') {
      setRefreshing(true);
    }
    console.log('[transactions] load started', { reason });

    try {
      const p = await supabase.auth.getUser();
      if (!p.data.user) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', p.data.user.id)
        .single();

      setProfile(profileData);

      if (profileData?.is_reviewer && profileData.stripe_connect_account_id) {
        try {
          const url = await createStripeExpressLoginLink(profileData.id);
          setStripePortalUrl(url);
        } catch (e) {
          console.log('[stripe-portal] error', e);
          setStripePortalUrl(null);
        }
      } else {
        setStripePortalUrl(null);
      }

      if (profileData?.is_reviewer) {
        // Reviewer view: show transactions where they are the reviewer
        const requests = await getRequestsByReviewer(profileData.id);

        const transactionItems: TransactionItem[] = requests
          .filter(r => r.amount_cents)
          .map(r => ({
            id: r.id,
            status: r.status,
            amount_cents: r.amount_cents || 0,
            application_fee_cents: r.application_fee_cents || 0,
            reviewer_amount_cents: r.reviewer_amount_cents,
            payment_distributed: r.payment_distributed || false,
            payment_distributed_at: r.payment_distributed_at,
            payment_distribution_error: r.payment_distribution_error,
            payment_status: r.payment_status,
            created_at: r.created_at ?? r.createdAt,
            completed_at: r.completed_at ?? null,
            requester_name: r.requester_name ?? null,
            requester_username: r.requester_username ?? null,
            is_reviewer_view: true,
          }))
          .sort((a, b) => {
            const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
            const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
            return bTime - aTime;
          });

        setTransactions(transactionItems);
        console.log('[transactions] load finished', { reason, count: transactionItems.length, view: 'reviewer' });
      } else {
        // Reviewee view: show transactions where they ordered reviews
        const requests = await getRequestsByUser(profileData.id);

        // Fetch reviewer information for each request
        const reviewerIds = Array.from(
          new Set(
            requests
              .map((r) => r.influencerId)
              .filter((id): id is string => typeof id === 'string' && id.length > 0)
          )
        );

        const reviewerMap = new Map<string, { name: string | null; username: string | null }>();
        if (reviewerIds.length > 0) {
          const reviewers = await Promise.all(
            reviewerIds.map((id) => getReviewerById(id))
          );
          reviewers.forEach((reviewer) => {
            if (reviewer) {
              reviewerMap.set(reviewer.id, {
                name: reviewer.displayName,
                username: reviewer.username ?? null,
              });
            }
          });
        }

        const transactionItems: TransactionItem[] = requests
          .filter(r => r.amount_cents)
          .map(r => {
            const reviewer = r.influencerId ? reviewerMap.get(r.influencerId) : undefined;
            return {
              id: r.id,
              status: r.status,
              amount_cents: r.amount_cents || 0,
              application_fee_cents: r.application_fee_cents || 0,
              payment_distributed: r.payment_distributed || false,
              payment_distributed_at: r.payment_distributed_at,
              payment_distribution_error: r.payment_distribution_error,
              payment_status: r.payment_status,
              created_at: r.created_at ?? r.createdAt,
              completed_at: r.completed_at ?? null,
              reviewer_name: reviewer?.name ?? null,
              reviewer_username: reviewer?.username ?? null,
              is_reviewer_view: false,
            };
          })
          .sort((a, b) => {
            const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
            const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
            return bTime - aTime;
          });

        setTransactions(transactionItems);
        console.log('[transactions] load finished', { reason, count: transactionItems.length, view: 'reviewee' });
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      loadInFlightRef.current = false;
    }
  },
  []
  );

  useEffect(() => {
    loadTransactions('initial');
  }, [loadTransactions]);

  useFocusEffect(
    useCallback(() => {
    if (skipNextFocusRefresh.current) {
      skipNextFocusRefresh.current = false;
      console.log('[transactions] focus refresh skipped on first focus');
      return () => {};
    }
    loadTransactions('focus');
    return () => {};
    }, [loadTransactions])
  );

  const getPaymentStatus = (transaction: TransactionItem) => {
    if (transaction.status !== 'completed') {
      return {
        status: 'pending',
        message: 'Review not completed yet',
        color: Colors.brand.textSecondary,
        icon: '⏳'
      };
    }

    // Use payment_status if available, otherwise fall back to old logic
    if (transaction.payment_status) {
      switch (transaction.payment_status) {
        case 'paid':
          return {
            status: 'paid',
            message: 'Payment sent to your account',
            color: '#10b981',
            icon: '✅'
          };
        case 'failed':
          return {
            status: 'failed',
            message: 'Payment failed - will retry automatically',
            color: '#ef4444',
            icon: '❌'
          };
        case 'queued':
          return {
            status: 'queued',
            message: 'Awaiting settlement (5-7 business days)',
            color: '#f59e0b',
            icon: '⏳'
          };
        default:
          return {
            status: 'processing',
            message: 'Processing payment...',
            color: '#3b82f6',
            icon: '🔄'
          };
      }
    }

    // Fallback to old logic
    if (transaction.payment_distributed) {
      return {
        status: 'paid',
        message: 'Payment sent to your account',
        color: '#10b981',
        icon: '✅'
      };
    }

    // Check if payment is held due to Stripe not being set up
    if (transaction.payment_distribution_error) {
      const errorLower = transaction.payment_distribution_error.toLowerCase();
      if (errorLower.includes('payment held') || 
          errorLower.includes('stripe connect account') || 
          errorLower.includes('not set up')) {
        return {
          status: 'held',
          message: 'Payout attempted but Stripe not set up',
          color: '#f59e0b',
          icon: '⚠️'
        };
      }
      // Other payment errors
      return {
        status: 'failed',
        message: 'Payment failed - will retry automatically',
        color: '#ef4444',
        icon: '❌'
      };
    }

    return {
      status: 'queued',
      message: 'Awaiting settlement (5-7 business days)',
      color: '#f59e0b',
      icon: '⏳'
    };
  };

  const getAmountDisplay = (transaction: TransactionItem) => {
    // Use reviewer_amount_cents if available (set by payment distribution)
    if (transaction.reviewer_amount_cents) {
      return (transaction.reviewer_amount_cents / 100).toFixed(2);
    }
    // SIMPLE MODEL: Calculate reviewer amount as totalAmount - auroFee (Auro absorbs Stripe fee)
    const amount = transaction.amount_cents;
    const auroFee = transaction.application_fee_cents || 0;
    const reviewerAmount = amount - auroFee;
    return (reviewerAmount / 100).toFixed(2);
  };

  const getRevieweePaymentStatus = (transaction: TransactionItem) => {
    switch (transaction.status) {
      case 'pending':
        return {
          status: 'pending',
          message: 'Review request pending',
          color: Colors.brand.textSecondary,
          icon: '⏳'
        };
      case 'accepted':
        return {
          status: 'accepted',
          message: 'Review accepted, awaiting payment',
          color: '#3b82f6',
          icon: '✅'
        };
      case 'paid':
        return {
          status: 'paid',
          message: 'Payment received, review in progress',
          color: '#10b981',
          icon: '💳'
        };
      case 'in_progress':
        return {
          status: 'in_progress',
          message: 'Review in progress',
          color: '#f59e0b',
          icon: '🔄'
        };
      case 'completed':
        return {
          status: 'completed',
          message: 'Review completed',
          color: '#10b981',
          icon: '✅'
        };
      case 'rejected':
        return {
          status: 'rejected',
          message: 'Review request rejected',
          color: '#ef4444',
          icon: '❌'
        };
      default:
        return {
          status: 'unknown',
          message: 'Unknown status',
          color: Colors.brand.textSecondary,
          icon: '❓'
        };
    }
  };

  const renderTransaction = ({ item }: { item: TransactionItem }) => {
    const isReviewer = item.is_reviewer_view ?? true;
    const paymentStatus = isReviewer ? getPaymentStatus(item) : getRevieweePaymentStatus(item);
    const amount = isReviewer ? getAmountDisplay(item) : (item.amount_cents / 100).toFixed(2);
    const createdTimestamp = item.created_at ?? null;
    const completedTimestamp = item.completed_at ?? null;
    const createdDate = createdTimestamp ? new Date(createdTimestamp).toLocaleDateString() : 'Unknown date';
    const completedDate = completedTimestamp ? new Date(completedTimestamp).toLocaleDateString() : null;
    
    const displayName = isReviewer
      ? (item.requester_name ?? item.requester_username ?? 'Unknown User')
      : (item.reviewer_name ?? item.reviewer_username ?? 'Unknown Reviewer');

    return (
      <View style={styles.transactionCard}>
        <View style={styles.transactionHeader}>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionTitle}>
              {displayName}
            </Text>
            <Text style={styles.transactionDate}>
              Created: {createdDate}
              {completedDate && ` • Completed: ${completedDate}`}
            </Text>
          </View>
          <View style={styles.transactionAmount}>
            <Text style={styles.amountText}>${amount}</Text>
          </View>
        </View>

        <View style={styles.paymentStatusContainer}>
          <Text style={[styles.paymentStatusText, { color: paymentStatus.color }]}>
            {paymentStatus.icon} {paymentStatus.message}
          </Text>
        </View>

        {item.payment_distribution_error && isReviewer && (
          <View style={[
            styles.errorContainer,
            item.payment_distribution_error.toLowerCase().includes('payment held') || 
            item.payment_distribution_error.toLowerCase().includes('stripe connect account') ||
            item.payment_distribution_error.toLowerCase().includes('not set up')
              ? styles.heldContainer 
              : null
          ]}>
            <Text style={[
              styles.errorText,
              item.payment_distribution_error.toLowerCase().includes('payment held') || 
              item.payment_distribution_error.toLowerCase().includes('stripe connect account') ||
              item.payment_distribution_error.toLowerCase().includes('not set up')
                ? styles.heldText 
                : null
            ]}>
              {item.payment_distribution_error.toLowerCase().includes('payment held') || 
               item.payment_distribution_error.toLowerCase().includes('stripe connect account') ||
               item.payment_distribution_error.toLowerCase().includes('not set up')
                ? '⚠️ Payment is being held until you set up Stripe Connect. Complete your Stripe setup to receive this payment automatically.'
                : `Error: ${item.payment_distribution_error}`
              }
            </Text>
          </View>
        )}

        {isReviewer ? (
          <View style={styles.transactionDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Customer pays:</Text>
              <Text style={styles.detailValue}>${(item.amount_cents / 100).toFixed(2)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Auro fee (20%):</Text>
              <Text style={styles.detailValue}>
                -${((item.application_fee_cents || Math.round(item.amount_cents * 0.2)) / 100).toFixed(2)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Your Earnings:</Text>
              <Text style={[styles.detailValue, styles.earningsValue]}>${amount}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { fontSize: 12, fontStyle: 'italic', color: Colors.brand.textSecondary }]}>
                * Processing fees are covered by Auro
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.transactionDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount paid:</Text>
              <Text style={[styles.detailValue, styles.earningsValue]}>${(item.amount_cents / 100).toFixed(2)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { fontSize: 12, fontStyle: 'italic', color: Colors.brand.textSecondary }]}>
                {item.status === 'completed' ? 'Review completed successfully' : 'Review status: ' + item.status}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return renderSkeleton();
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: 12 }]}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.brand.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction History</Text>
      </View>

      <View style={styles.content}>
        {profile?.is_reviewer ? (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Payment Processing Info</Text>
            <Text style={styles.summaryText}>
              💳 Completed reviews are processed within 5-7 business days after completion.
              This is due to payment settlement timing from Stripe.
            </Text>
          </View>
        ) : (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Your Review Orders</Text>
            <Text style={styles.summaryText}>
              📋 View all the reviews you've ordered, their status, and payment information.
            </Text>
          </View>
        )}

        {/* See Payouts Button */}
        {profile?.is_reviewer && (
          <View style={styles.payoutsButtonContainer}>
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
              style={styles.payoutsButton}
            >
              <ExpoLinearGradient
                colors={['rgba(255, 107, 53, 0.8)', 'rgba(255, 53, 71, 0.8)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.payoutsButtonGradient}
              >
                <Text style={styles.payoutsButtonText}>
                  {stripePortalUrl ? '💰 See Payouts' : '⚡ Setup Stripe'}
                </Text>
              </ExpoLinearGradient>
            </TouchableOpacity>
          </View>
        )}

        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                loadTransactions('pull');
              }}
              tintColor={Colors.brand.textPrimary}
            />
          }
          contentContainerStyle={[styles.listContainer, { paddingBottom: 20 + insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
        />
      </View>
      {refreshing ? renderSkeleton(true) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.brand.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: Colors.brand.background,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.brand.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionSkeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  refreshOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.brand.background,
    zIndex: 5,
    paddingTop: 0,
  },
  loadingText: {
    color: Colors.brand.textSecondary,
    fontSize: 16,
  },
  summaryCard: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    lineHeight: 20,
  },
  payoutsButtonContainer: {
    marginBottom: 16,
  },
  payoutsButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  payoutsButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payoutsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  listContainer: {
    paddingBottom: 20,
  },
  transactionCard: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.brand.border,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  transactionInfo: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.brand.textPrimary,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: Colors.brand.textSecondary,
  },
  transactionAmount: {
    backgroundColor: 'transparent',
  },
  amountText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
  },
  paymentStatusContainer: {
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  paymentStatusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  heldContainer: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
  },
  heldText: {
    fontSize: 12,
    color: '#f59e0b',
    lineHeight: 16,
  },
  transactionDetails: {
    backgroundColor: 'transparent',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    color: Colors.brand.textPrimary,
    fontWeight: '500',
  },
  earningsValue: {
    color: '#10b981',
    fontWeight: '700',
  },
});
