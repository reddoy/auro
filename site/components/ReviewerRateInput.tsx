'use client';

import React from 'react';

export const REVIEWER_RATE_MIN = 1;
export const REVIEWER_RATE_MAX = 10000;

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
};

export function parseReviewerRate(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  return n;
}

export function isValidReviewerRate(value: string): boolean {
  const n = parseReviewerRate(value);
  return n !== null && n >= REVIEWER_RATE_MIN && n <= REVIEWER_RATE_MAX;
}

export default function ReviewerRateInput({ value, onChange, className = '', id = 'reviewer-rate' }: Props) {
  return (
    <div className={className}>
      <div className="relative">
        <span className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-bold text-white/60">
          $
        </span>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={REVIEWER_RATE_MIN}
          max={REVIEWER_RATE_MAX}
          step={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="25"
          className="w-full rounded-xl border-2 border-white/20 bg-white/10 py-4 pl-12 pr-6 text-center text-2xl font-semibold text-white placeholder:text-white/35 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary tabular-nums"
          aria-describedby={`${id}-hint`}
        />
      </div>
      <p id={`${id}-hint`} className="mt-2 text-xs text-gray-400 text-center">
        Enter any whole-dollar amount from ${REVIEWER_RATE_MIN} to ${REVIEWER_RATE_MAX.toLocaleString()}.
        Checkout may round to the nearest supported amount.
      </p>
    </div>
  );
}
