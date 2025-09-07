'use client';

import React from 'react';

export default function Avatar({ src, alt, size = 64 }: { src?: string | null; alt: string; size?: number }) {
  const [error, setError] = React.useState(false);
  const dimension = `${size}px`;
  const showImage = !!src && !error;
  return (
    <div style={{ width: dimension, height: dimension, borderRadius: 12, overflow: 'hidden', background: '#780882' }}>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt={alt}
          width={size}
          height={size}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setError(true)}
        />
      ) : null}
    </div>
  );
}


