export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="hero">
        <div className="bg-glow"></div>
        <div className="container">
          <div className="hero__inner">
            <div className="hero__copy">
              <h1>Get Reviewed by Influencer Women</h1>
              <p className="sub">
                Level up your attractiveness, style, and room setup with honest feedback from popular female influencers. 
                Get personalized ratings and actionable advice to improve your dating life.
              </p>
              <div className="cta">
                <input type="email" placeholder="Enter your email" />
                <button>Get Early Access</button>
              </div>
              <p className="legal">Join thousands of men already improving themselves with Auro</p>
            </div>
            <div className="hero__phones">
              <div className="phone phone--left">
                <img src="/auro_aura_logo.png" alt="Auro app screenshot showing review request interface" />
              </div>
              <div className="phone phone--right">
                <img src="/auro_aura_logo.png" alt="Auro app screenshot showing review feedback" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <h2 className="section-title">Why Choose Auro?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">⭐</div>
              <h3>Honest Ratings</h3>
              <p>Get unbiased feedback on your attractiveness, style, and room setup from real female influencers.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">👗</div>
              <h3>Style Advice</h3>
              <p>Receive personalized wardrobe recommendations and styling tips to enhance your overall look.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🏠</div>
              <h3>Room Setup</h3>
              <p>Transform your living space with expert advice on decor, lighting, and arrangement.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3>Easy to Use</h3>
              <p>Simple mobile app interface makes requesting and receiving reviews effortless.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Secure & Private</h3>
              <p>Your photos and personal information are kept completely confidential and secure.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💬</div>
              <h3>Detailed Feedback</h3>
              <p>Get comprehensive reviews with specific suggestions for improvement in every area.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Upload Photos</h3>
                <p>Take or upload photos of yourself, your outfits, and your room setup through our mobile app.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Choose Your Reviewer</h3>
                <p>Select from our network of verified female influencers based on their specialty and style.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Get Your Review</h3>
                <p>Receive detailed feedback with ratings out of 10 and specific improvement suggestions.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <div className="step-content">
                <h3>Level Up</h3>
                <p>Apply the feedback and see improvements in your dating life and overall confidence.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
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
          <div className="stats">
            <div className="stat">
              <div className="stat-number">10,000+</div>
              <div className="stat-label">Reviews Completed</div>
            </div>
            <div className="stat">
              <div className="stat-number">95%</div>
              <div className="stat-label">Satisfaction Rate</div>
            </div>
            <div className="stat">
              <div className="stat-number">4.8</div>
              <div className="stat-label">Average Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to Level Up Your Game?</h2>
            <p>Join thousands of men who have already improved their attractiveness and confidence with Auro.</p>
            <div className="cta-buttons">
              <button className="cta-primary">Download for iOS</button>
              <button className="cta-secondary">Download for Android</button>
            </div>
            <p className="cta-note">Available on App Store and Google Play</p>
          </div>
        </div>
      </section>
    </>
  );
}


