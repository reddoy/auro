'use client';

import React, { useState } from 'react';

export default function BackLink() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div style={{ textAlign: 'center', marginTop: '20px' }}>
      <a 
        href="/reviewers"
        style={{
          color: 'white',
          textDecoration: 'none',
          fontSize: '16px',
          fontWeight: '600',
          opacity: isHovered ? '1' : '0.9',
          transition: 'opacity 0.3s ease'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        ← Browse All Reviewers
      </a>
    </div>
  );
}

