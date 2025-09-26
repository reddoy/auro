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
              {/* Founding Badge */}
              <div className="hero-badge">
                <span className="badge-icon">🚀</span>
                <span className="badge-text">Exclusive Founding Reviewer Program</span>
              </div>
              
              {/* Main Headline */}
              <h1 className="desktop-only">
                <span className="phrase-1">Rate guys.</span><br />
                <span className="phrase-2">Give advice.</span><br />
                <span className="phrase-3">Get paid.</span>
              </h1>
              <h1 className="mobile-only">
                <span className="phrase-1">Rate guys.</span><br />
                <span className="phrase-2">Give advice.</span><br />
                <span className="phrase-3">Get paid.</span>
              </h1>
              
              {/* Subheadline */}
              <p className="sub desktop-only">Share quick video reviews and monetize your expertise in style, photos, and presentation. Set your own rates and build your income stream.</p>
              <p className="sub mobile-only">Share quick video reviews and monetize your expertise in style, photos, and presentation. Set your own rates and build your income stream.</p>
              
              {/* Founding Reviewer Counter */}
              <div className="hero-counter">
                <ReviewerCounter 
                  maxReviewers={50}
                  className="hero-counter-display"
                />
                <p className="counter-note">Founding spots available before app launch</p>
              </div>
              
              {/* Trust Indicators */}
              <div className="hero-trust">
                <div className="trust-item">
                  <span className="trust-icon">💰</span>
                  <span className="trust-text">Set your own rates</span>
                </div>
                <div className="trust-item">
                  <span className="trust-icon">🛡️</span>
                  <span className="trust-text">Secure platform</span>
                </div>
                <div className="trust-item">
                  <span className="trust-icon">⚡</span>
                  <span className="trust-text">Launching October 15th</span>
                </div>
              </div>
              
              {/* CTA Buttons */}
              <div className="cta-buttons desktop-only">
                <a href="/reviewers/apply" className="cta-primary">Become a Founding Reviewer</a>
                <a href="#how-it-works" className="cta-secondary">See How It Works</a>
              </div>
            </div>

            <div className="hero__media desktop-only">
              <div className="hero-phone-container">
                <img className="hero-phone" src="/iphone-mockup.png" alt="iPhone app mockup showing review process" loading="eager" />
                {/* Floating benefit callouts */}
                <div className="benefit-callout callout-1">
                  <span className="callout-icon">💰</span>
                  <span className="callout-text">Set your own rates</span>
                </div>
                <div className="benefit-callout callout-2">
                  <span className="callout-icon">⏱️</span>
                  <span className="callout-text">Quick video reviews</span>
                </div>
                <div className="benefit-callout callout-3">
                  <span className="callout-icon">🚀</span>
                  <span className="callout-text">Founding member perks</span>
                </div>
              </div>
            </div>
            
            {/* Mobile CTA and scroll indicator */}
            <div className="cta-buttons mobile-only" style={{ marginTop: 24 }}>
              <a href="/reviewers/apply" className="cta-primary">Become a Founding Reviewer</a>
            </div>
            <div className="scroll-indicator mobile-only">
              <div className="scroll-arrow">↓</div>
              <p className="scroll-text">See how it works</p>
              <div className="scroll-arrow">↓</div>
            </div>
          </div>
        </div>
      </section>

      {/* iPhone Showcase Section for Mobile */}
      <section className="iphone-showcase mobile-only">
        <div className="showcase-content">
          <h2 className="showcase-title">Share quick video reviews and monetize your expertise in confidence, image, and aesthetic.</h2>
          <div className="iphone-mockup-container">
            <img className="iphone-mockup" src="/iphone-mockup.png" alt="iPhone app mockup" loading="lazy" />
          </div>
        </div>
      </section>

      {/* How It Works - 3-Step Process */}
      <section id="how-it-works" className="features">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">Start earning in 3 simple steps</p>
          
          {/* 3-Step Process */}
          <div className="process-flow">
            <div className="process-step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Set Your Rate & Share Your Link</h3>
                <p>Set your own price per review and share your profile link across social media. Guys will find you and request reviews through your link.</p>
                <div className="step-benefits">
                  <span className="benefit-tag">💰 You set your rates</span>
                  <span className="benefit-tag">📱 Easy link sharing</span>
                </div>
              </div>
            </div>
            
            <div className="process-connector"></div>
            
            <div className="process-step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Review Profiles & Record Videos</h3>
                <p>Accept requests you want to review and record quick video feedback. You control your time and choose what to review.</p>
                <div className="step-benefits">
                  <span className="benefit-tag">⏱️ Quick reviews</span>
                  <span className="benefit-tag">🎯 Full control</span>
                </div>
              </div>
            </div>
            
            <div className="process-connector"></div>
            
            <div className="process-step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Get Paid After Review</h3>
                <p>Complete your review and get paid via Stripe. Optional: Share reviews to social media to build your personal brand and attract more clients.</p>
                <div className="step-benefits">
                  <span className="benefit-tag">💳 Secure payments</span>
                  <span className="benefit-tag">📸 Social sharing</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Supporting Benefits Grid */}
          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon">🚀</div>
              <h4>Founding Member Perks</h4>
              <p>Join the first 50 reviewers and get exclusive benefits and early access</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">⏰</div>
              <h4>Work Your Schedule</h4>
              <p>Review profiles whenever you want - mornings, evenings, weekends</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">🔒</div>
              <h4>100% Secure</h4>
              <p>All payments processed securely through Stripe</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">📈</div>
              <h4>Scale Your Income</h4>
              <p>Increase your rates as you build reputation and demand grows</p>
            </div>
          </div>
          
          {/* CTA After Features */}
          <div className="features-cta">
            <a href="/reviewers/apply" className="cta-primary">Become a Founding Reviewer</a>
            <p className="cta-note">Free to join • No commitment required • Launch October 15th</p>
          </div>
        </div>
      </section>

      {/* Why Join Auro */}
      <section className="social-proof">
        <div className="container">
          <h2 className="section-title">Why Join Auro?</h2>
          <p className="section-subtitle">Be part of the platform that's changing how creators monetize their expertise</p>
          
          {/* Value Props */}
          <div className="value-props">
            <div className="value-card">
              <div className="value-icon">🎯</div>
              <h3>Founding Member Benefits</h3>
              <p>Join the first 50 reviewers and get exclusive perks, higher commission rates, and priority support from day one.</p>
            </div>
            <div className="value-card">
              <div className="value-icon">💰</div>
              <h3>Set Your Own Rates</h3>
              <p>You control your pricing. Charge what you think your expertise is worth - no platform taking a huge cut.</p>
            </div>
            <div className="value-card">
              <div className="value-icon">🚀</div>
              <h3>Launch With Us</h3>
              <p>Be part of the founding group that shapes the platform. Your feedback directly influences features and improvements.</p>
            </div>
          </div>
          
          {/* Trust Signals */}
          <div className="trust-signals">
            <div className="trust-item">
              <div className="trust-icon">💳</div>
              <div className="trust-content">
                <strong>Secure Payments</strong>
                <span>Via Stripe • After review completion</span>
              </div>
            </div>
            <div className="trust-item">
              <div className="trust-icon">🛡️</div>
              <div className="trust-content">
                <strong>Your Privacy Matters</strong>
                <span>SSL encrypted • GDPR compliant</span>
              </div>
            </div>
            <div className="trust-item">
              <div className="trust-icon">⚡</div>
              <div className="trust-content">
                <strong>Founding Support</strong>
                <span>Direct founder access • Priority help</span>
              </div>
            </div>
            <div className="trust-item">
              <div className="trust-icon">📈</div>
              <div className="trust-content">
                <strong>Early Access</strong>
                <span>Launch October 15th • Get in first</span>
              </div>
            </div>
          </div>
          
          {/* CTA After Value Props */}
          <div className="social-proof-cta">
            <a href="/reviewers/apply" className="cta-primary">Become a Founding Reviewer</a>
            <p className="cta-note">Join the first 50 • Shape the platform • Launch October 15th</p>
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
                I'm RJ, founder of Auro. This is where creators turn expertise into income.
              </p>
              <p>
                On Auro, reviewers earn by sharing their insights on style, confidence, and aesthetic—helping others elevate their personal brand and make smarter choices.
              </p>
              <p>
                We're building a community of trusted voices who shape trends and influence culture. As part of the founding group, you'll get exclusive early access, premium exposure, and the chance to establish yourself before the platform opens to everyone.
              </p>
              <p>
                Join the founding group and start getting paid to share your expertise.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Launch Countdown Section */}
      <section className="launch-countdown">
        <div className="container">
          <div className="countdown-content">
            <h2>⏰ Limited Time: Founding Member Benefits End Soon</h2>
            <p>Join before we launch on October 15th at 9 PM PST to lock in exclusive founding perks</p>
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
            <div className="urgency-message">
              <span className="urgency-text">⚡ Only founding members get these exclusive benefits</span>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA with Enhanced Urgency */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <div className="urgency-badge">
              <span className="urgency-icon">🚨</span>
              <span className="urgency-label">FOUNDING MEMBERS ONLY</span>
            </div>
            <h2>Claim Your Exclusive Founding Spot</h2>
            <p>Join the first 50 reviewers and lock in these exclusive benefits forever:</p>
            
            <div className="founding-benefits">
              <div className="benefit-item featured">
                <span className="benefit-icon">🎯</span>
                <div className="benefit-content">
                  <strong>Higher Commission Rates</strong>
                  <span>Keep 90% of earnings (vs 80% for regular members)</span>
                </div>
              </div>
              <div className="benefit-item featured">
                <span className="benefit-icon">⚡</span>
                <div className="benefit-content">
                  <strong>Priority Access</strong>
                  <span>First dibs on high-paying review requests</span>
                </div>
              </div>
              <div className="benefit-item featured">
                <span className="benefit-icon">💎</span>
                <div className="benefit-content">
                  <strong>Founding Member Badge</strong>
                  <span>Exclusive status that commands higher rates</span>
                </div>
              </div>
              <div className="benefit-item featured">
                <span className="benefit-icon">📞</span>
                <div className="benefit-content">
                  <strong>Direct Founder Access</strong>
                  <span>Personal support and feature requests</span>
                </div>
              </div>
            </div>
            
            <div className="cta-buttons">
              <a href="/reviewers/apply" className="cta-primary urgent">Claim Your Founding Spot Now</a>
              <a href="#how-it-works" className="cta-secondary">Learn More First</a>
            </div>
            
            <div className="final-urgency">
              <p className="urgency-text">
                <span className="highlight">Limited founding spots available</span> • 
                Benefits end October 15th at 9 PM PST • 
                <span className="highlight">No commitment required</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky bottom ribbon removed per request */}
    </div>
  );
}


