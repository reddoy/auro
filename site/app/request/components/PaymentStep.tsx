'use client';

import React, { useState, useEffect } from 'react';
import type { RequestData } from '../page';

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

  const createRequestInDB = async (): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Combine all photos into a single array for the photos field
    const allPhotos = [
      ...requestData.photos.outfits,
      ...requestData.photos.roomTourPhotos,
      ...requestData.photos.datingProfileScreenshots
    ];

    // Create the notes object similar to the app structure
    const notes = {
      message: requestData.message,
      media: requestData.photos,
      consent: requestData.consent
    };

    const { data, error } = await supabase
      .from('requests')
      .insert([
        {
          user_id: user.id,
          influencer_id: requestData.creatorId || creatorInfo?.id,
          photos: allPhotos,
          notes: JSON.stringify(notes),
          status: 'pending'
        }
      ])
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  };

  const handlePayment = async () => {
    setLoading(true);
    setError('');

    try {
      // Create the request in the database first
      const requestId = await createRequestInDB();

      // Create Stripe checkout session
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creatorId: requestData.creatorId,
          creatorSlug: requestData.creatorSlug,
          requestId: requestId,
          uploadSessionId: requestData.uploadSessionId,
          reviewPayload: {
            message: requestData.message,
            photos: requestData.photos,
            consent: requestData.consent
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      
      if (url) {
        // Redirect to Stripe Checkout
        window.location.href = url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      setError(error.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getCreatorImageUrl = (avatarUrl?: string) => {
    if (!avatarUrl) return '/auro_aura_logo.png';
    if (avatarUrl.startsWith('http')) return avatarUrl;
    const supabaseUrl = supabase?.supabaseUrl || (typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL : '') || '';
    return `${supabaseUrl}/storage/v1/object/public/avatars/${avatarUrl}`;
  };

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
                <img
                  src={getCreatorImageUrl(creatorInfo.avatar_url)}
                  alt={`${creatorInfo.full_name || creatorInfo.username}'s avatar`}
                  onError={(e) => {
                    e.currentTarget.src = '/auro_aura_logo.png';
                  }}
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
              <li>✅ Room setup recommendations</li>
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
