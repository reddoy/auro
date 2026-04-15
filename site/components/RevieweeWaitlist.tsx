'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

type Props = {
  source?: string;
  title?: string;
  subtitle?: string;
  /** `card` = self-contained panel (e.g. homepage). `flat` = no outer shell (e.g. inside /waitlist hero). */
  appearance?: 'card' | 'flat';
  className?: string;
  /** Omit the title line (parent already provides the page heading). */
  hideHeading?: boolean;
};

export default function RevieweeWaitlist({
  source = 'homepage_waitlist',
  title = 'Join the review waitlist',
  subtitle = 'Drop your number and we will text you when reviewers are taking new paid requests.',
  appearance = 'card',
  className,
  hideHeading = false,
}: Props) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneNumber.trim()) {
      setStatus('error');
      setMessage('Please enter your phone number');
      return;
    }

    setStatus('loading');

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phoneNumber.trim(),
          source,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage('You are in. Expect occasional SMS—no spam.');
        setPhoneNumber('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Something went wrong');
      }
    } catch {
      setStatus('error');
      setMessage('Failed to join waitlist. Please try again.');
    }
  };

  const isFlat = appearance === 'flat';

  return (
    <div
      className={cn(
        !isFlat &&
          'rounded-2xl border border-white/10 bg-gradient-to-br from-primary/[0.14] via-white/[0.04] to-transparent p-6 shadow-lg shadow-black/25 backdrop-blur-md md:p-8',
        isFlat && 'w-full',
        className
      )}
    >
      <div className={cn('mx-auto max-w-xl', !isFlat && 'text-center')}>
        <div className={cn('mb-5', isFlat && 'mb-6 text-left')}>
          {!hideHeading ? (
            <h3 className="text-xl font-semibold tracking-tight text-white md:text-2xl">{title}</h3>
          ) : null}
          <p
            className={cn(
              'leading-relaxed text-white/70 md:text-base',
              hideHeading ? 'text-base text-white/75 md:text-lg' : 'mt-2 text-sm',
              !isFlat && !hideHeading && 'mx-auto max-w-md',
              !isFlat && hideHeading && 'mx-auto max-w-md'
            )}
          >
            {subtitle}
          </p>
        </div>

        {status === 'success' ? (
          <div
            className={cn(
              'flex items-center gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-4 text-emerald-100',
              !isFlat && 'justify-center'
            )}
            role="status"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-lg font-bold text-emerald-200">
              ✓
            </span>
            <span className="text-left text-sm font-medium leading-snug md:text-base">{message}</span>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className={cn('flex flex-col gap-3 sm:flex-row sm:items-stretch', !isFlat && 'sm:justify-center')}
          >
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="(555) 123-4567"
              className={cn(
                'min-h-[48px] flex-1 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm text-white shadow-inner placeholder:text-white/40 transition',
                'focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/25',
                'disabled:cursor-not-allowed disabled:opacity-60'
              )}
              disabled={status === 'loading'}
              autoComplete="tel"
              aria-label="Phone number"
            />
            <Button
              type="submit"
              disabled={status === 'loading'}
              variant="gradient"
              size="lg"
              className="h-12 shrink-0 rounded-xl px-8 font-semibold sm:h-auto sm:min-w-[160px]"
            >
              {status === 'loading' ? 'Joining…' : 'Join waitlist'}
            </Button>
          </form>
        )}

        {status === 'error' ? (
          <p className="mt-3 text-center text-sm font-medium text-red-300 sm:text-left" role="alert">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
