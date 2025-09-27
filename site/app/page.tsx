'use client';

import { useState, useEffect } from 'react';
import CountdownTimer from '../components/CountdownTimer';
import ReviewerCounter from '../components/ReviewerCounter';
import { supabase } from '../lib/supabase';

export default function HomePage() {
  const [showRibbon, setShowRibbon] = useState(true);
  const [reviewerCount, setReviewerCount] = useState<number>(0);
  const [isLoadingCount, setIsLoadingCount] = useState<boolean>(true);

  useEffect(() => {
    const fetchReviewerCount = async () => {
      try {
        // Try to fetch from creators table, filtering for actual reviewers
        const { data, error } = await supabase
          .from('creators')
          .select('id', { count: 'exact' })
          .eq('is_reviewer', true);

        if (error) {
          // If creators table doesn't exist or has issues, try profiles table
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id', { count: 'exact' })
            .eq('is_reviewer', true);
          
          if (!profileError) {
            setReviewerCount(profileData?.length || 0);
          }
        } else {
          setReviewerCount(data?.length || 0);
        }
      } catch (err) {
        console.error('Error fetching reviewer count:', err);
      } finally {
        setIsLoadingCount(false);
      }
    };

    fetchReviewerCount();
    
    // Refresh count every 30 seconds
    const interval = setInterval(fetchReviewerCount, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Calculate dynamic text based on count
  const spotsLeft = Math.max(0, 100 - reviewerCount);
  const isNearFull = spotsLeft <= 10;
  const isFull = spotsLeft === 0;
  
  const getSubText = () => {
    if (isFull) return 'Spots Filled! 🎉';
    if (isNearFull) return `Only ${spotsLeft} left! ⚡`;
    return 'Join exclusive founding group';
  };

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
                <span className="phrase-1">Rate guys on</span><br />
                <span className="phrase-2">attractiveness, style & room.</span><br />
                <span className="phrase-3">Get paid.</span>
              </h1>
              <h1 className="mobile-only">
                <span className="phrase-1">Rate guys on</span><br />
                <span className="phrase-2">attractiveness, style & room.</span><br />
                <span className="phrase-3">Get paid.</span>
              </h1>
              
              {/* Subheadline */}
              <p className="sub desktop-only">Women reviewers rate men's photos, outfits, rooms, and social profiles (1-5 scale). Give advice, get paid, and optionally post reviews to build your brand.</p>
              <p className="sub mobile-only">Women reviewers rate men's photos, outfits, rooms, and social profiles (1-5 scale). Give advice, get paid, and optionally post reviews to build your brand.</p>
              
              {/* Trust Indicators */}
              <div className="hero-trust">
                <div className="trust-item">
                  <span className="trust-icon">⚡</span>
                  <span className="trust-text">Launching October 15th</span>
                </div>
                <div className="trust-item">
                  <span className="trust-icon">🎯</span>
                  <span className="trust-text">First 100 reviewers only</span>
                </div>
              </div>
              
              {/* Integrated CTA with Counter */}
              <div className="hero-cta-integrated desktop-only">
                <a className="cta-hero-integrated" href="/reviewers/apply">
                  <div className="cta-count-section">
                    {isLoadingCount ? (
                      <span className="cta-loading">Loading...</span>
                    ) : (
                      <>
                        <span className="cta-count-number fade-in">{reviewerCount}</span>
                        <span className="cta-count-separator fade-in">/</span>
                        <span className="cta-count-max fade-in">100</span>
                      </>
                    )}
                  </div>
                  <div className="cta-text-section">
                    <span className="cta-main-text">Become Founding Reviewer</span>
                    {isLoadingCount ? (
                      <span className="cta-loading">Loading...</span>
                    ) : (
                      <span className="cta-sub-text fade-in">{getSubText()}</span>
                    )}
                  </div>
                </a>
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
            <div className="hero-cta-integrated mobile-only" style={{ marginTop: 24 }}>
              <a className="cta-hero-integrated" href="/reviewers/apply">
                <div className="cta-count-section">
                  {isLoadingCount ? (
                    <span className="cta-loading">Loading...</span>
                  ) : (
                    <>
                      <span className="cta-count-number fade-in">{reviewerCount}</span>
                      <span className="cta-count-separator fade-in">/</span>
                      <span className="cta-count-max fade-in">100</span>
                    </>
                  )}
                </div>
                <div className="cta-text-section">
                  <span className="cta-main-text">Become Founding Reviewer</span>
                  {isLoadingCount ? (
                    <span className="cta-loading">Loading...</span>
                  ) : (
                    <span className="cta-sub-text fade-in">{getSubText()}</span>
                  )}
                </div>
              </a>
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
          <h2 className="showcase-title">Rate men's attractiveness, style, and rooms. Give advice. Get paid.</h2>
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
                <p>Set your own price per review and share your Auro profile link on social media. Guys pay through your link and request reviews.</p>
                <div className="step-benefits">
                  <span className="benefit-tag">💰 You set your rates</span>
                  <span className="benefit-tag">📱 Share on Instagram/TikTok</span>
                </div>
              </div>
            </div>
            
            <div className="process-connector"></div>
            
            <div className="process-step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Rate & Give Advice</h3>
                <p>Accept requests and rate men on attractiveness, style, room, and social profiles (Hinge/Tinder/Instagram) from 1-5. Give specific advice on what they could improve.</p>
                <div className="step-benefits">
                  <span className="benefit-tag">📊 Rate 1-5 scale</span>
                  <span className="benefit-tag">💡 Give improvement advice</span>
                </div>
              </div>
            </div>
            
            <div className="process-connector"></div>
            
            <div className="process-step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Get Paid & Build Your Brand</h3>
                <p>Get paid instantly after your review. If the guy consents, you can post the review to social media to build your brand and attract more review requests.</p>
                <div className="step-benefits">
                  <span className="benefit-tag">💳 Instant payments</span>
                  <span className="benefit-tag">📸 Build your brand</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Supporting Benefits Grid */}
          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon">⏰</div>
              <h4>Work Your Schedule</h4>
              <p>Review profiles whenever you want - mornings, evenings, weekends</p>
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
          <p className="section-subtitle">Get paid to share your opinions on men's style and presentation</p>
          
          {/* Value Props */}
          <div className="value-props">
            <div className="value-card">
              <div className="value-icon">💰</div>
              <h3>Set Your Own Rates</h3>
              <p>You control your pricing. Charge what you think your expertise is worth. Founding members keep 85% (vs 80% for regular members) - guaranteed for life.</p>
            </div>
            <div className="value-card">
              <div className="value-icon">🚀</div>
              <h3>Founding Member Perks</h3>
              <p>Get founding reviewer badge, higher recommendation priority, direct founder access, and help shape the community from day one.</p>
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
              <div className="trust-icon">⚡</div>
              <div className="trust-content">
                <strong>Founding Support</strong>
                <span>Direct founder access • Priority help</span>
              </div>
            </div>
          </div>
          
          {/* CTA After Value Props */}
          <div className="social-proof-cta">
            <a href="/reviewers/apply" className="cta-primary">Become a Founding Reviewer</a>
            <p className="cta-note">Join the first 100 • Shape the platform • Launch October 15th</p>
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
                I'm RJ, founder of Auro. This is where women reviewers get paid to rate men and help them improve.
              </p>
              <p>
                On Auro, women reviewers rate men on attractiveness, style, room, and social profiles (1-5 scale), give advice on improvements, and get paid for their expertise. Reviews can be posted to social media to build the reviewer's brand.
              </p>
              <p>
                We're building a community where women's opinions on men's presentation are valued and monetized. As a founding reviewer, you'll get reduced platform fees (85% vs 80%), exclusive status, and direct founder access.
              </p>
              <p>
                Join the first 100 founding reviewers and lock in these benefits for life.
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
                maxReviewers={100}
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
            <p>Join the first 100 reviewers and lock in these exclusive benefits forever:</p>
            
            <div className="founding-benefits">
              <div className="benefit-item featured">
                <span className="benefit-icon">🎯</span>
                <div className="benefit-content">
                  <strong>Reduced Platform Fee</strong>
                  <span>Keep 85% of earnings (vs 80% for regular members) - guaranteed for life</span>
                </div>
              </div>
              <div className="benefit-item featured">
                <span className="benefit-icon">💎</span>
                <div className="benefit-content">
                  <strong>Founding Reviewer Badge</strong>
                  <span>Higher recommendation priority and exclusive status</span>
                </div>
              </div>
              <div className="benefit-item featured">
                <span className="benefit-icon">🚀</span>
                <div className="benefit-content">
                  <strong>Direct Founder Access</strong>
                  <span>Priority support and help shape the community</span>
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


