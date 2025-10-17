'use client';

import React from 'react';

export default function RequestButton({ slug }: { slug: string }) {
  const [loading, setLoading] = React.useState(false);
  const onClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // Redirect to the request flow instead of calling API directly
      // This allows anonymous users to start the process
      window.location.href = `/request?creatorSlug=${encodeURIComponent(slug)}`;
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


