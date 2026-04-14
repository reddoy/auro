'use client';

import React from 'react';

export default function RequestButton({ slug }: { slug: string }) {
  const [loading, setLoading] = React.useState(false);
  const onClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // Redirect to the request flow instead of calling API directly
      // This allows anonymous users to start the process
      window.location.href = `/waitlist?creatorSlug=${encodeURIComponent(slug)}`;
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
        padding: '16px 24px',
        fontSize: '18px',
        fontWeight: '700',
        border: 'none',
        borderRadius: '12px',
        background: 'white',
        color: '#667eea',
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s ease',
        opacity: loading ? 0.7 : 1
      }}
      onMouseEnter={(e) => {
        if (!loading) {
          e.currentTarget.style.transform = 'scale(1.05)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {loading ? '✨ Loading...' : '🎯 Join Waitlist'}
    </button>
  );
}

