import type { Metadata } from 'next';
import React from 'react';
import { Poppins } from 'next/font/google';
import '../styles.css';
import GoogleAnalytics from '../components/GoogleAnalytics';
import { IosSourceTracker } from '../components/IosSourceTracker';
import ConditionalChrome from '../components/ConditionalChrome';

// Fonts must be initialized at module scope
const poppins = Poppins({ subsets: ['latin'], weight: ['400', '600', '700'] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://appauro.com'),
  title: 'Auro - Rate Guys, Get Paid',
  description: 'Auro is live on the web. Review men\'s dating profiles, set your own rates, and keep 80% of every completed review.',
  keywords: 'web app, profile reviewer, dating profile feedback, monetize expertise, reviewer marketplace, women creators',
  icons: {
    icon: '/auro_aura_logo.png',
  },
  openGraph: {
    title: 'Auro - Rate Guys, Get Paid',
    description: 'Fully launched on the web. Review profiles, set your own rates, and keep 80% of every completed review.',
    images: ['/auro_aura_logo.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Auro - Rate Guys, Get Paid',
    description: 'Fully launched on the web. Keep 80% of completed review payments.',
    images: ['/auro_aura_logo.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body className={`${poppins.className} snap-y`}>
        <IosSourceTracker />
        {GA_MEASUREMENT_ID && <GoogleAnalytics GA_MEASUREMENT_ID={GA_MEASUREMENT_ID} />}
        <ConditionalChrome>{children}</ConditionalChrome>
      </body>
    </html>
  );
}

