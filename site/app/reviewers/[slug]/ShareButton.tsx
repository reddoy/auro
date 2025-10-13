'use client';

import React, { useState } from 'react';
import { Share2, Check, Copy } from 'lucide-react';

interface ShareButtonProps {
  slug: string;
  displayName: string;
}

export default function ShareButton({ slug, displayName }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const url = typeof window !== 'undefined' 
    ? window.location.href 
    : `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.appauro.com'}/reviewers/${slug}`;

  const shareText = `Check out my Auro reviewer profile! Get honest reviews from me at`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareToSocial = (platform: 'twitter' | 'facebook' | 'linkedin') => {
    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(shareText);

    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
    };

    window.open(urls[platform], '_blank', 'width=600,height=400');
    setShowMenu(false);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${displayName} - Auro`,
          text: shareText,
          url: url
        });
        setShowMenu(false);
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      setShowMenu(!showMenu);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={handleNativeShare}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 20px',
          fontSize: '14px',
          fontWeight: '600',
          border: '1px solid rgba(255,111,0,0.3)',
          borderRadius: '25px',
          background: 'rgba(255,111,0,0.1)',
          color: '#FFFFFF',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,111,0,0.2)';
          e.currentTarget.style.borderColor = 'rgba(255,111,0,0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,111,0,0.1)';
          e.currentTarget.style.borderColor = 'rgba(255,111,0,0.3)';
        }}
      >
        <Share2 size={16} />
        Share Profile
      </button>

      {/* Share Menu (for desktop) */}
      {showMenu && (
        <>
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999
            }}
            onClick={() => setShowMenu(false)}
          />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginTop: '10px',
              background: 'white',
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              padding: '12px',
              minWidth: '200px',
              zIndex: 1000
            }}
          >
            <button
              onClick={copyToClipboard}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                fontSize: '14px',
                fontWeight: '600',
                border: 'none',
                borderRadius: '12px',
                background: copied ? '#10b981' : '#f3f4f6',
                color: copied ? 'white' : '#1a1a1a',
                cursor: 'pointer',
                marginBottom: '8px',
                transition: 'all 0.3s ease'
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>

            <button
              onClick={() => shareToSocial('twitter')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                fontSize: '14px',
                fontWeight: '600',
                border: 'none',
                borderRadius: '12px',
                background: '#f3f4f6',
                color: '#1a1a1a',
                cursor: 'pointer',
                marginBottom: '8px',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#1DA1F2';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f3f4f6';
                e.currentTarget.style.color = '#1a1a1a';
              }}
            >
              𝕏 Share on X
            </button>

            <button
              onClick={() => shareToSocial('facebook')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                fontSize: '14px',
                fontWeight: '600',
                border: 'none',
                borderRadius: '12px',
                background: '#f3f4f6',
                color: '#1a1a1a',
                cursor: 'pointer',
                marginBottom: '8px',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#4267B2';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f3f4f6';
                e.currentTarget.style.color = '#1a1a1a';
              }}
            >
              📘 Share on Facebook
            </button>

            <button
              onClick={() => shareToSocial('linkedin')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                fontSize: '14px',
                fontWeight: '600',
                border: 'none',
                borderRadius: '12px',
                background: '#f3f4f6',
                color: '#1a1a1a',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#0077B5';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f3f4f6';
                e.currentTarget.style.color = '#1a1a1a';
              }}
            >
              💼 Share on LinkedIn
            </button>
          </div>
        </>
      )}
    </div>
  );
}

