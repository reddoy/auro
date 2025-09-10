'use client';

import React, { useEffect, useState } from 'react';
import { getDisplayAvatarUrl } from '../../../lib/avatar';
import Avatar from '../../creators/[slug]/Avatar';

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
        
        // Load avatar URLs for all creators (simplified approach)
        if (data && data.length > 0) {
          console.log('Processing avatar URLs for creators:', data.map(c => ({ id: c.id, username: c.username, avatar_url: c.avatar_url })));
          
          // Process avatars sequentially to avoid overwhelming the system
          const urlMap: Record<string, string> = {};
          
          for (const creator of data) {
            console.log(`Processing avatar for ${creator.username}:`, creator.avatar_url);
            try {
              if (creator.avatar_url) {
                const avatarUrl = await getDisplayAvatarUrl(creator.avatar_url);
                console.log(`Resolved avatar URL for ${creator.username}:`, avatarUrl);
                urlMap[creator.id] = avatarUrl || '/auro_aura_logo.png';
              } else {
                console.log(`No avatar_url for ${creator.username}, using fallback`);
                urlMap[creator.id] = '/auro_aura_logo.png';
              }
            } catch (error) {
              console.error(`Error resolving avatar for ${creator.username}:`, error);
              urlMap[creator.id] = '/auro_aura_logo.png';
            }
          }
          
          console.log('Final avatar URL map:', urlMap);
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
    const preloadedUrl = avatarUrls[creator.id];
    
    // If we have a pre-loaded URL and it's not the fallback, use it
    if (preloadedUrl && preloadedUrl !== '/auro_aura_logo.png') {
      return preloadedUrl;
    }
    
    // Fallback: try to construct URL directly
    if (creator.avatar_url) {
      console.log('Trying direct URL construction for:', creator.username, creator.avatar_url);
      
      // If it's already a full URL, use it
      if (creator.avatar_url.startsWith('http')) {
        return creator.avatar_url;
      }
      
      // Try to construct Supabase public URL
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (supabaseUrl) {
        const cleanUrl = supabaseUrl.replace(/\/$/, '');
        const directUrl = `${cleanUrl}/storage/v1/object/public/avatars/${creator.avatar_url}`;
        console.log('Constructed direct URL:', directUrl);
        return directUrl;
      }
    }
    
    console.log('Using fallback logo for:', creator.username);
    return '/auro_aura_logo.png';
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
              <Avatar 
                src={getCreatorImageUrl(creator) !== '/auro_aura_logo.png' ? getCreatorImageUrl(creator) : undefined}
                alt={`${creator.full_name || creator.username}'s avatar`}
                size={80}
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
          <br />
          Avatar URLs: {Object.keys(avatarUrls).length} loaded
          <br />
          Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Present' : 'Missing'}
          <br />
          Sample avatars: {JSON.stringify(Object.values(avatarUrls).slice(0, 2))}
        </div>
      )}
    </div>
  );
}
