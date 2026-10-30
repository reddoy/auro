'use client';

import LandingCTAs from './LandingCTAs';

export default function ConditionalNav() {
  return (
    <div
      className="conditional-nav"
      style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap', justifyContent: 'flex-end' }}
    >
      <div className="nav-ribbon-ctas" aria-label="Primary actions">
        <LandingCTAs variant="nav" />
      </div>
    </div>
  );
}
