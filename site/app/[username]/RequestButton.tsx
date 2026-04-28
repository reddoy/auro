'use client';

import React from 'react';

export default function RequestButton({ slug, reviewerId }: { slug: string; reviewerId: string }) {
  const [loading, setLoading] = React.useState(false);
  
  const onClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      window.location.href = `/request?creatorSlug=${encodeURIComponent(slug)}`;
    } catch (e: any) {
      alert(e?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={onClick} 
      disabled={loading} 
      style={{ 
        width: '100%',
        padding: '18px 32px',
        fontSize: '20px',
        fontWeight: '800',
        border: 'none',
        borderRadius: '16px',
        background: 'white',
        color: '#F26955',
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s ease',
        opacity: loading ? 0.7 : 1,
        boxShadow: '0 4px 20px rgba(255, 255, 255, 0.3)',
        textTransform: 'none',
        letterSpacing: '0.5px'
      }}
      onMouseEnter={(e) => {
        if (!loading) {
          e.currentTarget.style.opacity = '0.9';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 25px rgba(255, 255, 255, 0.4)';
        }
      }}
      onMouseLeave={(e) => {
        if (!loading) {
          e.currentTarget.style.opacity = '1';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(255, 255, 255, 0.3)';
        }
      }}
    >
      {loading ? 'Loading...' : 'Request a review'}
    </button>
  );
}

