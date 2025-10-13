'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function ConditionalNav() {
  const pathname = usePathname();
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  
  // Hide the "Become a Founding Reviewer" button when on the apply page or its sub-pages
  const isOnApplyPage = pathname?.startsWith('/reviewers/apply') || pathname?.startsWith('/reviewers/thanks');
  
  useEffect(() => {
    const fetchReviewerCount = async () => {
      try {
        setLoading(true);
        
        // Try profiles table first since creators might not exist yet
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id', { count: 'exact' })
          .eq('is_reviewer', true);
        
        if (!profileError && profileData) {
          setCount(profileData.length || 0);
          setLoading(false);
          return;
        }

        // Fallback to creators table
        const { data, error } = await supabase
          .from('creators')
          .select('id', { count: 'exact' })
          .eq('is_reviewer', true);

        if (!error && data) {
          setCount(data.length || 0);
        }
      } catch (err) {
        console.error('Error fetching reviewer count:', err);
        // Silently fail - default to 0
      } finally {
        setLoading(false);
      }
    };

    fetchReviewerCount();
    
    // Refresh count every 30 seconds
    const interval = setInterval(fetchReviewerCount, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  if (isOnApplyPage) {
    return null;
  }
  
  const spotsLeft = Math.max(0, 100 - count);
  const isNearFull = spotsLeft <= 10;
  const isFull = spotsLeft === 0;
  
  return (
    <div className="nav-cta-group desktop-only">
      <a 
        href="https://app.appauro.com" 
        className="sign-in-btn"
        style={{
          padding: '10px 20px',
          marginRight: '12px',
          borderRadius: '8px',
          backgroundColor: 'transparent',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          color: 'white',
          textDecoration: 'none',
          fontWeight: '600',
          fontSize: '14px',
          transition: 'all 0.3s ease',
          display: 'inline-block',
          cursor: 'pointer'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        }}
      >
        Sign In
      </a>
      <a className="cta-nav-integrated" href="/reviewers/apply">
        <div className="cta-count-section">
          <span className="cta-count-number">{count}</span>
          <span className="cta-count-separator">/</span>
          <span className="cta-count-max">100</span>
        </div>
        <div className="cta-text-section">
          <span className="cta-main-text">Become Founding Reviewer</span>
          {isFull ? (
            <span className="cta-sub-text">Spots Filled! 🎉</span>
          ) : isNearFull ? (
            <span className="cta-sub-text">Only {spotsLeft} left! ⚡</span>
          ) : (
            <span className="cta-sub-text">Join exclusive founding group</span>
          )}
        </div>
      </a>
    </div>
  );
}
