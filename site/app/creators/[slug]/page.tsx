// Minimal Next.js App Router page for creator profile
import React from 'react';
import RequestButton from './RequestButton';
import { notFound } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import type { Metadata } from 'next';
import Avatar from './Avatar';
import { getDisplayAvatarUrl } from '../../../lib/avatar';
import ShareButton from './ShareButton';
export const dynamic = 'force-dynamic';

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function getCreator(slug: string) {
  // Try by username first
  let { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, hourly_rate, rating_average, is_reviewer, skills, bio, links')
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
        .select('id, username, full_name, avatar_url, hourly_rate, rating_average, is_reviewer, skills, bio, links')
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
    bio: data.bio || null,
    links: data.links || null,
  } as any;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const creator = await getCreator(params.slug);
  if (!creator) {
    return { title: 'Reviewer not found - Auro' };
  }
  const title = `${creator.displayName} – Auro Reviewer`;
  const description = `Request a review from ${creator.displayName} on Auro.`;
  const url = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.appauro.com'}/creators/${creator.slug}`;
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
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{ 
        maxWidth: '800px',
        margin: '0 auto',
        paddingTop: 'clamp(20px, 5vw, 40px)'
      }}>
        {/* Main Profile Card */}
        <div style={{ 
          background: 'white',
          borderRadius: '24px',
          padding: 'clamp(20px, 5vw, 40px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          marginBottom: '20px'
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
              <Avatar 
                src={avatarUrl || undefined} 
                alt={creator.displayName} 
                size={120} 
              />
              {creator.rating != null && (
                <div style={{
                  position: 'absolute',
                  bottom: '0',
                  right: '0',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: '700',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  ⭐ {creator.rating.toFixed(1)}
                </div>
              )}
            </div>

            <h1 style={{ 
              margin: '0 0 8px 0',
              fontSize: 'clamp(28px, 6vw, 40px)',
              fontWeight: '800',
              color: '#1a1a1a'
            }}>
              {creator.displayName}
            </h1>

            {creator.slug && (
              <p style={{ 
                margin: '0 0 20px 0',
                fontSize: '16px',
                color: '#888'
              }}>
                @{creator.slug}
              </p>
            )}

            {/* Share Button */}
            <ShareButton 
              slug={creator.slug} 
              displayName={creator.displayName} 
            />
          </div>

          {/* Bio Section */}
          {creator.bio && (
            <div style={{ 
              marginBottom: '24px',
              padding: '20px',
              background: '#f8f9fa',
              borderRadius: '16px'
            }}>
              <p style={{ 
                margin: 0,
                fontSize: '16px',
                lineHeight: '1.6',
                color: '#333'
              }}>
                {creator.bio}
              </p>
            </div>
          )}

          {/* Skills Section */}
          {creator.skills && creator.skills.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ 
                fontSize: '18px',
                fontWeight: '700',
                marginBottom: '12px',
                color: '#1a1a1a'
              }}>
                Expertise
              </h3>
              <div style={{ 
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                {creator.skills.map((skill: string, index: number) => (
                  <span
                    key={index}
                    style={{
                      padding: '10px 16px',
                      fontSize: '14px',
                      fontWeight: '600',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      borderRadius: '25px',
                      boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Social Links */}
          {creator.links && Object.keys(creator.links).length > 0 && (
            <div style={{ 
              marginBottom: '24px',
              padding: '20px',
              background: '#f8f9fa',
              borderRadius: '16px'
            }}>
              <h3 style={{ 
                fontSize: '18px',
                fontWeight: '700',
                marginBottom: '12px',
                color: '#1a1a1a'
              }}>
                Connect
              </h3>
              <div style={{ 
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                {creator.links.instagram && (
                  <a 
                    href={`https://instagram.com/${creator.links.instagram}`}
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
                {creator.links.tiktok && (
                  <a 
                    href={`https://tiktok.com/@${creator.links.tiktok}`}
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
                {creator.links.youtube && (
                  <a 
                    href={creator.links.youtube}
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
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '16px',
            color: 'white',
            textAlign: 'center'
          }}>
            {creator.pricePerReview != null && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', opacity: '0.9', marginBottom: '4px' }}>
                  Starting at
                </div>
                <div style={{ fontSize: 'clamp(32px, 8vw, 48px)', fontWeight: '800' }}>
                  ${creator.pricePerReview}
                </div>
                <div style={{ fontSize: '14px', opacity: '0.9' }}>
                  per review
                </div>
              </div>
            )}
            <RequestButton slug={creator.slug} />
          </div>
        </div>

        {/* Back to Browse Link */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <a 
            href="/creators"
            style={{
              color: 'white',
              textDecoration: 'none',
              fontSize: '16px',
              fontWeight: '600',
              opacity: '0.9',
              transition: 'opacity 0.3s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.9'}
          >
            ← Browse All Reviewers
          </a>
        </div>
      </div>
    </div>
  );
}

