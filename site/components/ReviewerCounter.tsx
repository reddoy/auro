'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface ReviewerCounterProps {
  maxReviewers?: number;
  className?: string;
}

export default function ReviewerCounter({ maxReviewers = 35, className = '' }: ReviewerCounterProps) {
  const [count, setCount] = useState<number>(0); // Start with 0 instead of null
  const [loading, setLoading] = useState(true); // Show loading initially
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReviewerCount = async () => {
      try {
        setError(null);
        setLoading(true);
        
        if (!supabase) {
          console.error('Supabase client is not available');
          setLoading(false);
          return;
        }
        
        // Count only verified reviewers: profiles where is_reviewer = 'approved'
        const { count, error } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('is_reviewer', 'approved');

        if (error) {
          console.error('Error fetching reviewer count:', error);
          setError('Database connection issue');
        } else {
          setCount(count || 0);
        }
      } catch (err) {
        console.error('Error fetching reviewer count:', err);
        setError('Connection failed');
        // Keep current count instead of resetting to 0
      } finally {
        setLoading(false);
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
        <span className="counter-current">{loading ? '...' : currentCount}</span>
        <span className="counter-separator">/</span>
        <span className="counter-max">{maxReviewers}</span>
      </div>
      <div className="counter-message">
        {isFull ? (
          <span className="counter-full">Founding spots filled! 🎉</span>
        ) : isNearFull ? (
          <span className="counter-urgent">Only {spotsLeft} spots left! ⚡</span>
        ) : (
          <span className="counter-normal">Exclusive founding spots</span>
        )}
      </div>
    </div>
  );
}
