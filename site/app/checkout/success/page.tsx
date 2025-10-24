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
    <div style={{ padding: 24 }}>
      <h1>Success</h1>
      <p>{message}</p>

      <div style={{ marginTop: 24 }}>
        <h2 style={{ marginBottom: 8 }}>Download our app to see your review</h2>
        <p style={{ marginBottom: 12 }}>Install the app to track progress and get notified when your review is ready.</p>
        
        {/* Escrow Protection Info */}
        <div style={{ 
          background: 'rgba(34, 197, 94, 0.05)', 
          border: '1px solid rgba(34, 197, 94, 0.2)', 
          borderRadius: '12px', 
          padding: '16px', 
          marginBottom: '16px' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '20px' }}>🛡️</span>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Your Payment is Protected</h3>
          </div>
          <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>
            <strong>Escrow System:</strong> Your payment is held securely until your review is completed. 
            The reviewer only gets paid after delivering your review, ensuring quality service.
          </p>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#666' }}>
            <li>Payment held until review completion</li>
            <li>Full refund if review not delivered within 30 days</li>
            <li>Automatic payment to reviewer upon completion</li>
          </ul>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => window.open('https://apps.apple.com/app/auro', '_blank')}
            className="btn-primary"
          >
            Download for iOS
          </button>
          <button
            onClick={() => window.open('https://play.google.com/store/apps/details?id=com.auro', '_blank')}
            className="btn-primary"
          >
            Download for Android
          </button>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <p>
          For updates via email, verify your address{email ? ` (${email})` : ''}.
        </p>
        <button onClick={handleResendVerification} className="btn-primary">Resend verification</button>
        {resendStatus && <p style={{ marginTop: 8 }}>{resendStatus}</p>}
      </div>
    </div>
  );
}


