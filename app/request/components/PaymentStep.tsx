import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';

import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import type { RequestData } from '../index';
import { purchaseReviewRequest, initIAP, endConnection } from '@/lib/inAppPurchases';
import { getTierInfo, getProductIdForRate, findNearestTier } from '@/lib/iapPriceTiers';
import PriceTierPicker from '@/components/PriceTierPicker';
import Avatar from '@/components/Avatar';

type Props = {
  requestData: RequestData;
  onSuccess: (requestId: string) => void;
  onBack: () => void;
  supabase: any;
};

export default function PaymentStep({ requestData, onSuccess, onBack, supabase }: Props) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [creatorInfo, setCreatorInfo] = useState<any>(null);
  const [price, setPrice] = useState(75);
  const [paymentMethod, setPaymentMethod] = useState<'web' | 'inapp'>('web');
  const [showPriceExplanation, setShowPriceExplanation] = useState(false);
  const [iapInitialized, setIapInitialized] = useState(false);

  useEffect(() => {
    // Initialize IAP on mount
    const init = async () => {
      if (Platform.OS === 'ios') {
        const initialized = await initIAP();
        setIapInitialized(initialized);
      }
    };
    init();

    return () => {
      if (Platform.OS === 'ios') {
        endConnection();
      }
    };
  }, []);

  useEffect(() => {
    const fetchCreatorInfo = async () => {
      if (!requestData.creatorId && !requestData.creatorSlug) return;

      try {
        let query = supabase
          .from('profiles')
          .select('id, first_name, last_name, username, avatar_url, hourly_rate')
          .eq('is_reviewer', 'approved');

        if (requestData.creatorId) {
          query = query.eq('id', requestData.creatorId);
        } else if (requestData.creatorSlug) {
          query = query.eq('username', requestData.creatorSlug);
        }

        const { data, error } = await query.maybeSingle();

        if (error) throw error;

        if (data) {
          const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ') || null;
          setCreatorInfo({ ...data, full_name: fullName });
          setPrice(data.hourly_rate || 75);
        }
      } catch (error) {
        console.error('Error fetching creator info:', error);
      }
    };

    fetchCreatorInfo();
  }, [requestData.creatorId, requestData.creatorSlug]);

  const handleWebPayment = async () => {
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || '';

      // Create checkout session
      const siteUrl = process.env.EXPO_PUBLIC_SITE_URL || 'https://www.appauro.com';
      const response = await fetch(`${siteUrl}/api/checkout/create-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creatorId: requestData.creatorId,
          creatorSlug: requestData.creatorSlug,
          requestId: undefined,
          uploadSessionId: requestData.uploadSessionId,
          fallbackEmail: user?.email || '',
          fallbackFullName: user?.user_metadata?.full_name || '',
          fallbackUserId: userId,
          reviewPayload: {
            message: requestData.message,
            photos: requestData.photos,
            consent: requestData.consent,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      
      if (url) {
        // Open Stripe checkout in browser
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
          // Note: User will complete payment in browser, then return to app
          // The web flow will handle the success redirect
        } else {
          throw new Error('Cannot open checkout URL');
        }
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      setError(error.message || 'Payment failed. Please try again.');
      setLoading(false);
    }
  };

  const handleIAPPayment = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Not Available', 'In-app purchases are only available on iOS.');
      return;
    }

    if (!iapInitialized) {
      Alert.alert('Not Ready', 'In-app purchases are not ready. Please try again.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get the tier for the reviewer's rate
      const tier = findNearestTier(price);
      const productId = getProductIdForRate(price);

      // Get user info for the API
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || '';

      const result = await purchaseReviewRequest({
        productId,
        reviewerRate: tier, // Use tier price, not original price
        creatorId: requestData.creatorId || '',
        creatorSlug: requestData.creatorSlug,
        uploadSessionId: requestData.uploadSessionId,
        reviewPayload: {
          message: requestData.message,
          photos: [
            ...requestData.photos.outfits,
            ...requestData.photos.roomTourPhotos,
            ...requestData.photos.datingProfileScreenshots,
          ],
          consent: requestData.consent.shareOnSocial || false,
        },
      });

      if (result.success && result.requestId) {
        onSuccess(result.requestId);
      } else {
        throw new Error(result.error || 'Purchase failed');
      }
    } catch (error: any) {
      console.error('IAP error:', error);
      setError(error.message || 'Purchase failed. Please try again.');
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (paymentMethod === 'web') {
      await handleWebPayment();
    } else {
      await handleIAPPayment();
    }
  };

  const tierInfo = getTierInfo(price);
  const iapPrice = tierInfo.iapPrice;
  const tierWebPrice = tierInfo.webPrice;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Complete Payment</Text>
        <Text style={styles.subtitle}>Secure payment processing</Text>
      </View>

      {/* Order Summary */}
      {creatorInfo && (
        <View style={styles.summaryCard}>
          <View style={styles.reviewerInfo}>
            <Avatar
              uri={creatorInfo.avatar_url}
              name={creatorInfo.full_name || creatorInfo.username}
              size={48}
            />
            <View style={styles.reviewerDetails}>
              <Text style={styles.reviewerName}>
                {creatorInfo.full_name || creatorInfo.username}
              </Text>
              <Text style={styles.reviewerLabel}>Your selected reviewer</Text>
            </View>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Personal Review</Text>
            <Text style={styles.priceValue}>${tierWebPrice}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${tierWebPrice}</Text>
          </View>
        </View>
      )}

      {/* Payment Options */}
      <View style={styles.paymentOptionsCard}>
        <View style={styles.paymentOptionsHeader}>
          <Text style={styles.paymentOptionsTitle}>Choose Payment Method</Text>
          <TouchableOpacity onPress={() => setShowPriceExplanation(true)}>
            <Text style={styles.explanationLink}>Why different prices?</Text>
          </TouchableOpacity>
        </View>

        {/* Web Payment Option */}
        <TouchableOpacity
          style={[
            styles.paymentOption,
            paymentMethod === 'web' && styles.paymentOptionSelected,
          ]}
          onPress={() => setPaymentMethod('web')}
        >
          <View style={styles.paymentOptionContent}>
            <View>
              <Text style={styles.paymentOptionTitle}>Continue on the Web</Text>
              <Text style={styles.paymentOptionSubtitle}>Lower price</Text>
            </View>
            <Text style={styles.paymentOptionPrice}>${tierWebPrice}</Text>
          </View>
          <Text style={styles.paymentOptionDescription}>
            Complete your purchase on our website
          </Text>
        </TouchableOpacity>

        {/* In-App Purchase Option */}
        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'inapp' && styles.paymentOptionSelected,
            ]}
            onPress={() => setPaymentMethod('inapp')}
          >
            <View style={styles.paymentOptionContent}>
              <View>
                <Text style={styles.paymentOptionTitle}>Continue in App</Text>
                <Text style={styles.paymentOptionSubtitle}>Higher price</Text>
              </View>
              <Text style={styles.paymentOptionPrice}>${iapPrice}</Text>
            </View>
            <Text style={styles.paymentOptionDescription}>
              Purchase directly in the app
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Payment Button */}
      <TouchableOpacity
        style={[styles.payButton, loading && styles.payButtonDisabled]}
        onPress={handlePayment}
        disabled={loading}
      >
        <ExpoLinearGradient
          colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
          style={styles.payButtonGradient}
        >
          {loading ? (
            <ActivityIndicator color={Colors.brand.textOnGradient} />
          ) : (
            <Text style={styles.payButtonText}>
              {paymentMethod === 'web'
                ? `Continue on Web - $${tierWebPrice}`
                : `Continue in App - $${iapPrice}`}
            </Text>
          )}
        </ExpoLinearGradient>
      </TouchableOpacity>

      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>

      {/* Price Explanation Modal */}
      {showPriceExplanation && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Why are these prices different?</Text>
              <TouchableOpacity onPress={() => setShowPriceExplanation(false)}>
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalBody}>
              The fee for in-app purchases does not apply to purchases made directly through Auro. 
              This is why the price is lower when you continue on the web.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowPriceExplanation(false)}
            >
              <Text style={styles.modalButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.brand.background,
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
  },
  summaryCard: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.brand.border,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  reviewerDetails: {
    marginLeft: 12,
    flex: 1,
  },
  reviewerName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.brand.textPrimary,
    marginBottom: 4,
  },
  reviewerLabel: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.brand.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.brand.border,
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.brand.accentOrange,
  },
  paymentOptionsCard: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.brand.border,
  },
  paymentOptionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentOptionsTitle: {
    fontSize: 18,
    fontWeight: '600',
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
  payButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.brand.textOnGradient,
  },
  errorCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
  backButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    backgroundColor: Colors.brand.accentOrange,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.brand.textOnGradient,
  },
});
