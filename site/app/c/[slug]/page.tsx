// Minimal Next.js App Router page for creator profile
import React from 'react';
import RequestButton from './RequestButton';
import { notFound } from 'next/navigation';

async function getCreator(slug: string) {
  // TODO: Replace with real fetch from Supabase. Minimal placeholder for now.
  return { displayName: slug.replace(/[-_]/g, ' '), slug } as { displayName: string; slug: string } | null;
}

export default async function CreatorPage({ params }: { params: { slug: string } }) {
  const creator = await getCreator(params.slug);
  if (!creator) return notFound();
  return (
    <div style={{ padding: 24 }}>
      <h1>{creator.displayName}</h1>
      <p>Public creator page</p>
      <div style={{ marginTop: 16 }}>
        <RequestButton slug={creator.slug} />
      </div>
    </div>
  );
}


