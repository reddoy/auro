'use client';

import Link from 'next/link';

type Props = { current: 'requests' | 'people' | 'payments' };

export default function AdminNav({ current }: Props) {
  const linkStyle = (active: boolean) =>
    ({
      padding: '8px 14px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: 600,
      textDecoration: 'none',
      color: active ? '#0C0225' : 'rgba(255,255,255,0.85)',
      background: active ? '#F26955' : 'rgba(255,255,255,0.08)',
      border: active ? 'none' : '1px solid rgba(255,255,255,0.12)',
    }) as const;

  return (
    <nav
      style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '24px',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      <Link href="/admin/requests" style={linkStyle(current === 'requests')}>
        Requests
      </Link>
      <Link href="/admin/reviewers" style={linkStyle(current === 'people')}>
        People &amp; reviewers
      </Link>
      <Link href="/admin/payments" style={linkStyle(current === 'payments')}>
        Payments
      </Link>
    </nav>
  );
}
