// Minimal Next.js App Router page for creator profile
import React from 'react';
import RequestButton from './RequestButton';
import { notFound } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import type { Metadata } from 'next';
import Avatar from './Avatar';
import { getDisplayAvatarUrl } from '../../../lib/avatar';
export const dynamic = 'force-dynamic';

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function getCreator(slug: string) {
  // Try by username first
  let { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, hourly_rate, rating_average, is_reviewer, skills')
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
        .select('id, username, full_name, avatar_url, hourly_rate, rating_average, is_reviewer, skills')
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
    skills: data.skills || [],
  } as any;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const creator = await getCreator(params.slug);
  if (!creator) {
    return { title: 'Creator not found - Auro' };
  }
  const title = `${creator.displayName} – Auro Creator`;
  const description = `Request a review from ${creator.displayName} on Auro.`;
  const url = `${process.env.NEXT_PUBLIC_CREATOR_WEB_BASE || ''}/c/${creator.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'profile',
      images: creator.avatarUrl ? [{ url: creator.avatarUrl } as any] : undefined,
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: creator.avatarUrl ? [creator.avatarUrl] : undefined,
    },
  };
}

export default async function CreatorPage({ params }: { params: { slug: string } }) {
  const creator = await getCreator(params.slug);
  if (!creator) return notFound();
  const avatarUrl = await getDisplayAvatarUrl(creator.avatarUrl);
  return (
    <section>
      <div className="card" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Avatar src={avatarUrl || undefined} alt={creator.displayName} size={64} />
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 24 }}>{creator.displayName}</h1>
            {creator.rating != null && (
              <p style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>Rating {creator.rating.toFixed(1)}/5</p>
            )}
            {!!creator.skills?.length && (
              <p style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>Skills: {creator.skills.join(', ')}</p>
            )}
          </div>
          <div>
            {creator.pricePerReview != null && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, fontSize: 18 }}>${creator.pricePerReview}</div>
                <div style={{ color: 'var(--text-2)', fontSize: 12 }}>per review</div>
              </div>
            )}
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <RequestButton slug={creator.slug} />
        </div>
      </div>
    </section>
  );
}


