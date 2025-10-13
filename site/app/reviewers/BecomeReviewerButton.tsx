'use client';

import React, { useState } from 'react';

export default function BecomeReviewerButton() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div style={{ marginTop: '30px' }}>
      <a 
        href="/reviewers/apply"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '14px 28px',
          fontSize: '16px',
          fontWeight: '600',
          border: '2px solid white',
          borderRadius: '30px',
          background: isHovered ? 'white' : 'transparent',
          color: isHovered ? '#0c0325' : 'white',
          textDecoration: 'none',
          transition: 'all 0.3s ease',
          boxShadow: '0 4px 20px rgba(255, 255, 255, 0.1)'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        ✨ Become a Reviewer
      </a>
    </div>
  );
}

