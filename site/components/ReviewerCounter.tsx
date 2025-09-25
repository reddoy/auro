'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface ReviewerCounterProps {
  maxReviewers?: number;
  className?: string;
}

export default function ReviewerCounter({ maxReviewers = 50, className = '' }: ReviewerCounterProps) {
  const [count, setCount] = useState<number>(0); // Start with 0 instead of null
  const [loading, setLoading] = useState(false); // Don't show loading initially
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReviewerCount = async () => {
      try {
        setError(null);
        
        // Try to fetch from creators table, filtering for actual reviewers
        const { data, error } = await supabase
          .from('creators')
          .select('id', { count: 'exact' })
          .eq('is_reviewer', true);

        if (error) {
          console.error('Error fetching reviewer count:', error);
          // If creators table doesn't exist or has issues, try profiles table
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id', { count: 'exact' })
            .eq('is_reviewer', true);
          
          if (profileError) {
            console.error('Error fetching from profiles table:', profileError);
            setError('Database connection issue');
            // Keep current count instead of resetting to 0
          } else {
            setCount(profileData?.length || 0);
          }
        } else {
          setCount(data?.length || 0);
        }
      } catch (err) {
        console.error('Error fetching reviewer count:', err);
        setError('Connection failed');
        // Keep current count instead of resetting to 0
      }
    };

    fetchReviewerCount();
    
    // Refresh count every 30 seconds
    const interval = setInterval(fetchReviewerCount, 30000);
    
    return () => clearInterval(interval);
  }, []);


  // Always show the current count, even if there's an error
  const currentCount = count || 0;
  const spotsLeft = Math.max(0, maxReviewers - currentCount);
  const isNearFull = spotsLeft <= 10;
  const isFull = spotsLeft === 0;

  return (
    <div className={`reviewer-counter ${className} ${isNearFull ? 'near-full' : ''} ${isFull ? 'full' : ''}`}>
      <div className="counter-display">
        <span className="counter-current">{currentCount}</span>
        <span className="counter-separator">/</span>
        <span className="counter-max">{maxReviewers}</span>
      </div>
      <div className="counter-message">
        {isFull ? (
          <span className="counter-full">Founding spots filled! 🎉</span>
        ) : isNearFull ? (
          <span className="counter-urgent">Only {spotsLeft} spots left! ⚡</span>
        ) : (
          <span className="counter-normal">Founding reviewers</span>
        )}
      </div>
    </div>
  );
}
