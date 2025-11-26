'use client';

import React from 'react';

export default function Avatar({ src, alt, size = 64 }: { src?: string | null; alt: string; size?: number }) {
  const [error, setError] = React.useState(false);
  const [loading, setLoading] = React.useState(!!src);
  const dimension = `${size}px`;
  const showImage = !!src && !error;

  // Generate initials from alt text
  const initials = React.useMemo(() => {
    if (!alt) return '·';
    const parts = alt.trim().split(/\s+/).filter(Boolean);
    return parts.map(p => p[0]?.toUpperCase()).slice(0, 2).join('') || '·';
  }, [alt]);

  return (
    <div 
      style={{ 
        width: dimension, 
        height: dimension, 
        borderRadius: '50%', 
        overflow: 'hidden', 
        background: '#2A1B3D', // Matches brand cardBackground
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px solid #FF6F00',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
        position: 'relative',
      }}
      role="img"
      aria-label={alt || 'User avatar'}
    >
      {loading && !error && (
        <div
          style={{
            position: 'absolute',
            width: size * 0.4,
            height: size * 0.4,
            border: `${size * 0.05}px solid rgba(255, 255, 255, 0.15)`,
            borderTop: `${size * 0.05}px solid rgba(255, 111, 0, 0.8)`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
          aria-hidden="true"
        />
      )}
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt={alt}
          width={size}
          height={size}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => {
            setError(true);
            setLoading(false);
          }}
          onLoad={() => setLoading(false)}
          loading="lazy"
        />
      ) : (
        <div
          style={{
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: size * 0.4,
            textAlign: 'center',
            lineHeight: 1,
          }}
          aria-label={`Initials: ${initials}`}
        >
          {initials}
        </div>
      )}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}


