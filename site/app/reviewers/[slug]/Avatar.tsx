import React from 'react';

export default function Avatar({ src, alt, size = 48 }: { src?: string; alt: string; size?: number }) {
  const style = {
    width: size,
    height: size,
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 111, 0, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    border: '2px solid rgba(255, 111, 0, 0.3)',
    boxShadow: '0 4px 12px rgba(255, 111, 0, 0.2)',
  };

  if (src) {
    return <img src={src} alt={alt} style={{ ...style, objectFit: 'cover' }} />;
  }

  // Fallback to Auro logo
  return (
    <div style={style}>
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
    </div>
  );
}

