'use client';

import React, { useEffect, useState } from 'react';
import AsyncAvatar from './AsyncAvatar';

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
  preselectedCreatorSlug?: string;
  preselectedCreatorId?: string;
  isInitializing?: boolean;
};

export default function CreatorSelection({ selectedCreator, onSelect, supabase, preselectedCreatorSlug, preselectedCreatorId, isInitializing }: Props) {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(false); // Start as false, will be set to true when we start fetching
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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

      setLoading(true); // Start loading when we begin fetching
      try {
        setError('');
        
        // Get current user ID to filter out self
        let currentUser: any = null;
        try {
          const { data: { user } } = await supabase.auth.getUser();
          currentUser = user;
          setCurrentUserId(user?.id || null);
        } catch (authError) {
          console.log('No authenticated user, proceeding without filtering');
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, username, avatar_url, skills, hourly_rate, rating_average, bio, links, stripe_connect_account_id')
          .eq('is_reviewer', 'approved') // Only show approved reviewers
          .not('stripe_connect_account_id', 'is', null) // Only show reviewers with Connect accounts
          .not('hourly_rate', 'is', null) // Only show reviewers who have set their rate
          .gt('hourly_rate', 0) // Only show reviewers with positive rates
          .order('rating_average', { ascending: false, nullsFirst: false });

        if (error) throw error;

        // Normalize data to ensure required fields exist
        const normalized: Creator[] = (data || []).map((c: any) => {
          const fullName = [c.first_name, c.last_name].filter(Boolean).join(' ') || null;
          return {
            id: c.id,
            username: c.username,
            avatar_url: c.avatar_url,
            full_name: fullName || '',
            skills: c.skills || [],
            hourly_rate: c.hourly_rate ?? undefined,
            rating_average: c.rating_average ?? undefined,
            bio: c.bio ?? undefined,
            links: c.links ?? undefined,
          };
        });

        // Filter out current user if they're a reviewer
        const filteredCreators = currentUser?.id 
          ? normalized.filter(creator => creator.id !== currentUser.id)
          : normalized;

        setCreators(filteredCreators);
        
        // Auto-select creator if preselectedCreatorSlug or preselectedCreatorId is provided
        if (filteredCreators.length > 0) {
          let preselectedCreator: Creator | undefined;
          
          if (preselectedCreatorSlug) {
            preselectedCreator = filteredCreators.find(c => c.username === preselectedCreatorSlug);
          } else if (preselectedCreatorId) {
            preselectedCreator = filteredCreators.find(c => c.id === preselectedCreatorId);
          }
          
          if (preselectedCreator) {
            // Use setTimeout to ensure the component has fully rendered before auto-selecting
            setTimeout(() => {
              onSelect(preselectedCreator!.id, preselectedCreator!.username);
            }, 100);
          }
        }
      } catch (error: any) {
        console.error('Error fetching creators:', error);
        setError(error.message || 'Failed to fetch reviewers');
      } finally {
        setLoading(false);
      }
    };

    if (supabase && !isInitializing) {
      fetchCreators();
    }
  }, [supabase, preselectedCreatorSlug, preselectedCreatorId, onSelect, isInitializing]);

  const filteredCreators = creators.filter(creator => {
    const searchLower = searchTerm.toLowerCase();
    if (!searchTerm.trim()) return true; // Show all when no search term
    
    return (
      creator.full_name?.toLowerCase().includes(searchLower) ||
      creator.username?.toLowerCase().includes(searchLower) ||
      creator.skills?.some(skill => skill.toLowerCase().includes(searchLower))
    );
  });

  

  const handleCreatorSelect = (creator: Creator) => {
    onSelect(creator.id, creator.username);
  };

  // Show local loading only when fetching creators. Avoid duplicating the
  // global page initialization spinner by not rendering here during init.
  if (loading) {
    return (
      <div className="creator-selection loading">
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
              <AsyncAvatar
                avatarPathOrUrl={creator.avatar_url || null}
                alt={creator.full_name || creator.username || 'Reviewer'}
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
          <p style={{ color: '#ff6b6b' }}>Error: {error}</p>
          <p>Please check the console for more details.</p>
        </div>
      )}

      {filteredCreators.length === 0 && !loading && !error && (
        <div className="no-creators">
          <p>No reviewers found{searchTerm ? ' matching your search' : ''}.</p>
          {!searchTerm && <p>It looks like there are no reviewers set up yet.</p>}
        </div>
      )}

    </div>
  );
}
