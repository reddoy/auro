'use client';

import { useState } from 'react';
import { Button } from './ui/button';

export default function RevieweeWaitlist() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber.trim()) {
      setStatus('error');
      setMessage('Please enter your phone number');
      return;
    }

    setStatus('loading');
    
    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phoneNumber: phoneNumber.trim(),
          source: 'homepage_footer'
        })
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage('You\'re on the list! We\'ll text you when we launch.');
        setPhoneNumber('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Something went wrong');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Failed to join waitlist. Please try again.');
    }
  };

  return (
    <div className="reviewee-waitlist-container">
      <div className="reviewee-waitlist-content">
        <div className="text-content">
          <h3 className="waitlist-title">Want to get reviewed?</h3>
          <p className="waitlist-subtitle">Join the waitlist and we'll text you when we launch</p>
        </div>
        
        {status === 'success' ? (
          <div className="success-message">
            <span className="success-icon">✓</span>
            <span>{message}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="waitlist-form">
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="(555) 123-4567"
              className="phone-input"
              disabled={status === 'loading'}
            />
            <Button 
              type="submit" 
              disabled={status === 'loading'}
              className="submit-button"
            >
              {status === 'loading' ? 'Joining...' : 'Join Waitlist'}
            </Button>
          </form>
        )}
        
        {status === 'error' && (
          <p className="error-message">{message}</p>
        )}
      </div>

      <style jsx>{`
        .reviewee-waitlist-container {
          background: linear-gradient(135deg, rgba(108, 99, 255, 0.1), rgba(255, 101, 132, 0.1));
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 24px;
          backdrop-filter: blur(10px);
        }

        .reviewee-waitlist-content {
          max-width: 600px;
          margin: 0 auto;
        }

        .text-content {
          text-align: center;
          margin-bottom: 20px;
        }

        .waitlist-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
          margin-bottom: 8px;
        }

        .waitlist-subtitle {
          font-size: 0.95rem;
          color: rgba(255, 255, 255, 0.8);
        }

        .waitlist-form {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .phone-input {
          flex: 1;
          min-width: 200px;
          padding: 12px 16px;
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          font-size: 1rem;
          transition: all 0.3s ease;
        }

        .phone-input::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }

        .phone-input:focus {
          outline: none;
          border-color: rgba(108, 99, 255, 0.6);
          background: rgba(255, 255, 255, 0.15);
        }

        .phone-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .submit-button {
          background: linear-gradient(135deg, #FF6F00, #9333EA, #FF8A00, #A855F7);
          background-size: 300% 300%;
          color: white;
          padding: 12px 24px;
          font-weight: 600;
          white-space: nowrap;
          border: 0;
          border-radius: 16px;
          box-shadow: 0 12px 40px rgba(255, 111, 0, 0.3);
          transition: all 0.3s ease;
          animation: gradientShift 0.5s ease infinite;
          position: relative;
          overflow: hidden;
        }

        .submit-button::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(200, 53, 159, 0.3);
          transition: width 0.6s, height 0.6s;
          transform: translate(-50%, -50%);
        }

        .submit-button:hover::before {
          width: 300px;
          height: 300px;
          background: rgba(200, 53, 159, 0.2);
          animation: ripple 0.6s linear;
        }

        .submit-button:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 16px 50px rgba(255, 111, 0, 0.4);
        }

        .submit-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes ripple {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
        }

        .success-message {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 16px;
          background: rgba(34, 197, 94, 0.2);
          border: 2px solid rgba(34, 197, 94, 0.4);
          border-radius: 8px;
          color: #4ade80;
          font-weight: 600;
        }

        .success-icon {
          font-size: 1.5rem;
        }

        .error-message {
          text-align: center;
          color: #ff6b6b;
          font-size: 0.9rem;
          margin-top: 8px;
        }

        @media (max-width: 640px) {
          .reviewee-waitlist-container {
            padding: 20px 16px;
          }

          .waitlist-title {
            font-size: 1.25rem;
          }

          .waitlist-form {
            flex-direction: column;
          }

          .phone-input {
            width: 100%;
          }

          .submit-button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

