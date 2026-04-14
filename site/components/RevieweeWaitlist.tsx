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
        setMessage("You are in. Expect occasional SMS tips—no spam.");
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
          <h3 className="waitlist-title">Want SMS tips on your profile?</h3>
          <p className="waitlist-subtitle">
            Optional. Drop your number for occasional Auro nudges—request a review anytime from the buttons above.
          </p>
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
              variant="gradient"
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
          background: rgba(242, 105, 85, 0.12);
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
          /* Custom styling handled by Button component gradient variant */
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

