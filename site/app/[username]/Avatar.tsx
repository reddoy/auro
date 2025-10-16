import React from 'react';

export default function Avatar({ src, alt, size = 48 }: { src?: string; alt: string; size?: number }) {
  const style = {
    width: size,
    height: size,
    borderRadius: '50%',
    backgroundColor: 'var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: size * 0.4,
    fontWeight: 'bold',
    color: 'var(--text-2)',
    overflow: 'hidden',
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
