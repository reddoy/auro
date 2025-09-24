'use client';

import { useState } from 'react';

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
              <p className="sub desktop-only">Share quick video reviews and help fans improve their style, photos, and vibe.</p>
              <div className="cta-buttons desktop-only">
                <a href="/reviewers/apply" className="cta-primary">Become a Founding Reviewer</a>
              </div>
            </div>

            <div className="hero__media desktop-only">
              <img className="hero-phone" src="/iphone-mockup.png" alt="iPhone app mockup" />
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
          <h2 className="showcase-title">Share quick video reviews and help fans improve their style, photos, and vibe.</h2>
          <div className="iphone-mockup-container">
            <img className="iphone-mockup" src="/iphone-mockup.png" alt="iPhone app mockup" />
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
              <div className="feature-icon">🎯</div>
              <h3>Choose Your Requests</h3>
              <p>Accept or decline any review request. Review selfies, outfits, rooms, Instagram profiles, Hinge profiles — whatever you're comfortable with.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3>Record & Share</h3>
              <p>Record short video reviews right in the app. Quick, honest feedback that helps guys actually improve their presentation.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">✨</div>
              <h3>Make Real Impact</h3>
              <p>Help guys glow up with your advice. Your perspective on style, confidence, and presentation can genuinely change their results.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⏰</div>
              <h3>Your Schedule</h3>
              <p>Review when it works for you. No commitments, no pressure — just flexible income on your terms.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Private & Secure</h3>
              <p>All content stays private and secure. Safety and respect are our top priorities.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Founder */}
      <section className="about">
        <div className="container">
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', textAlign: 'center' }}>
            <h2 className="section-title" style={{ width: '100%', marginTop: 0 }}>Why I started Auro</h2>
            <img src="/rj-headshot.jpg" alt="RJ headshot" style={{ width: 160, height: 160, objectFit: 'cover', borderRadius: 12 }} />
            <div className="about__text" style={{ maxWidth: 720, textAlign: 'center' }}>
              <p>
                Hey, I’m RJ 👋. I built Auro to make it easy to get real, honest feedback from creators who live this stuff every day — style, confidence, presentation.
              </p>
              <p>
                Reviewers on Auro help fans level up with practical advice that actually moves the needle. If that sounds like you, I’d love for you to be part of the founding group.
              </p>
              {/* Removed extra CTA per request */}
            </div>
          </div>
        </div>
      </section>

      {/* Sticky bottom ribbon removed per request */}
    </div>
  );
}


