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
      <body className={poppins.className}>
        <header className="nav">
          <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <a href="/" className="brand" aria-label="Auro Home">
              <img src="/auro_aura_logo.png" alt="Auro" width={32} height={32} />
            </a>
            <nav>
              <a className="ghost" href="/">Home</a>
              <a className="ghost" href="/reviewers/apply">Become a Reviewer</a>
            </nav>
          </div>
        </header>
        <main className="container" style={{ padding: '24px 0' }}>{children}</main>
        <footer>
          <div className="container footer__inner">
            <div>© {new Date().getFullYear()} Cool Hand Studios LLC. All rights reserved.</div>
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


