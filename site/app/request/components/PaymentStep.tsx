'use client';

import React, { useState, useEffect } from 'react';
import type { RequestData } from '../page';
import AsyncAvatar from './AsyncAvatar';
import { findNearestCheckoutTierDollars } from '../../../lib/checkout-web-tier';

type Props = {
  requestData: RequestData;
  onSuccess: (requestId: string) => void;
  onBack: () => void;
  supabase: any;
};

export default function PaymentStep({ requestData, onSuccess, onBack, supabase }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [creatorInfo, setCreatorInfo] = useState<any>(null);
  const [price, setPrice] = useState(75); // Default price
  const [showPriceExplanation, setShowPriceExplanation] = useState(false);

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
            photos: requestData.photos,
          },
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
  const tierWebPrice = findNearestCheckoutTierDollars(price);
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
                <span>${tierWebPrice}</span>
              </div>
              {tierWebPrice !== price && (
                <p className="order-rate-note">
                  Nearest supported checkout amount to this reviewer&apos;s listed rate (${price}).
                </p>
              )}
              <div className="order-item">
                <span>Processing Fee</span>
                <span>$0</span>
              </div>

              <div className="order-divider"></div>

              <div className="order-total">
                <span>Total</span>
                <span>${tierWebPrice}</span>
              </div>
            </div>

            {/* Pricing Explanation */}
            <div className="payment-options">
              <div className="payment-option-header">
                <h4>Payment Method</h4>
                <button
                  type="button"
                  className="price-explanation-link"
                  onClick={() => setShowPriceExplanation(true)}
                >
                  How fees work
                </button>
              </div>

              <div className="payment-option-cards">
                <div
                  className="payment-option-card selected"
                >
                  <div className="payment-option-header-card">
                    <div>
                      <h5>Continue on the Web</h5>
                      <p className="payment-option-subtitle">Secure Stripe checkout</p>
                    </div>
                    <div className="payment-option-price">
                      <span className="price-amount">${tierWebPrice}</span>
                      {tierWebPrice !== price && (
                        <span className="price-note">Rounded from ${price}</span>
                      )}
                    </div>
                  </div>
                  <p className="payment-option-description">
                    Auro is fully web + mobile web
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
              ) : `Continue on the Web — $${tierWebPrice}`}
            </button>

            <div className="review-includes">
              <h4>Your review includes</h4>
              <ul>
                <li className="review-includes-item">
                  <span className="review-includes-check" aria-hidden="true">
                    ✓
                  </span>
                  <span className="review-includes-text">One personalized video review if your reviewer accepts</span>
                </li>
                <li className="review-includes-item">
                  <span className="review-includes-check" aria-hidden="true">
                    ✓
                  </span>
                  <span className="review-includes-text">Direct, honest feedback on your photos</span>
                </li>
                <li className="review-includes-item">
                  <span className="review-includes-check" aria-hidden="true">
                    ✓
                  </span>
                  <span className="review-includes-text">Clear suggestions you can apply right away</span>
                </li>
                <li className="review-includes-item">
                  <span className="review-includes-check" aria-hidden="true">
                    ✓
                  </span>
                  <span className="review-includes-text">Delivery tracked inside your Requests tab</span>
                </li>
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
                  <strong>Refund timelines</strong>
                  <p>Reviewer has 2 weeks to accept, then 48 hours to complete — or you get a full refund</p>
                </div>
              </div>
              
              <div className="security-badge">
                <span className="security-icon">↩️</span>
                <div>
                  <strong>Decline = full refund</strong>
                  <p>If your reviewer declines, you are refunded (typically 5–10 business days)</p>
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
              <p className="payment-note-row payment-note-highlight">
                <span className="payment-note-icon" aria-hidden="true">
                  ℹ️
                </span>
                <span className="payment-note-text">
                  Payment secures your request — it does not guarantee a review. Your reviewer can accept or
                  decline. If they decline, you receive a full refund.
                </span>
              </p>
              <p className="payment-note-row">
                <span className="payment-note-icon" aria-hidden="true">
                  🏦
                </span>
                <span className="payment-note-text">
                  Your payment is processed securely by Stripe. We never store your payment information.
                </span>
              </p>
              <p className="payment-note-row">
                <span className="payment-note-icon" aria-hidden="true">
                  📱
                </span>
                <span className="payment-note-text">
                  After payment, track your request in the Auro web app on desktop or mobile browser.
                </span>
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
              <h3>How fees work</h3>
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
                Auro runs on web and mobile web. Reviewers receive 80% of each completed payment; the rest is Auro’s platform fee. You’ll see the exact amounts before you pay.
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
