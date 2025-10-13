'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Star, Search, Filter, TrendingUp, Award, Users } from 'lucide-react';
import Link from 'next/link';

type Reviewer = {
  id: string;
  full_name: string;
  username: string;
  avatar_url?: string;
  skills?: string[];
  hourly_rate?: number;
  rating_average?: number;
  bio?: string;
  links?: any;
};

type FilterType = 'all' | 'top-rated' | 'new' | 'affordable';

export default function CreatorsIndexPage() {
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchReviewers = async () => {
      try {
        setError('');
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, skills, hourly_rate, rating_average, bio, links')
          .eq('is_reviewer', true)
          .order('rating_average', { ascending: false, nullsFirst: false });

        if (error) throw error;

        const normalized: Reviewer[] = (data || []).map((c: any) => ({
          id: c.id,
          username: c.username,
          avatar_url: c.avatar_url,
          full_name: c.full_name,
          skills: c.skills || [],
          hourly_rate: c.hourly_rate ?? undefined,
          rating_average: c.rating_average ?? undefined,
          bio: c.bio ?? undefined,
          links: c.links ?? undefined,
        }));

        setReviewers(normalized);
      } catch (error: any) {
        console.error('Error fetching reviewers:', error);
        setError(error.message || 'Failed to fetch reviewers');
      } finally {
        setLoading(false);
      }
    };

    fetchReviewers();
  }, []);

  const getFilteredReviewers = () => {
    let filtered = reviewers.filter(reviewer => {
      const searchLower = searchTerm.toLowerCase();
      if (!searchTerm.trim()) return true;
      
      return (
        reviewer.full_name?.toLowerCase().includes(searchLower) ||
        reviewer.username?.toLowerCase().includes(searchLower) ||
        reviewer.skills?.some(skill => skill.toLowerCase().includes(searchLower))
      );
    });

    // Apply filter
    switch (selectedFilter) {
      case 'top-rated':
        filtered = filtered.filter(c => c.rating_average && c.rating_average >= 4.5);
        break;
      case 'new':
        // For now, just reverse the order to show "newest" (you can add a created_at field later)
        filtered = [...filtered].reverse();
        break;
      case 'affordable':
        filtered = filtered.filter(c => c.hourly_rate && c.hourly_rate <= 50).sort((a, b) => (a.hourly_rate || 0) - (b.hourly_rate || 0));
        break;
      default:
        break;
    }

    return filtered;
  };

  const filteredReviewers = getFilteredReviewers();

  const getAvatarUrl = (avatarPath?: string) => {
    if (!avatarPath) return '/auro_aura_logo_nobg.png';
    if (avatarPath.startsWith('http')) return avatarPath;
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && avatarPath.startsWith('avatars/')) {
      return `${supabaseUrl}/storage/v1/object/public/${avatarPath}`;
    }
    return avatarPath;
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="loading-spinner" style={{ 
            border: '4px solid rgba(255,255,255,0.3)',
            borderTop: '4px solid white',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <p style={{ color: 'white', marginTop: '20px', fontSize: '18px' }}>Loading reviewers...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      paddingBottom: '60px'
    }}>
      {/* Hero Section */}
      <div style={{ 
        padding: '40px 20px',
        textAlign: 'center',
        color: 'white'
      }}>
        <h1 style={{ 
          fontSize: 'clamp(32px, 8vw, 56px)', 
          fontWeight: '800',
          margin: '0 0 16px 0',
          textShadow: '0 2px 20px rgba(0,0,0,0.2)'
        }}>
          Discover Reviewers
        </h1>
        <p style={{ 
          fontSize: 'clamp(16px, 4vw, 20px)',
          maxWidth: '600px',
          margin: '0 auto',
          opacity: '0.95',
          lineHeight: '1.6'
        }}>
          Get honest feedback from verified reviewers on your style, photos, and more
        </p>

        {/* Stats Row */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '30px',
          marginTop: '30px',
          flexWrap: 'wrap'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '700' }}>{reviewers.length}</div>
            <div style={{ fontSize: '14px', opacity: '0.9' }}>Expert Reviewers</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '700' }}>4.8</div>
            <div style={{ fontSize: '14px', opacity: '0.9' }}>Avg Rating</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '700' }}>24h</div>
            <div style={{ fontSize: '14px', opacity: '0.9' }}>Response Time</div>
          </div>
        </div>
      </div>

      {/* Search & Filters Container */}
      <div style={{ 
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 20px'
      }}>
        {/* Search Bar */}
        <div style={{ 
          position: 'relative',
          marginBottom: '20px'
        }}>
          <Search 
            style={{ 
              position: 'absolute', 
              left: '16px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: '#888',
              width: '20px',
              height: '20px'
            }} 
          />
          <input
            type="text"
            placeholder="Search by name, username, or skills..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '16px 16px 16px 48px',
              fontSize: '16px',
              border: 'none',
              borderRadius: '16px',
              background: 'white',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              outline: 'none',
              transition: 'all 0.3s ease'
            }}
          />
        </div>

        {/* Filter Chips */}
        <div style={{ 
          display: 'flex',
          gap: '10px',
          marginBottom: '30px',
          overflowX: 'auto',
          paddingBottom: '10px',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}>
          {[
            { id: 'all', label: 'All', icon: Filter },
            { id: 'top-rated', label: 'Top Rated', icon: Award },
            { id: 'new', label: 'New', icon: TrendingUp },
            { id: 'affordable', label: 'Affordable', icon: Users }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSelectedFilter(id as FilterType)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '600',
                border: 'none',
                borderRadius: '25px',
                background: selectedFilter === id ? 'white' : 'rgba(255,255,255,0.2)',
                color: selectedFilter === id ? '#667eea' : 'white',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                whiteSpace: 'nowrap',
                boxShadow: selectedFilter === id ? '0 4px 15px rgba(0,0,0,0.2)' : 'none'
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Reviewers Grid */}
      <div style={{ 
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 20px'
      }}>
        {error && (
          <div style={{ 
            background: '#ff4444',
            color: 'white',
            padding: '20px',
            borderRadius: '16px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <p style={{ margin: 0 }}>Error: {error}</p>
          </div>
        )}

        {filteredReviewers.length === 0 && !loading && !error && (
          <div style={{ 
            background: 'white',
            padding: '60px 20px',
            borderRadius: '16px',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '18px', color: '#666', margin: 0 }}>
              {searchTerm ? `No reviewers found matching "${searchTerm}"` : 'No reviewers available yet'}
            </p>
          </div>
        )}

        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px',
        }}>
          {filteredReviewers.map((reviewer) => (
            <Link
              key={reviewer.id}
              href={`/creators/${reviewer.username || reviewer.id}`}
              style={{ textDecoration: 'none' }}
            >
              <div
                style={{
                  background: 'white',
                  borderRadius: '20px',
                  padding: '24px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
                }}
              >
                {/* Avatar & Basic Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  <img
                    src={getAvatarUrl(reviewer.avatar_url)}
                    alt={reviewer.full_name || reviewer.username}
                    style={{
                      width: '70px',
                      height: '70px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '3px solid #f0f0f0'
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ 
                      margin: '0 0 4px 0',
                      fontSize: '20px',
                      fontWeight: '700',
                      color: '#1a1a1a',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {reviewer.full_name || reviewer.username}
                    </h3>
                    {reviewer.username && reviewer.full_name && (
                      <p style={{ 
                        margin: 0,
                        fontSize: '14px',
                        color: '#888',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        @{reviewer.username}
                      </p>
                    )}
                  </div>
                </div>

                {/* Rating & Price */}
                <div style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                  padding: '12px',
                  background: '#f8f9fa',
                  borderRadius: '12px'
                }}>
                  {reviewer.rating_average ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Star fill="#ffc107" stroke="#ffc107" size={18} />
                      <span style={{ fontWeight: '700', fontSize: '16px', color: '#1a1a1a' }}>
                        {reviewer.rating_average.toFixed(1)}
                      </span>
                    </div>
                  ) : (
                    <div style={{ color: '#888', fontSize: '14px' }}>New</div>
                  )}
                  
                  {reviewer.hourly_rate && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '700', fontSize: '18px', color: '#667eea' }}>
                        ${reviewer.hourly_rate}
                      </div>
                      <div style={{ fontSize: '12px', color: '#888' }}>per review</div>
                    </div>
                  )}
                </div>

                {/* Bio */}
                {reviewer.bio && (
                  <p style={{ 
                    margin: '0 0 16px 0',
                    fontSize: '14px',
                    color: '#555',
                    lineHeight: '1.6',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {reviewer.bio}
                  </p>
                )}

                {/* Skills */}
                {reviewer.skills && reviewer.skills.length > 0 && (
                  <div style={{ 
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginTop: 'auto'
                  }}>
                    {reviewer.skills.slice(0, 3).map((skill, index) => (
                      <span
                        key={index}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          borderRadius: '20px'
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                    {reviewer.skills.length > 3 && (
                      <span style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        color: '#888',
                        background: '#f0f0f0',
                        borderRadius: '20px'
                      }}>
                        +{reviewer.skills.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Hide scrollbar for filter chips */
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
