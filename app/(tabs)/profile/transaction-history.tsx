import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, FlatList, RefreshControl, Platform, Alert, Linking, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';

import { Text, View } from '@/components/Themed';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import { getRequestsByReviewer } from '@/lib/api';
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
}

export default function TransactionBreakdownScreen() {
  const insets = useSafeAreaInsets();
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stripePortalUrl, setStripePortalUrl] = useState<string | null>(null);

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

  const loadTransactions = useCallback(async () => {
    try {
      const p = await supabase.auth.getUser();
      if (!p.data.user) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', p.data.user.id)
        .single();

      setProfile(profileData);

      // Load Stripe portal URL if user is a reviewer
      if (profileData?.is_reviewer && profileData.stripe_connect_account_id) {
        try {
          const url = await createStripeExpressLoginLink(profileData.id);
          setStripePortalUrl(url);
        } catch (e) {
          console.log('[stripe-portal] error', e);
          setStripePortalUrl(null);
        }
      }

      if (profileData?.is_reviewer) {
        const requests = await getRequestsByReviewer(profileData.id);
        
        // Transform requests into transaction items
        const transactionItems: TransactionItem[] = requests
          .filter(r => r.amount_cents) // Only include requests with amounts
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
          }))
          .sort((a, b) => {
            const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
            const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
            return bTime - aTime;
          });

        setTransactions(transactionItems);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
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

    if (transaction.payment_distribution_error) {
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

  const renderTransaction = ({ item }: { item: TransactionItem }) => {
    const paymentStatus = getPaymentStatus(item);
    const amount = getAmountDisplay(item);
    const createdTimestamp = item.created_at ?? null;
    const completedTimestamp = item.completed_at ?? null;
    const createdDate = createdTimestamp ? new Date(createdTimestamp).toLocaleDateString() : 'Unknown date';
    const completedDate = completedTimestamp ? new Date(completedTimestamp).toLocaleDateString() : null;
    const requesterDisplayName =
      item.requester_name ??
      item.requester_username ??
      'Unknown User';

    return (
      <View style={styles.transactionCard}>
        <View style={styles.transactionHeader}>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionTitle}>
              {requesterDisplayName}
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

        {item.payment_distribution_error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              Error: {item.payment_distribution_error}
            </Text>
          </View>
        )}

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
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Payment Processing Info</Text>
          <Text style={styles.summaryText}>
            💳 Completed reviews are processed within 5-7 business days after completion.
            This is due to payment settlement timing from Stripe.
          </Text>
        </View>

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
                setRefreshing(true);
                loadTransactions();
              }}
              tintColor={Colors.brand.textPrimary}
            />
          }
          contentContainerStyle={styles.listContainer}
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
  errorText: {
    fontSize: 12,
    color: '#ef4444',
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
