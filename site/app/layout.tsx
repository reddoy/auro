import type { Metadata } from 'next';
import React from 'react';
import { Poppins } from 'next/font/google';
import '../styles.css';

// Fonts must be initialized at module scope
const poppins = Poppins({ subsets: ['latin'], weight: ['400', '600', '700'] });

export const metadata: Metadata = {
  title: 'Auro - Are You Chopped?',
  description: 'Level up your attractiveness, style, and room setup with honest feedback from popular influencers. Get personalized ratings and actionable advice to improve your dating life.',
  keywords: 'dating advice, style feedback, attractiveness rating, influencer reviews, wardrobe advice, room setup',
  icons: {
    icon: '/auro_aura_logo.png',
  },
  openGraph: {
    title: 'Auro - Are You Chopped?',
    description: 'Level up your attractiveness, style, and room setup with honest feedback from popular influencers.',
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
          <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <a href="/" className="brand" aria-label="Auro Home">
              <img src="/auro_aura_logo_nobg.png" alt="Auro logo" width={40} height={40} />
              <span className="brand__name">Auro</span>
            </a>
            <nav>
              <a className="cta-nav" href="/reviewers/apply">Become a Reviewer</a>
            </nav>
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


