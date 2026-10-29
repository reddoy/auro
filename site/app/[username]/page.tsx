// Reviewer profile page - accessible at /[username]
import React from 'react';
import RequestButton from './RequestButton';
import { notFound } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import type { Metadata } from 'next';
import AsyncAvatar from '../request/components/AsyncAvatar';
import ShareButton from './ShareButton';
import BackLink from './BackLink';
export const dynamic = 'force-dynamic';

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function getReviewer(slug: string) {
  if (!supabase) {
    console.error('Supabase client is not available');
    return null;
  }
  
  let { data, error } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, avatar_url, hourly_rate, rating_average, is_reviewer, skills, bio, links')
    .eq('username', slug)
    .maybeSingle();
  if (error) {
    console.error('getReviewer by username error', error);
  }
  if (!data) {
    if (isUuidLike(slug) || !error) {
      const byId = await supabase
        .from('profiles')
        .select('id, username, first_name, last_name, avatar_url, hourly_rate, rating_average, is_reviewer, skills, bio, links')
        .eq('id', slug)
        .maybeSingle();
      data = byId.data as any;
    }
  }
  if (!data || !data.is_reviewer) return null;
  const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ') || null;
  return {
    id: data.id,
    slug: data.username || slug,
    displayName: fullName || data.username || 'Reviewer',
    avatarUrl: data.avatar_url || null,
    pricePerReview: data.hourly_rate ?? null,
    rating: data.rating_average ?? null,
    skills: data.skills || [],
    bio: data.bio || null,
    links: data.links || null,
  } as any;
}

export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
  const reviewer = await getReviewer(params.username);
  if (!reviewer) {
    return { title: 'Reviewer not found - Auro' };
  }
  const title = `${reviewer.displayName} – Auro Reviewer`;
  const description = `Request a review from ${reviewer.displayName} on Auro.`;
  const url = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://auro-pearl.vercel.app'}/${reviewer.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'profile',
      images: reviewer.avatarUrl ? [{ url: reviewer.avatarUrl } as any] : undefined,
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: reviewer.avatarUrl ? [reviewer.avatarUrl] : undefined,
    },
  };
}

export default async function ReviewerPage({ params }: { params: { username: string } }) {
  const reviewer = await getReviewer(params.username);
  if (!reviewer) return notFound();

  const firstName = reviewer.displayName.split(' ')[0];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-4 py-10 sm:py-14">

        {/* Back navigation */}
        <div className="mb-6">
          <BackLink />
        </div>

        {/* Profile card */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.04] overflow-hidden">

          {/* Avatar + identity */}
          <div className="flex flex-col items-center gap-4 px-6 pt-8 pb-6 text-center">
            <div className="relative">
              <AsyncAvatar
                avatarPathOrUrl={reviewer.avatarUrl}
                alt={reviewer.displayName}
                size={104}
              />
              {reviewer.rating != null && (
                <div className="absolute -bottom-1 -right-1 flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-white shadow-lg">
                  ★ {reviewer.rating.toFixed(1)}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {reviewer.displayName}
              </h1>
              {reviewer.slug && (
                <p className="text-sm text-white/50">@{reviewer.slug}</p>
              )}
            </div>

            <ShareButton slug={reviewer.slug} displayName={reviewer.displayName} />
          </div>

          {/* Divider */}
          <div className="h-px bg-white/8 mx-6" />

          {/* Body content */}
          <div className="space-y-5 px-6 py-6">

            {/* Bio */}
            {reviewer.bio && (
              <div className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40">
                  About {firstName}
                </h2>
                <p className="text-sm leading-relaxed text-white/75">
                  {reviewer.bio}
                </p>
              </div>
            )}

            {/* Skills */}
            {reviewer.skills && reviewer.skills.length > 0 && (
              <div className="space-y-2.5">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40">
                  Expertise
                </h2>
                <div className="flex flex-wrap gap-2">
                  {reviewer.skills.map((skill: string, index: number) => (
                    <span
                      key={index}
                      className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs font-medium text-white/80"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Social links */}
            {reviewer.links && Object.keys(reviewer.links).some((k: string) => reviewer.links[k]) && (
              <div className="space-y-2.5">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40">
                  Follow {firstName}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {reviewer.links.instagram && (
                    <a
                      href={`https://instagram.com/${reviewer.links.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-full border border-white/12 bg-white/6 px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:border-white/20 hover:text-white"
                    >
                      Instagram
                    </a>
                  )}
                  {reviewer.links.tiktok && (
                    <a
                      href={`https://tiktok.com/@${reviewer.links.tiktok}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-full border border-white/12 bg-white/6 px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:border-white/20 hover:text-white"
                    >
                      TikTok
                    </a>
                  )}
                  {reviewer.links.youtube && (
                    <a
                      href={reviewer.links.youtube}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-full border border-white/12 bg-white/6 px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:border-white/20 hover:text-white"
                    >
                      YouTube
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-white/8 mx-6" />

          {/* Pricing + CTA */}
          <div className="px-6 py-6">
            {reviewer.pricePerReview != null && reviewer.pricePerReview > 0 ? (
              <div className="space-y-4">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-bold tracking-tight text-white">
                    ${reviewer.pricePerReview}
                  </span>
                  <span className="text-sm text-white/50">per review</span>
                </div>
                <RequestButton slug={reviewer.slug} reviewerId={reviewer.id} />
                <p className="text-xs text-white/40 text-center">
                  Secure checkout · 80% goes directly to {firstName}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-white/8 bg-white/4 px-4 py-5 text-center">
                <p className="text-sm font-medium text-white/60">
                  {firstName} hasn&apos;t set their price yet — check back soon.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
