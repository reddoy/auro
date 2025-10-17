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
    fontSize: size * 0.4,
    fontWeight: '800',
    color: '#FF6F00',
    overflow: 'hidden',
    border: '2px solid rgba(255, 111, 0, 0.3)',
    boxShadow: '0 4px 12px rgba(255, 111, 0, 0.2)',
  };

  if (src) {
    return <img src={src} alt={alt} style={{ ...style, objectFit: 'cover' }} />;
  }

  // Fallback to initials
  const initials = alt
    .split(' ')
    .map(name => name[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return <div style={style}>{initials}</div>;
}

