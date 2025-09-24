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

      {/* How It Works */}
      <section id="how-it-works" className="how-it-works">
        <div className="container">
          <h2 className="section-title">How it works</h2>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Set your own rate & schedule</h3>
              </div>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Record short reviews right in the app</h3>
              </div>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Make a real impact with practical advice</h3>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reviewer Benefits */}
      <section className="features">
        <div className="container">
          <h2 className="section-title">Why Review on Auro</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">💸</div>
              <h3>Monetize Your Taste</h3>
              <p>Turn your eye for style and presentation into income with flexible reviews.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⏱️</div>
              <h3>Flexible & Fast</h3>
              <p>Short video reviews on your schedule — all in one app.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>Real Impact</h3>
              <p>Help fans improve their photos, rooms, and profiles to get better results.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Private & Secure</h3>
              <p>Content is kept private and secure — safety and respect first.</p>
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


