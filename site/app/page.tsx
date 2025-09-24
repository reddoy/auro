'use client';

import { useState } from 'react';
import CountdownTimer from '../components/CountdownTimer';
import ReviewerCounter from '../components/ReviewerCounter';

export default function HomePage() {
  const [showRibbon, setShowRibbon] = useState(true);

  return (
    <div>
      {/* Hero */}
      <section className="hero">
        <div className="bg-glow"></div>
        <div className="container">
          <div className="hero__inner">
            <div className="hero__copy">
              <h1 className="desktop-only">Rate guys.<br />Give advice.<br /><em>Get paid.</em></h1>
              <h1 className="mobile-only">Rate guys.<br />Give advice.<br /><em>Get paid.</em></h1>
              <p className="sub desktop-only">Share quick video reviews and monetize your expertise in style, photos, and presentation.</p>
              <div className="cta-buttons desktop-only">
                <a href="/reviewers/apply" className="cta-primary">Become a Founding Reviewer</a>
              </div>
            </div>

            <div className="hero__media desktop-only">
              <img className="hero-phone" src="/iphone-mockup.png" alt="iPhone app mockup" loading="eager" />
            </div>
            <div className="cta-buttons mobile-only" style={{ marginTop: 8 }}>
              <a href="/reviewers/apply" className="cta-primary">Become a Founding Reviewer</a>
            </div>
            <div className="scroll-indicator mobile-only">
              <div className="scroll-arrow">↓</div>
              <p className="scroll-text">Scroll to see how it works</p>
              <div className="scroll-arrow">↓</div>
            </div>
          </div>
        </div>
      </section>

      {/* iPhone Showcase Section for Mobile */}
      <section className="iphone-showcase mobile-only">
        <div className="showcase-content">
          <h2 className="showcase-title">Share quick video reviews and monetize your expertise in style, photos, and presentation.</h2>
          <div className="iphone-mockup-container">
            <img className="iphone-mockup" src="/iphone-mockup.png" alt="iPhone app mockup" loading="lazy" />
          </div>
        </div>
      </section>

      {/* How It Works & Benefits */}
      <section id="how-it-works" className="features">
        <div className="container">
          <h2 className="section-title">How Reviewing Works</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">💰</div>
              <h3>Set Your Own Rate</h3>
              <p>Charge whatever you want per review. You control your pricing and can adjust based on demand and your time.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3>Post Your Link</h3>
              <p>Share your reviewer profile link across all your social media platforms. Guys sign up through your link to request reviews.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>Accept or Deny Requests</h3>
              <p>You have complete control over which requests to accept. Review selfies, outfits, profiles — whatever you're comfortable with.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎥</div>
              <h3>Submit Video Review</h3>
              <p>Record short video reviews right in the app. Quick, honest feedback that commands premium rates.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📸</div>
              <h3>Share to Social Media</h3>
              <p>Post reviews directly to Instagram Reels and TikTok straight from the app — only with reviewee consent for social sharing.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💳</div>
              <h3>Get Paid via Stripe</h3>
              <p>All payments and payouts are handled securely through Stripe. Your money hits your account instantly after each review.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof & Trust Signals */}
      <section className="social-proof">
        <div className="container">
          <h2 className="section-title">Join Top Creators</h2>
          <div className="testimonials">
            <div className="testimonial-card">
              <div className="testimonial-content">
                <p>"I'm making $200+ per day just reviewing guys' profiles. The app is so easy to use and the money hits my account instantly."</p>
              </div>
              <div className="testimonial-author">
                <div className="author-info">
                  <strong>Sarah M.</strong>
                  <span>OnlyFans Creator</span>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <div className="testimonial-content">
                <p>"Finally, a way to monetize my eye for style without showing my body. I review 10-15 profiles per day and it's become my main income stream."</p>
              </div>
              <div className="testimonial-author">
                <div className="author-info">
                  <strong>Jessica L.</strong>
                  <span>Content Creator</span>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <div className="testimonial-content">
                <p>"The guys actually listen to my advice and come back for more reviews. It's satisfying to help them improve while getting paid well for it."</p>
              </div>
              <div className="testimonial-author">
                <div className="author-info">
                  <strong>Maya K.</strong>
                  <span>Fashion Influencer</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Trust Signals */}
          <div className="trust-signals">
            <div className="trust-item">
              <div className="trust-icon">💳</div>
              <span>Instant Payments</span>
            </div>
            <div className="trust-item">
              <div className="trust-icon">🛡️</div>
              <span>Secure Platform</span>
            </div>
            <div className="trust-item">
              <div className="trust-icon">⚡</div>
              <span>24/7 Support</span>
            </div>
            <div className="trust-item">
              <div className="trust-icon">📈</div>
              <span>Growing Fast</span>
            </div>
          </div>
        </div>
      </section>

      {/* Founder */}
      <section className="about">
        <div className="container">
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', textAlign: 'center' }}>
            <h2 className="section-title" style={{ width: '100%', marginTop: 0 }}>Why I started Auro</h2>
            <img src="/rj-headshot.jpg" alt="RJ headshot" style={{ width: 160, height: 160, objectFit: 'cover', borderRadius: 12 }} loading="lazy" />
            <div className="about__text" style={{ maxWidth: 720, textAlign: 'center' }}>
              <p>
                I'm RJ, founder of Auro. I built this platform to connect creators with high-paying review opportunities.
              </p>
              <p>
                Reviewers on Auro monetize their expertise in style, confidence, and presentation. Join the founding group and start earning from your knowledge.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Launch Countdown Section */}
      <section className="launch-countdown">
        <div className="container">
          <div className="countdown-content">
            <h2>App Launch Countdown</h2>
            <p>Join before we launch on October 15th at 9 PM PST</p>
            <div className="countdown-display">
              <CountdownTimer 
                targetDate={new Date('2025-10-15T21:00:00-08:00')}
                className="main-countdown"
              />
            </div>
            <div className="reviewer-progress">
              <ReviewerCounter 
                maxReviewers={50}
                className="main-counter"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA with Urgency */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Limited Founding Spots Available</h2>
            <p>Join the first 50 reviewers and get exclusive benefits:</p>
            <div className="founding-benefits">
              <div className="benefit-item">
                <span className="benefit-icon">🎯</span>
                <span>Higher commission rates (founding members only)</span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">⚡</span>
                <span>Priority access to high-paying requests</span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">💎</span>
                <span>Exclusive founding member badge</span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">📞</span>
                <span>Direct access to founder for feedback</span>
              </div>
            </div>
            <div className="cta-buttons">
              <a href="/reviewers/apply" className="cta-primary">Claim Your Founding Spot</a>
            </div>
            <p className="cta-note">Limited founding spots - Join the exclusive group</p>
          </div>
        </div>
      </section>

      {/* Sticky bottom ribbon removed per request */}
    </div>
  );
}


