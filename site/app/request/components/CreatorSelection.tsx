'use client';

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import AsyncAvatar from './AsyncAvatar';
import { getCheckoutPriceDollars } from '../../../lib/checkout-web-tier';

type Creator = {
  id: string;
  full_name: string;
  username: string;
  avatar_url?: string;
  skills?: string[];
  hourly_rate?: number;
  bio?: string;
  links?: any;
};

type SortKey = 'price_low' | 'price_high';

type Props = {
  selectedCreator?: string;
  onSelect: (creatorId: string, creatorSlug: string) => void;
  supabase: any;
  preselectedCreatorSlug?: string;
  preselectedCreatorId?: string;
  isInitializing?: boolean;
};

function displayName(c: Creator) {
  return (c.full_name || c.username || 'Reviewer').trim();
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'price_low', label: 'Cheapest' },
  { key: 'price_high', label: 'Price High' },
];

export default function CreatorSelection({
  selectedCreator,
  onSelect,
  supabase,
  preselectedCreatorSlug,
  preselectedCreatorId,
  isInitializing,
}: Props) {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string>('');
  const hasAutoSelectedRef = useRef(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey | null>(null);
  const footerRef = useRef<HTMLDivElement>(null);

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

      setLoading(true);
      try {
        setError('');

        let currentUser: any = null;
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          currentUser = user;
        } catch (_authError) {
          console.log('No authenticated user, proceeding without filtering');
        }

        const { data, error } = await supabase
          .from('profiles')
          .select(
            'id, first_name, last_name, username, avatar_url, skills, hourly_rate, bio, links, stripe_connect_account_id',
          )
          .eq('is_reviewer', 'approved')
          .not('hourly_rate', 'is', null)
          .gt('hourly_rate', 0);

        if (error) throw error;

        const normalized: Creator[] = (data || []).map((c: any) => {
          const fullName = [c.first_name, c.last_name].filter(Boolean).join(' ') || null;
          return {
            id: c.id,
            username: c.username,
            avatar_url: c.avatar_url,
            full_name: fullName || '',
            skills: c.skills || [],
            hourly_rate: c.hourly_rate ?? undefined,
            bio: c.bio ?? undefined,
            links: c.links ?? undefined,
          };
        });

        const filteredCreators = currentUser?.id
          ? normalized.filter((creator) => creator.id !== currentUser.id)
          : normalized;

        setCreators(filteredCreators);

        if (filteredCreators.length > 0 && !hasAutoSelectedRef.current) {
          let preselectedCreator: Creator | undefined;

          if (preselectedCreatorSlug) {
            preselectedCreator = filteredCreators.find((c) => c.username === preselectedCreatorSlug);
          } else if (preselectedCreatorId) {
            preselectedCreator = filteredCreators.find((c) => c.id === preselectedCreatorId);
          }

          if (preselectedCreator && onSelect) {
            hasAutoSelectedRef.current = true;
            setTimeout(() => {
              onSelect(preselectedCreator!.id, preselectedCreator!.username);
            }, 300);
          }
        }
      } catch (err: any) {
        console.error('Error fetching creators:', err);
        setError(err.message || 'Failed to fetch reviewers');
      } finally {
        setLoading(false);
      }
    };

    if (supabase && !isInitializing) {
      fetchCreators();
    }
  }, [supabase, preselectedCreatorSlug, preselectedCreatorId, onSelect, isInitializing]);

  const filteredCreators = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return creators;
    return creators.filter((creator) => {
      return (
        creator.full_name?.toLowerCase().includes(q) ||
        creator.username?.toLowerCase().includes(q) ||
        creator.skills?.some((skill) => skill.toLowerCase().includes(q))
      );
    });
  }, [creators, searchTerm]);

  const sortedCreators = useMemo(() => {
    if (!sortBy) return filteredCreators;

    const list = [...filteredCreators];
    const rate = (c: Creator) => c.hourly_rate ?? Number.POSITIVE_INFINITY;
    const nameKey = (c: Creator) => (displayName(c) + c.username).toLowerCase();

    list.sort((a, b) => {
      if (sortBy === 'price_low') {
        return rate(a) - rate(b) || nameKey(a).localeCompare(nameKey(b));
      }
      return rate(b) - rate(a) || nameKey(a).localeCompare(nameKey(b));
    });
    return list;
  }, [filteredCreators, sortBy]);

  useEffect(() => {
    if (!selectedCreator || !creators.length) return;
    const match = creators.find((c) => c.id === selectedCreator || c.username === selectedCreator);
    if (match) setPendingId(match.id);
  }, [selectedCreator, creators]);

  useEffect(() => {
    if (!creators.length || loading) return;
    const scrollTarget =
      pendingId ||
      preselectedCreatorId ||
      (preselectedCreatorSlug ? creators.find((c) => c.username === preselectedCreatorSlug)?.id : null);
    if (!scrollTarget) return;
    const t = window.setTimeout(() => {
      const element = document.querySelector(`[data-creator-id="${scrollTarget}"]`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, 280);
    return () => window.clearTimeout(t);
  }, [pendingId, creators, loading, preselectedCreatorId, preselectedCreatorSlug]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  const pendingCreator = pendingId
    ? sortedCreators.find((c) => c.id === pendingId) ?? creators.find((c) => c.id === pendingId)
    : null;

  const handleCardActivate = (creator: Creator) => {
    setPendingId(creator.id);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!pendingId) return;
    const t = window.setTimeout(() => {
      try {
        footerRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
      } catch {
        /* ignore */
      }
    }, 50);
    return () => window.clearTimeout(t);
  }, [pendingId]);

  const handleConfirm = () => {
    if (!pendingCreator) return;
    onSelect(pendingCreator.id, pendingCreator.username);
  };

  const isCardSelected = (creator: Creator) =>
    pendingId === creator.id || selectedCreator === creator.id || selectedCreator === creator.username;

  const handleSortClick = (key: SortKey) => {
    setSortBy((current) => (current === key ? null : key));
  };

  if (loading) {
    return (
      <div className="creator-selection loading">
        <div className="loading-spinner" aria-hidden />
        <p>Loading reviewers…</p>
      </div>
    );
  }

  return (
    <div className="creator-selection">
      <div className="step-header">
        <h2>Choose your reviewer</h2>
        <p>Pick who gives your feedback—you can change this before checkout. Prices are per review, set by each reviewer.</p>
      </div>

      <div className="creator-selection-toolbar">
        <div className="search-bar reviewer-search-wrap">
          <span className="reviewer-search-icon" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3-3" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="search"
            enterKeyHint="search"
            placeholder="Search reviewers…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input reviewer-search-input"
            aria-label="Search reviewers"
          />
          {searchTerm.trim() ? (
            <button
              type="button"
              className="reviewer-search-clear"
              onClick={clearSearch}
              aria-label="Clear search"
            >
              ×
            </button>
          ) : null}
        </div>

        <div className="reviewer-sort-chips" role="group" aria-label="Sort reviewers">
          {SORT_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`reviewer-sort-chip${sortBy === key ? ' is-active' : ''}`}
              onClick={() => handleSortClick(key)}
              aria-pressed={sortBy === key}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="creators-grid creators-grid--list">
        {sortedCreators.map((creator) => {
          const selected = isCardSelected(creator);
          return (
            <button
              key={creator.id}
              type="button"
              data-creator-id={creator.id}
              className={`creator-card creator-card--row creator-card--select${selected ? ' selected' : ''}`}
              onClick={() => handleCardActivate(creator)}
              aria-pressed={selected}
            >
              <div className="creator-avatar">
                <AsyncAvatar avatarPathOrUrl={creator.avatar_url || null} alt={displayName(creator)} size={72} />
              </div>

              <div className="creator-info">
                <div className="creator-card-topline">
                  <span className="creator-name">{displayName(creator)}</span>
                  {creator.hourly_rate != null ? (
                    <span className="creator-price-wrap">
                      <span className="creator-price creator-price--badge">${getCheckoutPriceDollars(creator.hourly_rate)}</span>
                      <span className="creator-price-hint">per review</span>
                    </span>
                  ) : null}
                </div>
                {creator.username ? <p className="creator-username">@{creator.username}</p> : null}

                {creator.skills && creator.skills.length > 0 ? (
                  <div className="creator-skills creator-skills--left">
                    {creator.skills.slice(0, 4).map((skill, index) => (
                      <span key={index} className="skill-tag">
                        {skill}
                      </span>
                    ))}
                    {creator.skills.length > 4 ? (
                      <span className="skill-more">+{creator.skills.length - 4}</span>
                    ) : null}
                  </div>
                ) : null}

                {creator.bio ? (
                  <p className="creator-bio">{creator.bio.length > 120 ? `${creator.bio.slice(0, 120)}…` : creator.bio}</p>
                ) : null}
              </div>

              <div className="creator-card-check" aria-hidden>
                {selected ? <span className="creator-card-check-mark">✓</span> : <span className="creator-card-check-ring" />}
              </div>
            </button>
          );
        })}
      </div>

      <div
        ref={footerRef}
        className={`creator-selection-footer creator-selection-footer--sticky-mobile${pendingCreator ? ' creator-selection-footer--active' : ''}`}
      >
        <div className="creator-selection-footer-inner">
          <button
            type="button"
            className="btn-primary creator-selection-continue"
            disabled={!pendingCreator}
            onClick={handleConfirm}
            tabIndex={pendingCreator ? 0 : -1}
          >
            {pendingCreator
              ? `Continue with ${displayName(pendingCreator)} — $${getCheckoutPriceDollars(pendingCreator.hourly_rate ?? 0)} →`
              : 'Select a reviewer to continue'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="error-state">
          <p style={{ color: '#ff6b6b' }}>Error: {error}</p>
          <p>Please check the console for more details.</p>
        </div>
      ) : null}

      {sortedCreators.length === 0 && !loading && !error && creators.length > 0 ? (
        <div className="no-creators">
          <p>No reviewers match your search.</p>
          <button type="button" className="btn-secondary" onClick={clearSearch}>
            Clear search
          </button>
        </div>
      ) : null}

      {creators.length === 0 && !loading && !error ? (
        <div className="no-creators">
          <p>No reviewers are available yet.</p>
        </div>
      ) : null}
    </div>
  );
}
