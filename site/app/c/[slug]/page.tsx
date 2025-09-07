// Minimal Next.js App Router page for creator profile
import React from 'react';
import RequestButton from './RequestButton';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function getCreator(slug: string) {
  // Try by username first
  let { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, hourly_rate, rating_average, is_reviewer')
    .eq('username', slug)
    .maybeSingle();
  if (error) {
    console.error('getCreator by username error', error);
  }
  // If not found, and looks like a UUID (or as a fallback), try by id
  if (!data) {
    if (isUuidLike(slug) || !error) {
      const byId = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, hourly_rate, rating_average, is_reviewer')
        .eq('id', slug)
        .maybeSingle();
      data = byId.data as any;
    }
  }
  if (!data || !data.is_reviewer) return null;
  return {
    id: data.id,
    slug: data.username || slug,
    displayName: data.full_name || data.username || 'Reviewer',
    avatarUrl: data.avatar_url || null,
    pricePerReview: data.hourly_rate ?? null,
    rating: data.rating_average ?? null,
  } as any;
}

export default async function CreatorPage({ params }: { params: { slug: string } }) {
  const creator = await getCreator(params.slug);
  if (!creator) return notFound();
  return (
    <div style={{ padding: 24 }}>
      <h1>{creator.displayName}</h1>
      {creator.pricePerReview != null && (
        <p>Price: ${creator.pricePerReview} per review</p>
      )}
      {creator.rating != null && (
        <p>Rating: {creator.rating.toFixed(1)}/5</p>
      )}
      <div style={{ marginTop: 16 }}>
        <RequestButton slug={creator.slug} />
      </div>
    </div>
  );
}


