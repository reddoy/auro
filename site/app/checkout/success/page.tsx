'use client';
import React, { useEffect, useState } from 'react';

export default function CheckoutSuccessPage() {
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [resendStatus, setResendStatus] = useState('');

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const csId = url.searchParams.get('rid');
      if (csId) {
        setMessage('Payment confirmed. Your review request is being prepared.');
        // Idempotent server-side confirmation in case webhook hasn't run yet
        fetch('/api/checkout/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: csId }),
        }).catch(() => {});
      } else {
        setMessage('Payment confirmed.');
      }
      const storedEmail = localStorage.getItem('auro_signup_email') || '';
      if (storedEmail) setEmail(storedEmail);
    } catch {}
  }, []);

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

        {/* App Download Section */}
        <div className="download-section">
          <div className="download-header">
            <h2>Get the Auro App</h2>
            <p>Track your review progress and get notified when it's ready</p>
          </div>
          
          <div className="download-buttons">
            <button
              onClick={() => window.open('https://apps.apple.com/app/auro', '_blank')}
              className="download-btn ios-btn"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <div className="btn-text">
                <span className="btn-label">Download on the</span>
                <span className="btn-name">App Store</span>
              </div>
            </button>
            
            <button
              onClick={() => window.open('https://play.google.com/store/apps/details?id=com.auro', '_blank')}
              className="download-btn android-btn"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
              </svg>
              <div className="btn-text">
                <span className="btn-label">GET IT ON</span>
                <span className="btn-name">Google Play</span>
              </div>
            </button>
          </div>
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
            <strong>Escrow System:</strong> Your payment is held securely until your review is completed. 
            The reviewer only gets paid after delivering your review, ensuring quality service.
          </p>
          <div className="protection-features">
            <div className="feature-item">
              <div className="feature-dot"></div>
              <span>Payment held until review completion</span>
            </div>
            <div className="feature-item">
              <div className="feature-dot"></div>
              <span>Full refund if review not delivered within 30 days</span>
            </div>
            <div className="feature-item">
              <div className="feature-dot"></div>
              <span>Automatic payment to reviewer upon completion</span>
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
      </div>

      <style jsx>{`
        .success-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #1A0B2E 0%, #2D1B69 50%, #1A0B2E 100%);
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
          background: linear-gradient(135deg, #FF6F00, #FF8E53);
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

        .ios-btn {
          background: #000;
          color: white;
        }

        .ios-btn:hover {
          background: #333;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        }

        .android-btn {
          background: #01875f;
          color: white;
        }

        .android-btn:hover {
          background: #1a9b6f;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(1, 135, 95, 0.3);
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
          background: linear-gradient(135deg, #FF6F00, #FF8E53);
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


