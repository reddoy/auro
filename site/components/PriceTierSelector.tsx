'use client';

import React from 'react';
import { PRICE_TIERS } from '../lib/priceTiers';

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export default function PriceTierSelector({ value, onChange, className = '' }: Props) {
  const formatPrice = (price: number) => {
    return `$${price.toLocaleString()}`;
  };

  return (
    <div className={`relative ${className}`}>
      <span className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-bold text-white/60">
        $
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full cursor-pointer appearance-none rounded-xl border-2 border-white/20 bg-white/10 py-4 pl-12 pr-6 text-center text-2xl font-semibold text-white focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 1rem center',
          backgroundSize: '12px',
        }}
      >
        <option value="" className="bg-background text-white">
          Select a price tier
        </option>
        {PRICE_TIERS.map((tier) => (
          <option key={tier} value={tier.toString()} className="bg-background text-white">
            {formatPrice(tier)}
          </option>
        ))}
      </select>
    </div>
  );
}
