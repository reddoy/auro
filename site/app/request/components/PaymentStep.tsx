'use client';

import React, { useState, useEffect } from 'react';
import type { RequestData } from '../page';
import AsyncAvatar from './AsyncAvatar';
// Note: This import will need to be adjusted based on your project structure
// If the lib folder is shared, you may need to create a shared utilities file
// For now, we'll calculate tiers inline

type Props = {
  requestData: RequestData;
  onSuccess: (requestId: string) => void;
  onBack: () => void;
  supabase: any;
};

// Price tier system - rounds to nearest tier for IAP products
// Tiers range from $5 to $10,000
function findNearestTier(rate: number): number {
  const tiers = [
    // $5-$50: $5 increments
    5, 10, 15, 20, 25, 30, 35, 40, 45, 50,
    // $50-$100: $5 increments
    55, 60, 65, 70, 75, 80, 85, 90, 95, 100,
    // $100-$200: $10 increments
    110, 120, 130, 140, 150, 160, 170, 180, 190, 200,
    // $200-$500: $25 increments
    225, 250, 275, 300, 325, 350, 375, 400, 425, 450, 475, 500,
    // $500-$1000: $50 increments
    550, 600, 650, 700, 750, 800, 850, 900, 950, 1000,
    // $1000-$2000: $100 increments
    1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000,
    // $2000-$5000: $250 increments
    2250, 2500, 2750, 3000, 3250, 3500, 3750, 4000, 4250, 4500, 4750, 5000,
    // $5000-$10000: $500 increments
    5500, 6000, 6500, 7000, 7500, 8000, 8500, 9000, 9500, 10000,
  ];
  if (rate <= tiers[0]) return tiers[0];
  if (rate >= tiers[tiers.length - 1]) return tiers[tiers.length - 1];
  
  let nearestTier = tiers[0];
  let minDiff = Math.abs(rate - nearestTier);
  
  for (const tier of tiers) {
    const diff = Math.abs(rate - tier);
    if (diff < minDiff) {
      minDiff = diff;
      nearestTier = tier;
    }
  }
  
  return nearestTier;
}

// Calculate in-app purchase price to account for Apple's 30% cut while preserving 20% margin
// Formula: IAP_price = web_price * 1.43 (rounded up)
function calculateIAPPrice(webPrice: number): number {
  return Math.ceil(webPrice * 1.43);
}

