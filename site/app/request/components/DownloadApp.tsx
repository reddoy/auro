'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  requestId?: string;
  onBack: () => void;
};

export default function DownloadApp({ requestId, onBack }: Props) {
  const router = useRouter();

  const handleEmailReminder = () => {
    const subject = encodeURIComponent('Auro Web Reminder');
    const body = encodeURIComponent(`Hi!

Thank you for requesting a review with Auro! 

Continue in the Auro web app to track your review progress and get notified when your feedback is ready:

🌐 Web app: same site → /app

Your request ID: ${requestId || 'N/A'}

Best regards,
The Auro Team`);
    
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="download-app">
      <div className="step-header">
        <h2>🎉 Payment Successful!</h2>
        <p>Your review request has been submitted and payment processed successfully.</p>
      </div>

      <div className="success-container">
        <div className="success-card">
          <div className="success-icon">✅</div>
          <h3>Request Submitted Successfully</h3>
          
          {requestId && (
            <div className="request-info">
              <p><strong>Request ID:</strong> {requestId}</p>
              <p className="request-note">Save this ID to track your review</p>
            </div>
          )}

          <div className="timeline">
            <h4>What happens next:</h4>
            <div className="timeline-item">
              <div className="timeline-step">1</div>
              <div className="timeline-content">
                <strong>Review Assignment</strong>
                <p>Your selected reviewer will be notified immediately</p>
              </div>
            </div>
            
            <div className="timeline-item">
              <div className="timeline-step">2</div>
              <div className="timeline-content">
                <strong>Review Acceptance</strong>
                <p>Your reviewer has 2 weeks to accept or deny your request. If no action is taken within 2 weeks, you will be automatically refunded.</p>
              </div>
            </div>
            <div className="timeline-item">
              <div className="timeline-step">3</div>
              <div className="timeline-content">
                <strong>Review Process</strong>
                <p>Once accepted, your reviewer will provide detailed feedback within 48 hours. If not completed within 48 hours, you will be automatically refunded.</p>
              </div>
            </div>
            
            <div className="timeline-item">
              <div className="timeline-step">4</div>
              <div className="timeline-content">
                <strong>Notification</strong>
                <p>You&apos;ll be notified by email and text when your review is ready</p>
              </div>
            </div>
          </div>
        </div>

        <div className="app-download-section">
          <h3>🌐 Open Auro Web App</h3>
          <p>
            Use Auro on desktop or mobile web to track progress, receive notifications,
            and access your feedback.
          </p>

          <div className="download-options">
            <button
              onClick={() => router.push('/app/requests?tab=active')}
              className="download-button app-store"
            >
              <div className="download-text">
                <span className="download-label">OPEN</span>
                <span className="download-store">View my request</span>
              </div>
            </button>
          </div>

          <div className="alternative-options">
            <h4>Prefer to download later?</h4>
            <button 
              onClick={handleEmailReminder}
              className="btn-secondary email-reminder"
            >
              📧 Email me the web app link
            </button>
          </div>

          <div className="app-features">
            <h4>Web App Features:</h4>
            <ul>
              <li>📊 Track your review progress in real-time</li>
              <li>🔔 Get instant notifications when reviews are complete</li>
              <li>📱 View detailed feedback and ratings</li>
              <li>🌐 Use it from desktop or mobile browser</li>
              <li>⭐ Manage requests and history in one place</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="step-actions">
        <button type="button" onClick={() => router.push('/app/requests?tab=active')} className="btn-secondary">
          Open my dashboard
        </button>
      </div>

      <div className="support-info">
        <p>
          <strong>Need help?</strong> Contact us at{' '}
          <a href="mailto:support@appauro.com">support@appauro.com</a>
        </p>
        <p>
          Follow us on social media for tips and updates: <strong>@AuroApp</strong>
        </p>
      </div>
    </div>
  );
}
