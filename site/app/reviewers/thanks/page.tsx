'use client';

export default function ReviewerThanksPage() {
  return (
    <div className="container" style={{ padding: '40px 0' }}>
      <div className="success-card">
        <div className="success-icon">🎉</div>
        <h3>Thanks for becoming a reviewer!</h3>
        <p>You're all set. We'll reach out with next steps and update you when the app launches.</p>
        <div style={{ marginTop: 16 }}>
          <a href="/" className="btn-primary">Back to Home</a>
        </div>
      </div>
    </div>
  );
}


