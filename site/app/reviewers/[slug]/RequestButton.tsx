'use client';

import React from 'react';

export default function RequestButton({ slug, reviewerId }: { slug: string; reviewerId: string }) {
  const [loading, setLoading] = React.useState(false);
  
  const onClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // Redirect to the request flow instead of checking authentication
      // This allows anonymous users to start the process
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
        padding: 'clamp(16px, 4vw, 20px) clamp(24px, 6vw, 32px)',
        fontSize: 'clamp(18px, 4vw, 22px)',
        fontWeight: '800',
        border: 'none',
        borderRadius: '16px',
        background: 'white',
        color: '#FF2D55',
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s ease',
        opacity: loading ? 0.7 : 1,
        boxShadow: '0 4px 20px rgba(255, 255, 255, 0.3)',
        textTransform: 'none',
        letterSpacing: '0.5px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        minHeight: '56px'
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
      {loading ? (
        <>
          <div style={{
            width: '20px',
            height: '20px',
            border: '2px solid rgba(255, 45, 85, 0.3)',
            borderTop: '2px solid #FF2D55',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          Loading...
        </>
      ) : (
        <>
          <span style={{ fontSize: '20px' }}>🎯</span>
          Request a Review
        </>
      )}
    </button>
  );
}

