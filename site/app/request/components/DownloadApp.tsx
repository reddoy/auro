'use client';

import React, { useEffect, useState } from 'react';

type Props = {
  requestId?: string;
  onBack: () => void;
};

export default function DownloadApp({ requestId, onBack }: Props) {
  const [userAgent, setUserAgent] = useState('');
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setUserAgent(ua);
    setIsIOS(/iPhone|iPad|iPod/.test(ua));
    setIsAndroid(/Android/.test(ua));
  }, []);

  const handleAppStoreClick = () => {
    // Replace with actual App Store URL when available
    window.open('https://apps.apple.com/app/auro', '_blank');
  };

  const handlePlayStoreClick = () => {
    // Replace with actual Play Store URL when available
    window.open('https://play.google.com/store/apps/details?id=com.auro', '_blank');
  };

  const handleEmailReminder = () => {
    const subject = encodeURIComponent('Auro App Download Reminder');
    const body = encodeURIComponent(`Hi!

Thank you for requesting a review with Auro! 

Download the Auro app to track your review progress and get notified when your feedback is ready:

📱 iOS: https://apps.apple.com/app/auro
🤖 Android: https://play.google.com/store/apps/details?id=com.auro

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
                <p>You'll be notified via email and app when your review is ready</p>
              </div>
            </div>
          </div>
        </div>

        <div className="app-download-section">
          <h3>📱 Download the Auro App</h3>
          <p>
            Get the mobile app to track your review progress, receive notifications, 
            and access your feedback on the go.
          </p>

          <div className="download-options">
            {isIOS && (
              <button 
                onClick={handleAppStoreClick}
                className="download-button app-store"
              >
                <div className="download-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                </div>
                <div className="download-text">
                  <span className="download-label">Download on the</span>
                  <span className="download-store">App Store</span>
                </div>
              </button>
            )}

            {isAndroid && (
              <button 
                onClick={handlePlayStoreClick}
                className="download-button play-store"
              >
                <div className="download-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                  </svg>
                </div>
                <div className="download-text">
                  <span className="download-label">Get it on</span>
                  <span className="download-store">Google Play</span>
                </div>
              </button>
            )}

            {!isIOS && !isAndroid && (
              <>
                <button 
                  onClick={handleAppStoreClick}
                  className="download-button app-store"
                >
                  <div className="download-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                  </div>
                  <div className="download-text">
                    <span className="download-label">Download on the</span>
                    <span className="download-store">App Store</span>
                  </div>
                </button>

                <button 
                  onClick={handlePlayStoreClick}
                  className="download-button play-store"
                >
                  <div className="download-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                    </svg>
                  </div>
                  <div className="download-text">
                    <span className="download-label">Get it on</span>
                    <span className="download-store">Google Play</span>
                  </div>
                </button>
              </>
            )}
          </div>

          <div className="alternative-options">
            <h4>Prefer to download later?</h4>
            <button 
              onClick={handleEmailReminder}
              className="btn-secondary email-reminder"
            >
              📧 Email me the download links
            </button>
          </div>

          <div className="app-features">
            <h4>App Features:</h4>
            <ul>
              <li>📊 Track your review progress in real-time</li>
              <li>🔔 Get instant notifications when reviews are complete</li>
              <li>📱 View detailed feedback and ratings</li>
              <li>💬 Message your reviewers directly</li>
              <li>📷 Request follow-up reviews</li>
              <li>⭐ Rate and review your experience</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="step-actions">
        <button type="button" onClick={() => window.location.href = '/'} className="btn-secondary">
          Return to Home
        </button>
        <button type="button" onClick={onBack} className="btn-outline">
          Back to Payment
        </button>
      </div>

      <div className="support-info">
        <p>
          <strong>Need help?</strong> Contact us at{' '}
          <a href="mailto:support@appauro.com">support@appauro.com</a>
        </p>
        <p>
          Follow us on social media for tips and updates:{' '}
          <a href="#" target="_blank">@AuroApp</a>
        </p>
      </div>
    </div>
  );
}
