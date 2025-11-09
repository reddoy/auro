"use client";

import React from 'react';
import { getDisplayAvatarUrl } from '../../../lib/avatar';

type Props = {
  avatarPathOrUrl?: string | null;
  alt: string;
  size?: number;
};

// Loading spinner component
function LoadingSpinner({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size * 0.4,
        height: size * 0.4,
        border: `${size * 0.05}px solid rgba(255, 255, 255, 0.15)`,
        borderTop: `${size * 0.05}px solid rgba(255, 255, 255, 0.6)`,
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }}
    />
  );
}

export default function AsyncAvatar({ avatarPathOrUrl, alt, size = 64 }: Props) {
  const [src, setSrc] = React.useState<string | null>(null);
  const [error, setError] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    async function resolve() {
      try {
        setLoading(true);
        const url = await getDisplayAvatarUrl(avatarPathOrUrl || null);
        if (!cancelled) {
          setSrc(url);
          setError(false);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setSrc(null);
          setError(true);
          setLoading(false);
        }
      }
    }
    resolve();
    return () => {
      cancelled = true;
    };
  }, [avatarPathOrUrl]);

  const dimension = `${size}px`;
  const showImage = !!src && !error;

  const initials = React.useMemo(() => {
    return (alt || '')
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [alt]);

  return (
    <>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div
        style={{
          width: dimension,
          height: dimension,
          borderRadius: '50%',
          overflow: 'hidden',
          background: 'rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 4px 12px rgba(12, 3, 37, 0.25)'
        }}
      >
        {loading ? (
          <LoadingSpinner size={size} />
        ) : showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src!}
            alt={alt}
            width={size}
            height={size}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={() => setError(true)}
          />
        ) : (
          <img 
            src="/auro_aura_logo_nobg.png" 
            alt="Auro Logo" 
            style={{ 
              width: size * 0.6, 
              height: size * 0.6, 
              objectFit: 'contain' 
            }} 
          />
        )}
      </div>
    </>
  );
}


