'use client';

import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  targetDate: Date;
  className?: string;
}

export default function CountdownTimer({ targetDate, className = '' }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = targetDate.getTime();
      const difference = target - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
      }
      
      // Set loading to false after first calculation
      setIsLoading(false);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (isLoading) {
    return (
      <div className={`countdown-timer ${className}`}>
        <span className="countdown-loading">Loading...</span>
      </div>
    );
  }

  if (timeLeft.isExpired) {
    return (
      <div className={`countdown-timer ${className}`}>
        <span className="countdown-expired fade-in">App Launched! 🚀</span>
      </div>
    );
  }

  return (
    <div className={`countdown-timer ${className}`}>
      <div className="countdown-item">
        <span className="countdown-number fade-in">{timeLeft.days}</span>
        <span className="countdown-label fade-in">Days</span>
      </div>
      <div className="countdown-separator fade-in">:</div>
      <div className="countdown-item">
        <span className="countdown-number fade-in">{timeLeft.hours.toString().padStart(2, '0')}</span>
        <span className="countdown-label fade-in">Hours</span>
      </div>
      <div className="countdown-separator fade-in">:</div>
      <div className="countdown-item">
        <span className="countdown-number fade-in">{timeLeft.minutes.toString().padStart(2, '0')}</span>
        <span className="countdown-label fade-in">Min</span>
      </div>
      <div className="countdown-separator fade-in">:</div>
      <div className="countdown-item">
        <span className="countdown-number fade-in">{timeLeft.seconds.toString().padStart(2, '0')}</span>
        <span className="countdown-label fade-in">Sec</span>
      </div>
    </div>
  );
}
