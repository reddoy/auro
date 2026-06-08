'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { trackPurchase } from '@/lib/analytics';

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [resendStatus, setResendStatus] = useState('');
  const [countdown, setCountdown] = useState(5);
  const [phone, setPhone] = useState('');
  const [smsOptIn, setSmsOptIn] = useState(true);
  const [smsSaveStatus, setSmsSaveStatus] = useState('');

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const csId = url.searchParams.get('rid');
      
      if (csId) {
        trackPurchase({ transactionId: csId });
        setMessage(
          'Payment confirmed. Your reviewer can accept or decline — you will be refunded if they decline.'
        );
        (async () => {
          const { data: { session } = { session: null } } = (await supabase?.auth.getSession()) || {};
          const token = session?.access_token;
          if (!token) return;
          await fetch('/api/checkout/confirm', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ sessionId: csId }),
          }).catch(() => {});
        })();
      } else {
        setMessage('Payment confirmed.');
      }
      
      const storedEmail = localStorage.getItem('auro_signup_email') || '';
      if (storedEmail) setEmail(storedEmail);
    } catch {}

    // Auto-redirect to app/requests after 5 seconds
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          router.replace('/app/requests?tab=active');
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  const handleSaveSmsPrefs = async () => {
    if (!phone.trim()) return;
    setSmsSaveStatus('Saving...');
    try {
      const { data: { session } = { session: null } } = (await supabase?.auth.getSession()) || {};
      const token = session?.access_token;
      if (!token) {
        setSmsSaveStatus('Sign in to save text preferences.');
        return;
      }
      const res = await fetch('/api/profile/notification-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          phone: phone.trim(),
          sms_notifications: smsOptIn,
          email_notifications: true,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to save');
      }
      setSmsSaveStatus('Text notifications enabled.');
    } catch (e: unknown) {
      setSmsSaveStatus(e instanceof Error ? e.message : 'Failed to save');
    }
  };

  const handleResendVerification = async () => {
    setResendStatus('Sending...');
    try {
      // Call a site API route that triggers Supabase to resend verification for the current email
      const resp = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!resp.ok) throw new Error('Failed to send');
      setResendStatus('Verification email sent.');
    } catch (e: any) {
      setResendStatus(e.message || 'Failed to send');
    }
  };

  return (
    <div className="success-page">
      <div className="success-container">
        {/* Success Header */}
        <div className="success-header">
          <div className="success-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" fill="#10B981" stroke="#10B981" strokeWidth="2"/>
              <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="success-title">Payment Successful!</h1>
          <p className="success-message">{message}</p>
        </div>

        {/* Continue on Web Section */}
        <div className="download-section">
          <div className="download-header">
            <h2>Continue on Auro Web</h2>
            <p>Track your review progress and notifications directly in the web app.</p>
          </div>
          
          <div className="download-buttons">
            <button
              onClick={() => router.push('/app/requests?tab=active')}
              className="download-btn web-btn"
            >
              <div className="btn-text">
                <span className="btn-label">OPEN</span>
                <span className="btn-name">View my request</span>
              </div>
            </button>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginTop: '12px' }}>
            Redirecting automatically in {countdown}s…
          </p>
        </div>

        {/* Escrow Protection Card */}
        <div className="protection-card">
          <div className="protection-header">
            <div className="protection-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1Z" fill="#10B981"/>
                <path d="M9 12L11 14L15 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>Your Payment is Protected</h3>
          </div>
          <p className="protection-description">
            <strong>Payment secures your request</strong> — it does not guarantee a review. Your reviewer
            can accept or decline. If they decline, you receive a full refund (typically 5–10 business days).
          </p>
          <div className="protection-features">
            <div className="feature-item">
              <div className="feature-dot"></div>
              <span>Payment held until your reviewer accepts and completes the review</span>
            </div>
            <div className="feature-item">
              <div className="feature-dot"></div>
              <span>Full refund if not accepted within 2 weeks, or not completed within 48 hours after accept</span>
            </div>
            <div className="feature-item">
              <div className="feature-dot"></div>
              <span>Reviewer is paid only after they submit your video review</span>
            </div>
          </div>
        </div>

        {/* Email Verification Section */}
        {email && (
          <div className="email-section">
            <div className="email-header">
              <h3>Stay Updated</h3>
              <p>Verify your email address to receive notifications about your review</p>
            </div>
            <div className="email-actions">
              <div className="email-info">
                <span className="email-label">Email:</span>
                <span className="email-address">{email}</span>
              </div>
          <button
                onClick={handleResendVerification} 
                className="verify-btn"
                disabled={resendStatus === 'Sending...'}
              >
                {resendStatus === 'Sending...' ? 'Sending...' : 'Resend Verification'}
          </button>
        </div>
            {resendStatus && resendStatus !== 'Sending...' && (
              <div className={`status-message ${resendStatus.includes('sent') ? 'success' : 'error'}`}>
                {resendStatus}
              </div>
            )}
          </div>
        )}

        <div className="email-section" style={{ marginTop: '24px' }}>
          <div className="email-header">
            <h3>Text notifications (optional)</h3>
            <p>Get a text when your review is ready and for important order updates.</p>
          </div>
          <div className="email-actions" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(0,0,0,0.3)',
                color: '#fff',
              }}
            />
            <label style={{ display: 'flex', gap: '8px', textAlign: 'left', fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>
              <input type="checkbox" checked={smsOptIn} onChange={(e) => setSmsOptIn(e.target.checked)} disabled={!phone.trim()} />
              <span>I agree to receive transactional texts from Auro. Message and data rates may apply.</span>
            </label>
            <button type="button" onClick={handleSaveSmsPrefs} className="verify-btn" disabled={!phone.trim()}>
              Save text preferences
            </button>
            {smsSaveStatus && <div className="status-message">{smsSaveStatus}</div>}
          </div>
        </div>
      </div>

      <style jsx>{`
        .success-page {
          min-height: 100vh;
          background: #0C0325;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .success-container {
          max-width: 600px;
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 40px;
          text-align: center;
        }

        .success-header {
          margin-bottom: 40px;
        }

        .success-icon {
          margin-bottom: 24px;
          animation: successPulse 2s ease-in-out infinite;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        @keyframes successPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .success-title {
          font-size: 2.5rem;
          font-weight: 700;
          color: white;
          margin: 0 0 16px 0;
          background: #F26955;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .success-message {
          font-size: 1.1rem;
          color: rgba(255, 255, 255, 0.8);
          margin: 0;
          line-height: 1.6;
        }

        .download-section {
          margin-bottom: 32px;
        }

        .download-header h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: white;
          margin: 0 0 8px 0;
        }

        .download-header p {
          color: rgba(255, 255, 255, 0.7);
          margin: 0 0 24px 0;
          font-size: 1rem;
        }

        .download-buttons {
          display: flex;
          gap: 16px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .download-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 24px;
          border-radius: 16px;
          border: none;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          min-width: 200px;
          text-decoration: none;
        }

        .web-btn {
          background: #000;
          color: white;
        }

        .web-btn:hover {
          background: #333;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        }

        .btn-text {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .btn-label {
          font-size: 0.75rem;
          opacity: 0.8;
        }

        .btn-name {
          font-size: 1rem;
          font-weight: 700;
        }

        .protection-card {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 32px;
          text-align: left;
        }

        .protection-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .protection-icon {
          flex-shrink: 0;
        }

        .protection-header h3 {
          color: white;
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0;
        }

        .protection-description {
          color: rgba(255, 255, 255, 0.8);
          margin: 0 0 20px 0;
          line-height: 1.6;
        }

        .protection-features {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 12px;
          color: rgba(255, 255, 255, 0.9);
        }

        .feature-dot {
          width: 8px;
          height: 8px;
          background: #10B981;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .email-section {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 24px;
          text-align: left;
        }

        .email-header h3 {
          color: white;
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0 0 8px 0;
        }

        .email-header p {
          color: rgba(255, 255, 255, 0.7);
          margin: 0 0 20px 0;
          font-size: 0.95rem;
        }

        .email-actions {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .email-info {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          min-width: 200px;
        }

        .email-label {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.9rem;
        }

        .email-address {
          color: white;
          font-weight: 500;
        }

        .verify-btn {
          background: #F26955;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          white-space: nowrap;
        }

        .verify-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(255, 111, 0, 0.4);
        }

        .verify-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .status-message {
          margin-top: 16px;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .status-message.success {
          background: rgba(16, 185, 129, 0.1);
          color: #10B981;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .status-message.error {
          background: rgba(239, 68, 68, 0.1);
          color: #EF4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        @media (max-width: 640px) {
          .success-container {
            padding: 24px;
            margin: 10px;
          }

          .success-title {
            font-size: 2rem;
          }

          .download-buttons {
            flex-direction: column;
            align-items: center;
          }

          .download-btn {
            width: 100%;
            max-width: 280px;
          }

          .email-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .email-info {
            min-width: auto;
            justify-content: center;
          }

          /* Center text content on mobile */
          .protection-card {
            text-align: center;
          }

          .protection-header {
            justify-content: center;
          }

          .protection-features {
            align-items: center;
          }

          .feature-item {
            justify-content: center;
          }

          .email-section {
            text-align: center;
          }

          .email-header {
            text-align: center;
          }

          .email-actions {
            align-items: center;
          }
        }
      `}</style>
    </div>
  );
}


