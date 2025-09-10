'use client';

import React, { useEffect, useState } from 'react';
import { getDisplayAvatarUrl } from '../../../lib/avatar';

type Creator = {
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

type Props = {
  selectedCreator?: string;
  onSelect: (creatorId: string, creatorSlug: string) => void;
  supabase: any;
};

export default function CreatorSelection({ selectedCreator, onSelect, supabase }: Props) {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string>('');
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchCreators = async () => {
      if (!supabase) {
        console.error('Supabase client not available - likely missing environment variables');
        setError('Configuration error: Supabase client not available. Please check environment variables.');
        setLoading(false);
        return;
      }

      if (!supabase.from) {
        console.error('Supabase client malformed');
        setError('Configuration error: Invalid Supabase client.');
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching creators...');
        setError('');
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, skills, hourly_rate, rating_average, bio, links')
          .eq('is_reviewer', true)
          .order('rating_average', { ascending: false, nullsFirst: false });

        console.log('Query result:', { data, error });
        
        if (error) throw error;
        
        console.log('Found creators:', data?.length || 0);
        setCreators(data || []);
        
        // Load avatar URLs for all creators
        if (data && data.length > 0) {
          const urlPromises = data.map(async (creator: Creator) => {
            const avatarUrl = await getDisplayAvatarUrl(creator.avatar_url);
            return { id: creator.id, url: avatarUrl || '/auro_aura_logo.png' };
          });
          
          const resolvedUrls = await Promise.all(urlPromises);
          const urlMap = resolvedUrls.reduce((acc, { id, url }) => {
            acc[id] = url;
            return acc;
          }, {} as Record<string, string>);
          
          setAvatarUrls(urlMap);
        }
      } catch (error: any) {
        console.error('Error fetching creators:', error);
        setError(error.message || 'Failed to fetch reviewers');
      } finally {
        setLoading(false);
      }
    };

    if (supabase) {
      fetchCreators();
    }
  }, [supabase]);

  const filteredCreators = creators.filter(creator => {
    const searchLower = searchTerm.toLowerCase();
    if (!searchTerm.trim()) return true; // Show all when no search term
    
    return (
      creator.full_name?.toLowerCase().includes(searchLower) ||
      creator.username?.toLowerCase().includes(searchLower) ||
      creator.skills?.some(skill => skill.toLowerCase().includes(searchLower))
    );
  });

  console.log('Creators:', creators.length, 'Filtered:', filteredCreators.length, 'Search:', searchTerm);

  const getCreatorImageUrl = (creator: Creator) => {
    // Use the pre-loaded avatar URL from state
    return avatarUrls[creator.id] || '/auro_aura_logo.png';
  };

  const handleCreatorSelect = (creator: Creator) => {
    onSelect(creator.id, creator.username);
  };

  if (loading) {
    return (
      <div className="creator-selection loading">
        <div className="loading-spinner"></div>
        <p>Loading reviewers...</p>
      </div>
    );
  }

  return (
    <div className="creator-selection">
      <div className="step-header">
        <h2>Choose Your Reviewer</h2>
        <p>Select from our network of verified reviewers who will provide honest feedback on your photos.</p>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search by name, username, or skills..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="creators-grid">
        {filteredCreators.map((creator) => (
          <div
            key={creator.id}
            className={`creator-card ${selectedCreator === creator.id || selectedCreator === creator.username ? 'selected' : ''}`}
            onClick={() => handleCreatorSelect(creator)}
          >
            <div className="creator-avatar">
              <img
                src={getCreatorImageUrl(creator)}
                alt={`${creator.full_name || creator.username}'s avatar`}
                onError={(e) => {
                  console.error('Avatar load error for creator:', creator.id, creator.avatar_url);
                  e.currentTarget.src = '/auro_aura_logo.png';
                }}
                onLoad={() => {
                  console.log('Avatar loaded successfully for creator:', creator.id);
                }}
              />
            </div>
            
            <div className="creator-info">
              <h3 className="creator-name">
                {creator.full_name || creator.username}
              </h3>
              {creator.username && creator.full_name && (
                <p className="creator-username">@{creator.username}</p>
              )}
              
              {creator.rating_average && (
                <div className="creator-rating">
                  ⭐ {creator.rating_average.toFixed(1)}/5
                </div>
              )}
              
              {creator.skills && creator.skills.length > 0 && (
                <div className="creator-skills">
                  {creator.skills.slice(0, 3).map((skill, index) => (
                    <span key={index} className="skill-tag">
                      {skill}
                    </span>
                  ))}
                  {creator.skills.length > 3 && (
                    <span className="skill-more">+{creator.skills.length - 3} more</span>
                  )}
                </div>
              )}
              
              {creator.bio && (
                <p className="creator-bio">
                  {creator.bio.length > 100 ? `${creator.bio.substring(0, 100)}...` : creator.bio}
                </p>
              )}
              
              {creator.hourly_rate && (
                <div className="creator-price">
                  ${creator.hourly_rate}/review
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="error-state">
          <p style={{ color: 'red' }}>Error: {error}</p>
          <p>Please check the console for more details.</p>
        </div>
      )}

      {filteredCreators.length === 0 && !loading && !error && (
        <div className="no-creators">
          <p>No reviewers found{searchTerm ? ' matching your search' : ''}.</p>
          {!searchTerm && <p>It looks like there are no reviewers set up yet.</p>}
        </div>
      )}

      {creators.length > 0 && (
        <div className="debug-info" style={{ fontSize: '12px', color: '#888', marginTop: '10px' }}>
          Debug: {creators.length} total reviewers, {filteredCreators.length} filtered
          {searchTerm && ` (searching for: "${searchTerm}")`}
        </div>
      )}
    </div>
  );
}
