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
              {/* Social Proof Badge */}
              <div className="hero-badge">
                <span className="badge-icon">⭐</span>
                <span className="badge-text">4.9/5 rating from 500+ active reviewers</span>
              </div>
              
              {/* Main Headline */}
              <h1 className="desktop-only">Turn Your Eye for Style Into<br /><em>$200+ Daily Income</em></h1>
              <h1 className="mobile-only">Turn Your Eye for Style Into<br /><em>$200+ Daily Income</em></h1>
              
              {/* Subheadline */}
              <p className="sub desktop-only">Join 500+ creators already earning by reviewing guys' profiles. Set your rates, work your schedule, get paid instantly.</p>
              <p className="sub mobile-only">Join 500+ creators earning by reviewing profiles. Set your rates, work your schedule, get paid instantly.</p>
              
              {/* Trust Indicators */}
              <div className="hero-trust">
                <div className="trust-item">
                  <span className="trust-icon">💳</span>
                  <span className="trust-text">Instant payments via Stripe</span>
                </div>
                <div className="trust-item">
                  <span className="trust-icon">🛡️</span>
                  <span className="trust-text">Secure & verified platform</span>
                </div>
                <div className="trust-item">
                  <span className="trust-icon">⚡</span>
                  <span className="trust-text">Start earning in minutes</span>
                </div>
              </div>
              
              {/* CTA Buttons */}
              <div className="cta-buttons desktop-only">
                <a href="/reviewers/apply" className="cta-primary">Start Earning Today - Free to Join</a>
                <a href="#how-it-works" className="cta-secondary">See How It Works</a>
              </div>
            </div>

            <div className="hero__media desktop-only">
              <div className="hero-phone-container">
                <img className="hero-phone" src="/iphone-mockup.png" alt="iPhone app mockup showing review process" loading="eager" />
                {/* Floating benefit callouts */}
                <div className="benefit-callout callout-1">
                  <span className="callout-icon">💰</span>
                  <span className="callout-text">$50-200 per review</span>
                </div>
                <div className="benefit-callout callout-2">
                  <span className="callout-icon">⏱️</span>
                  <span className="callout-text">2-min video reviews</span>
                </div>
                <div className="benefit-callout callout-3">
                  <span className="callout-icon">📱</span>
                  <span className="callout-text">Easy sharing</span>
                </div>
              </div>
            </div>
            
            {/* Mobile CTA and scroll indicator */}
            <div className="cta-buttons mobile-only" style={{ marginTop: 24 }}>
              <a href="/reviewers/apply" className="cta-primary">Start Earning Today - Free to Join</a>
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
                <p>Charge $50-200 per review and share your profile link across social media. Guys find you and request reviews automatically.</p>
                <div className="step-benefits">
                  <span className="benefit-tag">💰 Earn $50-200 per review</span>
                  <span className="benefit-tag">📱 Easy link sharing</span>
                </div>
              </div>
            </div>
            
            <div className="process-connector"></div>
            
            <div className="process-step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Review Profiles & Record Videos</h3>
                <p>Accept requests you want to review and record quick 2-minute video feedback. You control your time and choose what to review.</p>
                <div className="step-benefits">
                  <span className="benefit-tag">⏱️ 2-minute reviews</span>
                  <span className="benefit-tag">🎯 Full control</span>
                </div>
              </div>
            </div>
            
            <div className="process-connector"></div>
            
            <div className="process-step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Get Paid Instantly</h3>
                <p>Money hits your account instantly via Stripe after each review. Optional: Share reviews to social media to build your personal brand.</p>
                <div className="step-benefits">
                  <span className="benefit-tag">💳 Instant payments</span>
                  <span className="benefit-tag">📸 Social sharing</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Supporting Benefits Grid */}
          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon">🚀</div>
              <h4>Start Earning in Minutes</h4>
              <p>Set up your profile and start receiving review requests within hours</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">⏰</div>
              <h4>Work Your Schedule</h4>
              <p>Review profiles whenever you want - mornings, evenings, weekends</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">🔒</div>
              <h4>100% Secure</h4>
              <p>All payments processed securely through Stripe with instant payouts</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">📈</div>
              <h4>Scale Your Income</h4>
              <p>Increase your rates as you build reputation and demand grows</p>
            </div>
          </div>
          
          {/* CTA After Features */}
          <div className="features-cta">
            <a href="/reviewers/apply" className="cta-primary">Join 500+ Active Reviewers</a>
            <p className="cta-note">Free to join • No commitment required • Start earning today</p>
          </div>
        </div>
      </section>

      {/* Social Proof & Trust Signals */}
      <section className="social-proof">
        <div className="container">
          <h2 className="section-title">Join Top Creators Earning Big</h2>
          <p className="section-subtitle">See what real creators are saying about their experience</p>
          
          {/* Trust Metrics Dashboard */}
          <div className="trust-metrics">
            <div className="metric-card">
              <div className="metric-number">$50K+</div>
              <div className="metric-label">Paid out this month</div>
            </div>
            <div className="metric-card">
              <div className="metric-number">500+</div>
              <div className="metric-label">Active reviewers</div>
            </div>
            <div className="metric-card">
              <div className="metric-number">4.9/5</div>
              <div className="metric-label">Average rating</div>
            </div>
            <div className="metric-card">
              <div className="metric-number">2min</div>
              <div className="metric-label">Avg review time</div>
            </div>
          </div>
          
          {/* Enhanced Testimonials */}
          <div className="testimonials">
            <div className="testimonial-card featured">
              <div className="testimonial-header">
                <div className="author-avatar">
                  <div className="avatar-placeholder">SM</div>
                </div>
                <div className="author-info">
                  <strong>Sarah M.</strong>
                  <span>OnlyFans Creator • $2,400/month</span>
                  <div className="verification-badge">
                    <span className="checkmark">✓</span>
                    <span>Verified Creator</span>
                  </div>
                </div>
              </div>
              <div className="testimonial-content">
                <div className="rating">⭐⭐⭐⭐⭐</div>
                <p>"I'm making $200+ per day just reviewing guys' profiles. The app is so easy to use and the money hits my account instantly. Best side income I've ever had!"</p>
                <div className="earnings-proof">
                  <span className="earnings-label">Last 30 days:</span>
                  <span className="earnings-amount">$2,400 earned</span>
                </div>
              </div>
            </div>
            
            <div className="testimonial-card">
              <div className="testimonial-header">
                <div className="author-avatar">
                  <div className="avatar-placeholder">JL</div>
                </div>
                <div className="author-info">
                  <strong>Jessica L.</strong>
                  <span>Content Creator • $1,800/month</span>
                  <div className="verification-badge">
                    <span className="checkmark">✓</span>
                    <span>Verified Creator</span>
                  </div>
                </div>
              </div>
              <div className="testimonial-content">
                <div className="rating">⭐⭐⭐⭐⭐</div>
                <p>"Finally, a way to monetize my eye for style without showing my body. I review 10-15 profiles per day and it's become my main income stream."</p>
                <div className="earnings-proof">
                  <span className="earnings-label">Last 30 days:</span>
                  <span className="earnings-amount">$1,800 earned</span>
                </div>
              </div>
            </div>
            
            <div className="testimonial-card">
              <div className="testimonial-header">
                <div className="author-avatar">
                  <div className="avatar-placeholder">MK</div>
                </div>
                <div className="author-info">
                  <strong>Maya K.</strong>
                  <span>Fashion Influencer • $3,200/month</span>
                  <div className="verification-badge">
                    <span className="checkmark">✓</span>
                    <span>Verified Creator</span>
                  </div>
                </div>
              </div>
              <div className="testimonial-content">
                <div className="rating">⭐⭐⭐⭐⭐</div>
                <p>"The guys actually listen to my advice and come back for more reviews. It's satisfying to help them improve while getting paid well for it."</p>
                <div className="earnings-proof">
                  <span className="earnings-label">Last 30 days:</span>
                  <span className="earnings-amount">$3,200 earned</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Enhanced Trust Signals */}
          <div className="trust-signals">
            <div className="trust-item">
              <div className="trust-icon">💳</div>
              <div className="trust-content">
                <strong>Instant Payments</strong>
                <span>Via Stripe • Same day</span>
              </div>
            </div>
            <div className="trust-item">
              <div className="trust-icon">🛡️</div>
              <div className="trust-content">
                <strong>Bank-Level Security</strong>
                <span>SSL encrypted • GDPR compliant</span>
              </div>
            </div>
            <div className="trust-item">
              <div className="trust-icon">⚡</div>
              <div className="trust-content">
                <strong>24/7 Support</strong>
                <span>Live chat • Email support</span>
              </div>
            </div>
            <div className="trust-item">
              <div className="trust-icon">📈</div>
              <div className="trust-content">
                <strong>Growing Fast</strong>
                <span>500+ new users this month</span>
              </div>
            </div>
          </div>
          
          {/* CTA After Social Proof */}
          <div className="social-proof-cta">
            <a href="/reviewers/apply" className="cta-primary">Join These Successful Creators</a>
            <p className="cta-note">Start earning in your first hour • No experience required</p>
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
                <span className="highlight">Only 47 founding spots left</span> • 
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


