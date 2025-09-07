'use client';

import React from 'react';

export default function RequestButton({ slug }: { slug: string }) {
  const [loading, setLoading] = React.useState(false);
  const onClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ creatorSlug: slug }),
      });
      const json = await res.json();
      if (res.ok && json?.url) {
        window.location.href = json.url as string;
      } else {
        alert(json?.error || 'Failed to start checkout');
      }
    } catch (e: any) {
      alert(e?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={onClick} disabled={loading} style={{ padding: '12px 16px', borderRadius: 8, background: '#A100FF', color: '#fff', fontWeight: 700 }}>
      {loading ? 'Redirecting…' : 'Request a review'}
    </button>
  );
}


