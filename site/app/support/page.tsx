'use client';

import { useState } from 'react';

function EmailLink() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <a 
      href="mailto:rj@appauro.com" 
      style={{ 
        color: 'white', 
        fontSize: '18px',
        fontWeight: '600',
        textDecoration: 'none',
        padding: '12px 24px',
        background: '#F26955',
        borderRadius: '8px',
        display: 'inline-block',
        transition: 'transform 0.2s, box-shadow 0.2s',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: isHovered ? '0 8px 16px rgba(255, 107, 53, 0.3)' : 'none'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      📧 rj@appauro.com
    </a>
  );
}

export default function SupportPage() {
  return (
    <main className="container" style={{ padding: '40px 0' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <h1 className="section-title" style={{ marginBottom: 24 }}>Support & Feedback</h1>
        
        <div style={{ lineHeight: 1.8, color: 'white' }}>
          <p style={{ fontSize: '18px', marginBottom: 32, color: 'var(--text-2)' }}>
            Need help? Have feedback? I'd love to hear from you!
          </p>
          
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.05)', 
            borderRadius: '12px', 
            padding: '32px', 
            marginBottom: 32,
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h2 style={{ color: 'white', marginBottom: 16, fontSize: '24px' }}>Get in Touch</h2>
            <p style={{ marginBottom: 24, fontSize: '16px' }}>
              I'm RJ, the founder of Auro. Whether you have a question, found a bug, or just want to share your thoughts, 
              I personally read every email and would love to hear from you.
            </p>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <EmailLink />
            </div>
          </div>

          <div style={{ marginTop: 40 }}>
            <h2 style={{ color: 'white', marginBottom: 16, fontSize: '20px' }}>What can I help with?</h2>
            <ul style={{ marginLeft: 20, marginBottom: 24, fontSize: '16px' }}>
              <li style={{ marginBottom: 12 }}>Technical issues or bugs</li>
              <li style={{ marginBottom: 12 }}>Questions about how Auro works</li>
              <li style={{ marginBottom: 12 }}>Payment or account issues</li>
              <li style={{ marginBottom: 12 }}>Feature requests and suggestions</li>
              <li style={{ marginBottom: 12 }}>General feedback about your experience</li>
            </ul>
          </div>

          <div style={{ 
            marginTop: 40,
            padding: '24px',
            background: 'rgba(255, 107, 53, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 107, 53, 0.2)'
          }}>
            <p style={{ fontSize: '16px', margin: 0, color: 'var(--text-2)' }}>
              <strong style={{ color: 'white' }}>Response Time:</strong> I typically respond within 24-48 hours. 
              For urgent issues, please include "URGENT" in your subject line.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}


