import type { Metadata } from 'next';
import React from 'react';
import '../styles.css';

export const metadata: Metadata = {
  title: 'Auro',
  description: 'Public creator pages and checkout',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="nav">
          <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <a href="/" className="brand" aria-label="Auro Home">
              <img src="/favicon.ico" alt="Auro" width={28} height={28} />
            </a>
            <nav>
              <a className="ghost" href="/">Home</a>
            </nav>
          </div>
        </header>
        <main className="container" style={{ padding: '24px 0' }}>{children}</main>
        <footer>
          <div className="container footer__inner">
            <div>© {new Date().getFullYear()} Auro</div>
            <div className="footer__links">
              <a href="/">Home</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}


