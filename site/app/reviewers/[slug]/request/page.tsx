import React from 'react';

export default function RequestPage({ params }: { params: { slug: string } }) {
  return (
    <div>
      <h1>Request a Review from {params.slug}</h1>
      <p>Request page for reviewer: {params.slug}</p>
    </div>
  );
}

