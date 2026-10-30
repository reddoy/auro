import type { Metadata } from 'next';
import React from 'react';
import { Poppins } from 'next/font/google';
import '../styles.css';
import GoogleAnalytics from '../components/GoogleAnalytics';
import ConditionalChrome from '../components/ConditionalChrome';
import StructuredData from '../components/StructuredData';
import ShutdownBanner from '../components/ShutdownBanner';
import { getSiteUrl } from '../lib/site-url';

// Fonts must be initialized at module scope
const poppins = Poppins({ subsets: ['latin'], weight: ['400', '600', '700'] });

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Auro — Dating Profile Feedback from Real Women',
    template: '%s | Auro',
  },
  description:
    'Get honest, actionable feedback on your dating profile from real women. Submit photos, improve your Hinge or Tinder profile, and level up your matches.',
  keywords: [
    'dating profile feedback',
    'dating profile review',
    'Hinge profile review',
    'Tinder profile review',
    'profile reviewer',
    'dating app feedback',
  ],
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/auro_aura_logo.png',
  },
  openGraph: {
    title: 'Auro — Dating Profile Feedback from Real Women',
    description:
      'Honest notes from women you would actually want to date. Get feedback on your photos, bio, and vibe.',
    url: siteUrl,
    siteName: 'Auro',
    images: ['/auro_aura_logo.png'],
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Auro — Dating Profile Feedback from Real Women',
    description:
      'Honest dating profile feedback from real women. Reviewers and reviewees, one place.',
    images: ['/auro_aura_logo.png'],
  },
};

const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Auro',
    url: siteUrl,
    description:
      'Get honest, actionable feedback on your dating profile from real women.',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Auro',
    url: siteUrl,
    logo: `${siteUrl}/auro_aura_logo.png`,
    sameAs: [],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Auro',
    url: siteUrl,
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Web',
    description:
      'Marketplace for honest dating profile feedback from verified women reviewers.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Pay per review when you request feedback from a reviewer.',
    },
  },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
      </head>
      <body className={poppins.className}>
        <StructuredData data={structuredData} />
        {GA_MEASUREMENT_ID && <GoogleAnalytics GA_MEASUREMENT_ID={GA_MEASUREMENT_ID} />}
        <ShutdownBanner />
        <ConditionalChrome>{children}</ConditionalChrome>
      </body>
    </html>
  );
}

