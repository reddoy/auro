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
      <div style={{ marginTop: 16 }}>
        <p>
          For updates via email, verify your address{email ? ` (${email})` : ''}.
        </p>
        <button onClick={handleResendVerification} className="btn-primary">Resend verification</button>
        {resendStatus && <p style={{ marginTop: 8 }}>{resendStatus}</p>}
      </div>
    </div>
  );
}