export default function PaymentStep({ requestData, onSuccess, onBack, supabase }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [creatorInfo, setCreatorInfo] = useState<any>(null);
  const [price, setPrice] = useState(75); // Default price
  const [showPriceExplanation, setShowPriceExplanation] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'web' | 'inapp'>('web');

  useEffect(() => {
    const fetchCreatorInfo = async () => {
      if (!requestData.creatorId && !requestData.creatorSlug) return;

      try {
        let query = supabase
          .from('profiles')
          .select('id, first_name, last_name, username, avatar_url, hourly_rate')
          .eq('is_reviewer', 'approved'); // Only show approved reviewers

        if (requestData.creatorId) {
          query = query.eq('id', requestData.creatorId);
        } else if (requestData.creatorSlug) {
          query = query.eq('username', requestData.creatorSlug);
        }

        const { data, error } = await query.maybeSingle();

        if (error) throw error;

        if (data) {
          // Construct full_name from first_name and last_name for backward compatibility
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

  const getFallbackUserId = async (): Promise<string> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) return (user as any).id as string;
    } catch {}
    try {
      if (typeof window !== 'undefined') {
        return localStorage.getItem('auro_signup_user_id') || '';
      }
    } catch {}
    return '';
  };

  const getFallbackEmail = async (): Promise<string> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if ((user as any)?.email) return (user as any).email as string;
    } catch {}
    try {
      if (typeof window !== 'undefined') {
        return localStorage.getItem('auro_signup_email') || '';
      }
    } catch {}
    return '';
  };

  const getFallbackFullName = async (): Promise<string> => {
    try {
      if (typeof window !== 'undefined') {
        return localStorage.getItem('auro_signup_full_name') || '';
      }
    } catch {}
    return '';
  };

  const handlePayment = async () => {
    setLoading(true);
    setError('');

    try {
      if (paymentMethod === 'inapp') {
        // For in-app purchases, redirect to mobile app or show instructions
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
          // Try to open the app with deep link
          const appUrl = `auro://request?creatorId=${requestData.creatorId || ''}&creatorSlug=${requestData.creatorSlug || ''}`;
          window.location.href = appUrl;
          // Fallback message after a delay
          setTimeout(() => {
            setError('Please open this page in the Auro mobile app to complete your in-app purchase.');
          }, 1000);
          return;
        } else {
          throw new Error('In-app purchases are only available in the Auro mobile app. Please download the app or use the web checkout option.');
        }
      }

      console.log('🚀 Starting payment process...');
      
      const fallbackUserId = await getFallbackUserId();
      const fallbackEmail = await getFallbackEmail();
      const fallbackFullName = await getFallbackFullName();
      
      console.log('📋 Payment data:', {
        creatorId: requestData.creatorId,
        creatorSlug: requestData.creatorSlug,
        fallbackUserId,
        fallbackEmail,
        fallbackFullName,
        uploadSessionId: requestData.uploadSessionId,
        price: price
      });

      // Allow payment to proceed even without authenticated user - they can authenticate during payment flow
      // if (!fallbackUserId) {
      //   throw new Error('Please sign up or sign in before paying.');
      // }

      console.log('💳 Creating Stripe checkout session...');
      
      // Create Stripe checkout session
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creatorId: requestData.creatorId,
          creatorSlug: requestData.creatorSlug,
          requestId: undefined,
          uploadSessionId: requestData.uploadSessionId,
          fallbackEmail,
          fallbackFullName,
          fallbackUserId,
          reviewPayload: {
            message: requestData.message,
            photos: requestData.photos,
            consent: requestData.consent
          }
        }),
      });

      console.log('📡 Checkout session response status:', response.status);
      console.log('📡 Checkout session response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Checkout session error:', errorData);
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const responseData = await response.json();
      console.log('✅ Checkout session created successfully:', responseData);
      
      const { url } = responseData;
      
      if (url) {
        console.log('🔗 Redirecting to Stripe Checkout:', url);
        // Redirect to Stripe Checkout
        window.location.href = url;
      } else {
        console.error('❌ No checkout URL received');
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('❌ Payment error:', error);
      setError(error.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get tier info for the reviewer's rate
  const tierWebPrice = findNearestTier(price); // The actual price used (may differ from reviewer's rate)
  const iapPrice = calculateIAPPrice(tierWebPrice);

  // Avatar URLs are resolved by AsyncAvatar

  return (
    <div className="payment-step">
      <div className="step-header">
        <h2>Complete Payment</h2>
        <p>Secure payment processing powered by Stripe</p>
      </div>

      <div className="payment-main-card">
        <div className="payment-container">
          {/* Order Summary */}
          <div className="order-summary">
            <h3>Order Summary</h3>
            
            {creatorInfo && (
              <div className="reviewer-summary">
                <div className="reviewer-avatar">
                  <AsyncAvatar
                    avatarPathOrUrl={creatorInfo.avatar_url}
                    alt={`${creatorInfo.full_name || creatorInfo.username}`}
                    size={48}
                  />
                </div>
                <div className="reviewer-info">
                  <h4>{creatorInfo.full_name || creatorInfo.username}</h4>
                  <p>Your selected reviewer</p>
                </div>
              </div>
            )}

            <div className="order-details">
              <div className="order-item">
                <span>Personal Review</span>
                <span>${price}</span>
              </div>
              
              <div className="order-item">
                <span>Processing Fee</span>
                <span>$0</span>
              </div>
              
              <div className="order-divider"></div>
              
              <div className="order-total">
                <span>Total</span>
                <span>${price}</span>
              </div>
            </div>

            {/* Dual Pricing Options */}
            <div className="payment-options">
              <div className="payment-option-header">
                <h4>Choose Payment Method</h4>
                <button
                  type="button"
                  className="price-explanation-link"
                  onClick={() => setShowPriceExplanation(true)}
                >
                  Why are these prices different?
                </button>
              </div>

              <div className="payment-option-cards">
                {/* Web Payment Option */}
                <div
                  className={`payment-option-card ${paymentMethod === 'web' ? 'selected' : ''}`}
                  onClick={() => setPaymentMethod('web')}
                >
                  <div className="payment-option-header-card">
                    <div>
                      <h5>Continue on the Web</h5>
                      <p className="payment-option-subtitle">Lower price</p>
                    </div>
                    <div className="payment-option-price">
                      <span className="price-amount">${tierWebPrice}</span>
                      {tierWebPrice !== price && (
                        <span className="price-note" style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', display: 'block', marginTop: '4px' }}>
                          (rounded from ${price})
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="payment-option-description">
                    Complete your purchase on our website
                  </p>
                </div>

                {/* In-App Purchase Option */}
                <div
                  className={`payment-option-card ${paymentMethod === 'inapp' ? 'selected' : ''}`}
                  onClick={() => setPaymentMethod('inapp')}
                >
                  <div className="payment-option-header-card">
                    <div>
                      <h5>Continue in App</h5>
                      <p className="payment-option-subtitle">Higher price</p>
                    </div>
                    <div className="payment-option-price">
                      <span className="price-amount">${iapPrice}</span>
                    </div>
                  </div>
                  <p className="payment-option-description">
                    Purchase directly in the mobile app
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePayment}
              disabled={loading}
              className="btn-primary payment-button"
            >
              {loading ? (
                <span className="button-loading">
                  <span className="spinner"></span>
                  Processing...
                </span>
              ) : paymentMethod === 'web' ? (
                `Continue on the Web - $${price}`
              ) : (
                `Continue in App - $${iapPrice}`
              )}
            </button>

            <div className="review-includes">
              <h4>Your review includes:</h4>
              <ul>
                <li>✅ Detailed attractiveness rating (1-10)</li>
                <li>✅ Wardrobe and style feedback</li>
                <li>✅ Dating profile optimization</li>
                <li>✅ Personalized improvement suggestions</li>
                <li>✅ Honest, constructive feedback</li>
              </ul>
            </div>
          </div>

          {/* Payment Info */}
          <div className="payment-info">
            <div className="security-badges">
              <div className="security-badge">
                <span className="security-icon">🔒</span>
                <div>
                  <strong>Secure Payment</strong>
                  <p>SSL encrypted & PCI compliant</p>
                </div>
              </div>
              
              <div className="security-badge">
                <span className="security-icon">⚡</span>
                <div>
                  <strong>Guaranteed Timelines</strong>
                  <p>Reviewer has 2 weeks to accept, then 48 hours to complete</p>
                </div>
              </div>
              
              <div className="security-badge">
                <span className="security-icon">💝</span>
                <div>
                  <strong>Satisfaction Guaranteed</strong>
                  <p>Quality feedback</p>
                </div>
              </div>
            </div>

            <button type="button" onClick={onBack} className="btn-secondary payment-back-button">
              Back
            </button>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <div className="payment-note">
              <p>
                <span className="payment-note-icon">🏦</span>
                Your payment is processed securely by Stripe. We never store your payment information.
              </p>
              <p>
                <span className="payment-note-icon">📱</span>
                After payment, you'll get access to download our mobile app to track your review progress.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Price Explanation Modal */}
      {showPriceExplanation && (
        <div className="modal-overlay" onClick={() => setShowPriceExplanation(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Why are these prices different?</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowPriceExplanation(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>
                The fee for in-app purchases does not apply to purchases made directly through Auro. 
                This is why the price is lower when you continue on the web.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-primary"
                onClick={() => setShowPriceExplanation(false)}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
