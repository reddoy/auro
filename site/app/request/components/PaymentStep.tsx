'use client';

import React, { useState, useEffect } from 'react';
import type { RequestData } from '../page';
import AsyncAvatar from './AsyncAvatar';

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
  const [price, setPrice] = useState(10); // Default price

  useEffect(() => {
    const fetchCreatorInfo = async () => {
      if (!requestData.creatorId && !requestData.creatorSlug) return;

      try {
        let query = supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, hourly_rate')
          .eq('is_reviewer', true);

        if (requestData.creatorId) {
          query = query.eq('id', requestData.creatorId);
        } else if (requestData.creatorSlug) {
          query = query.eq('username', requestData.creatorSlug);
        }

        const { data, error } = await query.maybeSingle();

        if (error) throw error;

        if (data) {
          setCreatorInfo(data);
          setPrice(data.hourly_rate || 10);
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

  // Avatar URLs are resolved by AsyncAvatar

  return (
    <div className="payment-step">
      <div className="step-header">
        <h2>Complete Payment</h2>
        <p>Secure payment processing powered by Stripe</p>
      </div>

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

          <div className="review-includes">
            <h4>Your review includes:</h4>
            <ul>
              <li>✅ Detailed attractiveness rating (1-10)</li>
              <li>✅ Wardrobe and style feedback</li>
              <li>✅ Dating profile optimization</li>
              <li>✅ Personalized improvement suggestions</li>
              <li>✅ Honest, constructive feedback</li>
              <li>✅ Delivered within 48 hours</li>
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
                <strong>Fast Delivery</strong>
                <p>Reviews completed within 48 hours</p>
              </div>
            </div>
            
            <div className="security-badge">
              <span className="security-icon">💝</span>
              <div>
                <strong>Satisfaction Guaranteed</strong>
                <p>Quality feedback or money back</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

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
            ) : (
              `Pay $${price} with Stripe`
            )}
          </button>

          <div className="payment-note">
            <p>
              🔐 Your payment is processed securely by Stripe. We never store your payment information.
            </p>
            <p>
              📱 After payment, you'll get access to download our mobile app to track your review progress.
            </p>
          </div>
        </div>
      </div>

      <div className="step-actions">
        <button type="button" onClick={onBack} className="btn-secondary">
          Back
        </button>
      </div>
    </div>
  );
}
