'use client';

import { useEffect, useState } from 'react';

export default function HomePage() {
  const [isIOSTraffic, setIsIOSTraffic] = useState(false);
  const SHOW_TESTIMONIALS = false; // Toggle on when ready to show

  useEffect(() => {
    // Check URL for iOS app flag
    const urlParams = new URLSearchParams(window.location.search);
    const isFromIOSApp = urlParams.get('src') === 'ios';
    setIsIOSTraffic(isFromIOSApp);
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <section className="hero">
        <div className="bg-glow"></div>
        <div className="container">
          <div className="hero__inner">
            <div className="hero__copy">
              <h1>Your Glow-Up, Made Easy.</h1>
              <ul className="hero__bullets">
                <li>Upload your photos.</li>
                <li>Get honest feedback from real creators.</li>
                <li>Feel your best.</li>
              </ul>
              <div className="cta-buttons">
                <a href="/reviewers/apply" className="cta-secondary cta-secondary--bright" style={{ marginLeft: 12 }}>Become a Founding Reviewer</a>
              </div>
            </div>
            <div className="hero__media">
              <figure className="screenshot-9x16">
                <img src="/auro_aura_logo.png" alt="Auro web app screenshot" />
              </figure>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <h2 className="section-title">Why Choose Auro?</h2>
          {/* Each feature becomes a full-screen snap slide */}
          <div className="features-grid">
            <div className="snap-slide">
              <div className="feature-card">
              <div className="feature-icon">⭐</div>
              <h3>Honest Ratings</h3>
              <p>Get unbiased feedback on your attractiveness, style, and room setup from real female influencers.</p>
              </div>
            </div>
            <div className="snap-slide">
              <div className="feature-card">
              <div className="feature-icon">👗</div>
              <h3>Style Advice</h3>
              <p>Receive personalized wardrobe recommendations and styling tips to enhance your overall look.</p>
              </div>
            </div>
            <div className="snap-slide">
              <div className="feature-card">
              <div className="feature-icon">🏠</div>
              <h3>Room Setup</h3>
              <p>Transform your living space with expert advice on decor, lighting, and arrangement.</p>
              </div>
            </div>
            <div className="snap-slide">
              <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3>Easy to Use</h3>
              <p>Simple mobile app interface makes requesting and receiving reviews effortless.</p>
              </div>
            </div>
            <div className="snap-slide">
              <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Secure & Private</h3>
              <p>Your photos and personal information are kept completely confidential and secure.</p>
              </div>
            </div>
            <div className="snap-slide">
              <div className="feature-card">
              <div className="feature-icon">💬</div>
              <h3>Detailed Feedback</h3>
              <p>Get comprehensive reviews with specific suggestions for improvement in every area.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          <div className="steps">
            <div className="step snap-slide">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Upload Photos</h3>
                <p>Take or upload photos of yourself, your outfits, and your room setup through our mobile app.</p>
              </div>
            </div>
            <div className="step snap-slide">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Choose Your Reviewer</h3>
                <p>Select from our network of verified female influencers based on their specialty and style.</p>
              </div>
            </div>
            <div className="step snap-slide">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Get Your Review</h3>
                <p>Receive detailed feedback with ratings out of 10 and specific improvement suggestions.</p>
              </div>
            </div>
            <div className="step snap-slide">
              <div className="step-number">4</div>
              <div className="step-content">
                <h3>Level Up</h3>
                <p>Apply the feedback and see improvements in your dating life and overall confidence.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section (hidden for now, keep layout for later) */}
      {SHOW_TESTIMONIALS && (
        <section className="social-proof">
          <div className="container">
            <h2 className="section-title">What Our Users Say</h2>
            <div className="testimonials">
              <div className="testimonial">
                <div className="rating">⭐⭐⭐⭐⭐</div>
                <p>"Got amazing feedback on my style and room setup. Finally understand what women actually find attractive!"</p>
                <div className="author">- Mike, 28</div>
              </div>
              <div className="testimonial">
                <div className="rating">⭐⭐⭐⭐⭐</div>
                <p>"The wardrobe advice was spot on. Matched with 3x more women after following the suggestions."</p>
                <div className="author">- Jake, 25</div>
              </div>
              <div className="testimonial">
                <div className="rating">⭐⭐⭐⭐⭐</div>
                <p>"Honest, detailed feedback that actually helped. Worth every penny for the confidence boost alone."</p>
                <div className="author">- David, 31</div>
              </div>
            </div>
            {/* Stats section removed per request */}
          </div>
        </section>
      )}

      {/* CTA section removed per request */}

      {/* About RJ Section */}
      <section className="about snap-section">
        <div className="container">
          <h2 className="section-title">Why I started Auro</h2>
          <div className="about__content" style={{ display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', textAlign: 'center' }}>
            <img src="/rj-headshot.jpg" alt="RJ headshot" style={{ width: 160, height: 160, objectFit: 'cover', borderRadius: 12 }} />
            <div className="about__text" style={{ maxWidth: 720, textAlign: 'center' }}>
              <p>
                Hey, I’m RJ 👋. I started Auro because a lot of us want honest feedback on how we look, dress, and carry ourselves—but it’s not always easy to ask for it. Growing up, I’d get tips here and there from my mom and sister (shoutout to them 😅), but I wanted a way to get real, straightforward advice from people who actually live this stuff every day.
              </p>
              <p>
                That’s what Auro is about: connecting fans with creators who know style, confidence, and presentation inside and out. Whether it’s polishing your look, leveling up your vibe, or just seeing yourself through a fresh lens—Auro makes it easy to get advice that actually helps you feel and look your best.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}


