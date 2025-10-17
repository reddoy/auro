'use client';

import React from 'react';
import { supabase } from '../../lib/supabase';

export default function RequestButton({ slug, reviewerId }: { slug: string; reviewerId: string }) {
  const [loading, setLoading] = React.useState(false);
  
  const onClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Redirect to sign in page
        alert('Please sign in to request a review.');
        window.location.href = '/auth/signin';
        return;
      }

      // Check if user is trying to request from themselves
      if (user.id === reviewerId) {
        alert('You cannot request a review from yourself.');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 
          creatorSlug: slug,
          fallbackUserId: user.id,
          fallbackEmail: user.email
        }),
      });
      const json = await res.json();
      if (res.ok && json?.url) {
        window.location.href = json.url as string;
      } else {
        alert(json?.error || 'Failed to start checkout');
      }
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
        color: '#FF2D55',
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s ease',
        opacity: loading ? 0.7 : 1
      }}
      onMouseEnter={(e) => {
        if (!loading) {
          e.currentTarget.style.opacity = '0.9';
        }
      }}
      onMouseLeave={(e) => {
        if (!loading) {
          e.currentTarget.style.opacity = '1';
        }
      }}
    >
      {loading ? 'Loading...' : 'Request a Review'}
    </button>
  );
}

