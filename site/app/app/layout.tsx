import type { Metadata } from 'next';
import React from 'react';
import AppLayoutClient from '@/components/app/AppLayoutClient';

export const metadata: Metadata = {
  title: 'Auro',
  description: 'Your Auro dashboard and onboarding',
};

export default function WebAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#0C0225',
        color: '#fff',
      }}
    >
      <AppLayoutClient>{children}</AppLayoutClient>
    </div>
  );
}
