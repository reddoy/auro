import React from 'react';

export default function Avatar({ src, alt, size = 48 }: { src?: string; alt: string; size?: number }) {
  const [error, setError] = React.useState(false);
  const [loading, setLoading] = React.useState(!!src);

  // Generate initials from alt text
  const initials = React.useMemo(() => {
    if (!alt) return '·';
    const parts = alt.trim().split(/\s+/).filter(Boolean);
    return parts.map(p => p[0]?.toUpperCase()).slice(0, 2).join('') || '·';
  }, [alt]);

  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    backgroundColor: '#2A1B3D', // Matches brand cardBackground
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    border: '2px solid #FF6F00',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
    position: 'relative',
  };

  if (src && !error) {
    return (
      <>
        {loading && (
          <div
            style={{
              position: 'absolute',
              width: size * 0.4,
              height: size * 0.4,
              border: `${size * 0.05}px solid rgba(255, 255, 255, 0.15)`,
              borderTop: `${size * 0.05}px solid rgba(255, 111, 0, 0.8)`,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              zIndex: 1,
            }}
            aria-hidden="true"
          />
        )}
        <img 
          src={src} 
          alt={alt} 
          style={{ ...style, objectFit: 'cover' }}
          onError={() => {
            setError(true);
            setLoading(false);
          }}
          onLoad={() => setLoading(false)}
          loading="lazy"
          role="img"
        />
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
      </>
    );
  }

  // Fallback to initials or Auro logo
  return (
    <div style={style} role="img" aria-label={alt || 'User avatar'}>
      {initials !== '·' ? (
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
      ) : (
        <img 
          src="/auro_aura_logo.png" 
          alt="Auro Logo" 
          style={{ 
            width: size * 0.6, 
            height: size * 0.6, 
            objectFit: 'cover',
            borderRadius: size * 0.18,
          }} 
        />
      )}
    </div>
  );
}

