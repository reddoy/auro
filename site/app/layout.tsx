import type { Metadata } from 'next';
import React from 'react';
import { Poppins } from 'next/font/google';
import '../styles.css';
import CountdownTimer from '../components/CountdownTimer';
import ReviewerCounter from '../components/ReviewerCounter';
import ConditionalNav from '../components/ConditionalNav';

// Fonts must be initialized at module scope
const poppins = Poppins({ subsets: ['latin'], weight: ['400', '600', '700'] });

export const metadata: Metadata = {
  title: 'Auro - Monetize Your Style Expertise | Become a Reviewer',
  description: 'Join content creators and influencers earning $200+ daily reviewing guys\' profiles. Set your own rates, work on your schedule, and monetize your eye for style.',
  keywords: 'content creators, style reviewer, profile reviewer, monetize expertise, influencer income, fashion advice, dating coach, women entrepreneurs',
  icons: {
    icon: '/auro_aura_logo.png',
  },
  openGraph: {
    title: 'Auro - Monetize Your Style Expertise | Become a Reviewer',
    description: 'Join content creators and influencers earning $200+ daily reviewing guys\' profiles. Set your own rates, work on your schedule.',
    images: ['/auro_aura_logo.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Auro - Monetize Your Style Expertise',
    description: 'Join creators earning $200+ daily reviewing profiles. Set your own rates, work on your schedule.',
    images: ['/auro_aura_logo.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body className={`${poppins.className} snap-y`}>
        <header className="nav">
          <div className="container">
            <div className="nav-content">
              <a href="/" className="brand mobile-brand-centered" aria-label="Auro Home">
                <img src="/auro_aura_logo_nobg.png" alt="Auro logo" width={40} height={40} />
                <span className="brand__name">Auro</span>
              </a>
              
              
              <nav className="nav-cta-section">
                <ConditionalNav />
              </nav>
            </div>
          </div>
        </header>
        <main style={{ padding: 0 }}>{children}</main>
        <footer>
          <div className="container footer__inner">
            <div>
              <a href="https://coolhandstudios.xyz" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-2)', textDecoration: 'none' }}>
                © {new Date().getFullYear()} Cool Hand Studios LLC
              </a>
              <span style={{ color: 'var(--text-2)' }}> · All rights reserved.</span>
            </div>
            <div className="footer__links">
              <a href="/">Home</a>
              <a href="/privacy">Privacy</a>
              <a href="/terms">Terms</a>
              <a href="/contact">Contact</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}


