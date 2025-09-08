import type { Metadata } from 'next';
import React from 'react';
import '../styles.css';

export const metadata: Metadata = {
  title: 'Auro - Get Reviewed by Influencer Women',
  description: 'Level up your attractiveness, style, and room setup with honest feedback from popular female influencers. Get personalized ratings and actionable advice to improve your dating life.',
  keywords: 'dating advice, style feedback, attractiveness rating, influencer reviews, wardrobe advice, room setup',
  openGraph: {
    title: 'Auro - Get Reviewed by Influencer Women',
    description: 'Level up your attractiveness, style, and room setup with honest feedback from popular female influencers.',
    images: ['/auro_aura_logo.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="nav">
          <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <a href="/" className="brand" aria-label="Auro Home">
              <img src="/auro_aura_logo.png" alt="Auro" width={32} height={32} />
            </a>
            <nav>
              <a className="ghost" href="/">Home</a>
            </nav>
          </div>
        </header>
        <main className="container" style={{ padding: '24px 0' }}>{children}</main>
        <footer>
          <div className="container footer__inner">
            <div>© {new Date().getFullYear()} Auro. All rights reserved.</div>
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


