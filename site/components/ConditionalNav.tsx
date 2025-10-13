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
  
  const spotsLeft = Math.max(0, 100 - count);
  const isNearFull = spotsLeft <= 10;
  const isFull = spotsLeft === 0;
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
      {/* Sign In - Always visible */}
      <a 
        href="https://app.appauro.com" 
        style={{
          color: 'white',
          textDecoration: 'none',
          fontWeight: '500',
          fontSize: '15px',
          transition: 'opacity 0.2s ease',
          cursor: 'pointer',
          opacity: 0.9
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.opacity = '0.9';
        }}
      >
        Sign In
      </a>
      
      {/* Become Reviewer button - hidden on apply page */}
      {!isOnApplyPage && (
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
      )}
    </div>
  );
}
