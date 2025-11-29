'use client';

import React, { useState } from 'react';

type Consent = {
  shareOnSocial: boolean;
  agreedAt: string;
};

type Props = {
  consent: Consent;
  onConsentChange: (consent: Consent) => void;
  onNext: () => void;
  onBack: () => void;
};

export default function ConsentForm({ consent, onConsentChange, onNext, onBack }: Props) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const handleSocialConsentChange = (shareOnSocial: boolean) => {
    onConsentChange({
      shareOnSocial,
      agreedAt: new Date().toISOString()
    });
  };

  const canProceed = termsAccepted && privacyAccepted;

  const handleContinue = () => {
    if (canProceed) {
      // Update the consent timestamp when proceeding
      onConsentChange({
        ...consent,
        agreedAt: new Date().toISOString()
      });
      onNext();
    }
  };

  return (
    <div className="consent-form">
      <div className="step-header">
        <h2>Review Terms & Consent</h2>
        <p>Please review and agree to our terms before proceeding with your review request.</p>
      </div>

      <div className="consent-sections">
        {/* Social Media Consent */}
        <div className="consent-section">
          <h3>Social Media Sharing (Optional)</h3>
          <p>
            Would you like to allow your reviewer to potentially share your review (anonymously) on their social media for educational purposes? 
            This helps other users see examples of feedback but your identity will never be revealed.
          </p>
          
          <div className="radio-group">
            <label className="radio-option">
              <input
                type="radio"
                name="socialConsent"
                checked={consent.shareOnSocial === true}
                onChange={() => handleSocialConsentChange(true)}
              />
              <span className="radio-custom"></span>
              <div className="radio-content">
                <strong>Yes, I consent</strong>
                <p>Allow anonymous sharing for educational purposes</p>
              </div>
            </label>
            
            <label className="radio-option">
              <input
                type="radio"
                name="socialConsent"
                checked={consent.shareOnSocial === false}
                onChange={() => handleSocialConsentChange(false)}
              />
              <span className="radio-custom"></span>
              <div className="radio-content">
                <strong>No, keep it private</strong>
                <p>My review should remain completely private</p>
              </div>
            </label>
          </div>
        </div>

        {/* Terms of Service */}
        <div className="consent-section">
          <h3>Terms of Service</h3>
          <div className="terms-content">
            <div className="terms-scroll">
              <h4>Auro Review Service Terms</h4>
              
              <h5>1. Service Description</h5>
              <p>
                Auro provides a platform connecting users with reviewers for personalized feedback on photos, style, and attractiveness. 
                Reviews are subjective opinions provided by independent reviewers.
              </p>

              <h5>2. User Responsibilities</h5>
              <ul>
                <li>You must be at least 18 years old to use this service</li>
                <li>Photos submitted must be appropriate and not contain nudity or explicit content</li>
                <li>You own all rights to the photos you submit</li>
                <li>You understand that reviews are subjective opinions, not professional advice</li>
              </ul>

              <h5>3. Reviewer Guidelines</h5>
              <ul>
                <li>Reviewers provide honest, constructive feedback based on their personal opinions</li>
                <li>Reviews are for entertainment and self-improvement purposes only</li>
                <li>Auro does not guarantee specific outcomes from following review advice</li>
              </ul>

              <h5>4. Content Policy</h5>
              <ul>
                <li>All uploaded content must comply with our community guidelines</li>
                <li>Inappropriate content will result in immediate account termination</li>
                <li>We reserve the right to remove content that violates our policies</li>
              </ul>

              <h5>5. Payment & Refunds</h5>
              <ul>
                <li>Payments are processed securely through Stripe</li>
                <li>Reviews are typically completed within 48 hours</li>
                <li>Refunds may be issued at our discretion for incomplete or inappropriate reviews</li>
              </ul>
            </div>
          </div>
          
          <label className="checkbox-option">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
            />
            <span className="checkbox-custom"></span>
            I agree to the Terms of Service
          </label>
        </div>

        {/* Privacy Policy */}
        <div className="consent-section">
          <h3>Privacy Policy</h3>
          <div className="terms-content">
            <div className="terms-scroll">
              <h4>How We Protect Your Privacy</h4>
              
              <h5>Information We Collect</h5>
              <ul>
                <li>Photos and content you upload for reviews</li>
                <li>Account information (email, name, profile details)</li>
                <li>Payment information (processed securely by Stripe)</li>
                <li>Usage data and analytics</li>
              </ul>

              <h5>How We Use Your Information</h5>
              <ul>
                <li>To provide review services and match you with appropriate reviewers</li>
                <li>To process payments and manage your account</li>
                <li>To improve our service and user experience</li>
                <li>To communicate with you about your reviews and account</li>
              </ul>

              <h5>Information Sharing</h5>
              <ul>
                <li>Your photos are only shared with your selected reviewer</li>
                <li>We never sell your personal information to third parties</li>
                <li>Anonymous, aggregated data may be used for research and improvement</li>
                <li>We may share information if required by law</li>
              </ul>

              <h5>Data Security</h5>
              <ul>
                <li>All data is encrypted in transit and at rest</li>
                <li>Photos are automatically deleted after 30 days unless you request otherwise</li>
                <li>We use industry-standard security practices</li>
                <li>You can request deletion of your data at any time</li>
              </ul>
            </div>
          </div>
          
          <label className="checkbox-option">
            <input
              type="checkbox"
              checked={privacyAccepted}
              onChange={(e) => setPrivacyAccepted(e.target.checked)}
            />
            <span className="checkbox-custom"></span>
            I agree to the Privacy Policy
          </label>
        </div>
      </div>

      <div className="step-actions">
        <button 
          type="button" 
          onClick={handleContinue} 
          className="btn-primary"
          disabled={!canProceed}
        >
          Continue
        </button>
        <button type="button" onClick={onBack} className="btn-secondary">
          Back
        </button>
      </div>

      {!canProceed && (
        <p className="validation-message">
          Please accept both the Terms of Service and Privacy Policy to continue.
        </p>
      )}
    </div>
  );
}
