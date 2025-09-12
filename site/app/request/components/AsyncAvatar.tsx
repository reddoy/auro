"use client";

import React from 'react';
import { getDisplayAvatarUrl } from '../../../lib/avatar';

type Props = {
  avatarPathOrUrl?: string | null;
  alt: string;
  size?: number;
};

export default function AsyncAvatar({ avatarPathOrUrl, alt, size = 64 }: Props) {
  const [src, setSrc] = React.useState<string | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    async function resolve() {
      try {
        const url = await getDisplayAvatarUrl(avatarPathOrUrl || null);
        if (!cancelled) {
          setSrc(url);
          setError(false);
        }
      } catch {
        if (!cancelled) {
          setSrc(null);
          setError(true);
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
    <div
      style={{
        width: dimension,
        height: dimension,
        borderRadius: '50%',
        overflow: 'hidden',
        background: 'var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.4,
        fontWeight: 'bold',
        color: 'var(--text-2)'
      }}
    >
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
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}


