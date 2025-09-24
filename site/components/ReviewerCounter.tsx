'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface ReviewerCounterProps {
  maxReviewers?: number;
  className?: string;
}

export default function ReviewerCounter({ maxReviewers = 50, className = '' }: ReviewerCounterProps) {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReviewerCount = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('creators')
          .select('id', { count: 'exact' });

        if (error) {
          console.error('Error fetching reviewer count:', error);
          setError('Failed to load count');
          setCount(0); // Fallback to 0
        } else {
          setCount(data?.length || 0);
        }
      } catch (err) {
        console.error('Error fetching reviewer count:', err);
        setError('Failed to load count');
        setCount(0); // Fallback to 0
      } finally {
        setLoading(false);
      }
    };

    fetchReviewerCount();
    
    // Refresh count every 30 seconds
    const interval = setInterval(fetchReviewerCount, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className={`reviewer-counter ${className}`}>
        <span className="counter-loading">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`reviewer-counter ${className}`}>
        <span className="counter-error">Count unavailable</span>
      </div>
    );
  }

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
