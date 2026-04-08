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
  
  // Try by username first
  let { data, error } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, avatar_url, hourly_rate, rating_average, is_reviewer, skills, bio, links')
    .eq('username', slug)
    .maybeSingle();
  if (error) {
    console.error('getReviewer by username error', error);
  }
  // If not found, and looks like a UUID (or as a fallback), try by id
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
  // Concatenate first_name and last_name to create display name
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
  const url = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://appauro.com'}/${reviewer.slug}`;
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
  
  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'var(--bg)',
      padding: '20px'
    }}>
      <div style={{ 
        maxWidth: '800px',
        margin: '0 auto',
        paddingTop: 'clamp(20px, 5vw, 40px)'
      }}>
        {/* Main Profile Card */}
        <div style={{ 
          background: '#2A1B3D',
          borderRadius: '24px',
          padding: 'clamp(20px, 5vw, 40px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          marginBottom: '20px',
          border: '1px solid rgba(255,255,255,0.06)'
        }}>
          {/* Header with Avatar */}
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            marginBottom: '32px'
          }}>
            <div style={{ 
              position: 'relative',
              marginBottom: '20px'
            }}>
              <AsyncAvatar 
                avatarPathOrUrl={reviewer.avatarUrl} 
                alt={reviewer.displayName} 
                size={120} 
              />
              {reviewer.rating != null && (
                <div style={{
                  position: 'absolute',
                  bottom: '0',
                  right: '0',
                  background: '#F26955',
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: '700',
                  boxShadow: '0 4px 12px rgba(255, 45, 85, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  ⭐ {reviewer.rating.toFixed(1)}
                </div>
              )}
            </div>

            <h1 style={{ 
              margin: '0 0 8px 0',
              fontSize: 'clamp(28px, 6vw, 40px)',
              fontWeight: '800',
              color: '#FFFFFF'
            }}>
              {reviewer.displayName}
            </h1>

            {reviewer.slug && (
              <p style={{ 
                margin: '0 0 20px 0',
                fontSize: '16px',
                color: 'rgba(255,255,255,0.72)'
              }}>
                @{reviewer.slug}
              </p>
            )}

            {/* Share Button */}
            <ShareButton 
              slug={reviewer.slug} 
              displayName={reviewer.displayName} 
            />
          </div>

          {/* Bio Section */}
          {reviewer.bio && (
            <div style={{ 
              marginBottom: '24px',
              padding: '20px',
              background: 'rgba(255,111,0,0.1)',
              borderRadius: '16px',
              border: '1px solid rgba(255,111,0,0.2)'
            }}>
              <h3 style={{ 
                fontSize: '18px',
                fontWeight: '700',
                marginBottom: '12px',
                color: '#FFFFFF'
              }}>
                About {reviewer.displayName.split(' ')[0]}
              </h3>
              <p style={{ 
                margin: 0,
                fontSize: '16px',
                lineHeight: '1.6',
                color: 'rgba(255,255,255,0.72)'
              }}>
                {reviewer.bio}
              </p>
            </div>
          )}

          {/* Skills Section */}
          {reviewer.skills && reviewer.skills.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ 
                fontSize: '18px',
                fontWeight: '700',
                marginBottom: '12px',
                color: '#FFFFFF'
              }}>
                Expertise
              </h3>
              <div style={{ 
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                {reviewer.skills.map((skill: string, index: number) => (
                  <span
                    key={index}
                    style={{
                      padding: '10px 16px',
                      fontSize: '14px',
                      fontWeight: '600',
                      background: '#F26955',
                      color: 'white',
                      borderRadius: '25px',
                      boxShadow: '0 2px 8px rgba(255, 45, 85, 0.3)'
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Social Links */}
          {reviewer.links && Object.keys(reviewer.links).some(key => reviewer.links[key]) && (
            <div style={{ 
              marginBottom: '24px',
              padding: '20px',
              background: 'rgba(255,111,0,0.1)',
              borderRadius: '16px',
              border: '1px solid rgba(255,111,0,0.2)'
            }}>
              <h3 style={{ 
                fontSize: '18px',
                fontWeight: '700',
                marginBottom: '12px',
                color: '#FFFFFF'
              }}>
                Follow {reviewer.displayName}
              </h3>
              <div style={{ 
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                {reviewer.links.instagram && (
                  <a 
                    href={`https://instagram.com/${reviewer.links.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '8px 16px',
                      background: '#E4405F',
                      color: 'white',
                      borderRadius: '20px',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    📸 Instagram
                  </a>
                )}
                {reviewer.links.tiktok && (
                  <a 
                    href={`https://tiktok.com/@${reviewer.links.tiktok}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '8px 16px',
                      background: '#000000',
                      color: 'white',
                      borderRadius: '20px',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    🎵 TikTok
                  </a>
                )}
                {reviewer.links.youtube && (
                  <a 
                    href={reviewer.links.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '8px 16px',
                      background: '#FF0000',
                      color: 'white',
                      borderRadius: '20px',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    ▶️ YouTube
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Pricing & CTA */}
          <div style={{ 
            padding: '24px',
            background: '#F26955',
            borderRadius: '16px',
            color: 'white',
            textAlign: 'center'
          }}>
            {reviewer.pricePerReview != null && reviewer.pricePerReview > 0 ? (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '14px', opacity: '0.9', marginBottom: '4px' }}>
                    Starting at
                  </div>
                  <div style={{ fontSize: 'clamp(32px, 8vw, 48px)', fontWeight: '800' }}>
                    ${reviewer.pricePerReview}
                  </div>
                  <div style={{ fontSize: '14px', opacity: '0.9' }}>
                    per review
                  </div>
                </div>
                <RequestButton slug={reviewer.slug} reviewerId={reviewer.id} />
              </>
            ) : (
              <div>
                <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                  Profile Incomplete
                </div>
                <div style={{ fontSize: '14px', opacity: '0.9' }}>
                  This reviewer hasn&apos;t set their review price yet. Please check back later.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Back to Browse Link */}
        <BackLink />
      </div>
    </div>
  );
}

