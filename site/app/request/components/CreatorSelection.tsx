'use client';

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
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

type SortKey = 'recommended' | 'rating' | 'price_low' | 'price_high' | 'name';
type PriceTier = 'under75' | '75to99' | '100plus';

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

export default function CreatorSelection({ selectedCreator, onSelect, supabase, preselectedCreatorSlug, preselectedCreatorId, isInitializing }: Props) {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(false); // Start as false, will be set to true when we start fetching
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string>('');
  const hasAutoSelectedRef = useRef(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('recommended');
  const [priceTier, setPriceTier] = useState<PriceTier | null>(null);
  const [minRating4, setMinRating4] = useState(false);
  const [skillFilters, setSkillFilters] = useState<string[]>([]);

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
        } catch (authError) {
          console.log('No authenticated user, proceeding without filtering');
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, username, avatar_url, skills, hourly_rate, rating_average, bio, links, stripe_connect_account_id')
          .eq('is_reviewer', 'approved') // Only show approved reviewers
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
        
        // Auto-select and advance if preselectedCreatorSlug or preselectedCreatorId is provided
        // This happens when user comes from the app with a preselected reviewer
        if (filteredCreators.length > 0 && !hasAutoSelectedRef.current) {
          let preselectedCreator: Creator | undefined;
          
          if (preselectedCreatorSlug) {
            preselectedCreator = filteredCreators.find(c => c.username === preselectedCreatorSlug);
          } else if (preselectedCreatorId) {
            preselectedCreator = filteredCreators.find(c => c.id === preselectedCreatorId);
          }
          
          if (preselectedCreator && onSelect) {
            hasAutoSelectedRef.current = true;
            // Use setTimeout to ensure the component has fully rendered and all reviewers are visible before auto-selecting
            setTimeout(() => {
              onSelect(preselectedCreator!.id, preselectedCreator!.username);
            }, 300);
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

  const allSkills = useMemo(() => {
    const set = new Set<string>();
    for (const c of creators) {
      (c.skills || []).forEach((s) => {
        const t = s?.trim();
        if (t) set.add(t);
      });
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [creators]);

  const tierCounts = useMemo(() => {
    let under75 = 0;
    let mid = 0;
    let high = 0;
    for (const c of creators) {
      const p = c.hourly_rate;
      if (p == null) continue;
      if (p < 75) under75++;
      else if (p < 100) mid++;
      else high++;
    }
    return { under75, mid, high };
  }, [creators]);

  const filteredCreators = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return creators.filter((creator) => {
      if (q) {
        const hit =
          creator.full_name?.toLowerCase().includes(q) ||
          creator.username?.toLowerCase().includes(q) ||
          creator.skills?.some((skill) => skill.toLowerCase().includes(q));
        if (!hit) return false;
      }
      if (skillFilters.length > 0) {
        const sk = creator.skills || [];
        const matchesSkill = skillFilters.some((f) => sk.includes(f));
        if (!matchesSkill) return false;
      }
      if (priceTier) {
        const p = creator.hourly_rate;
        if (p == null) return false;
        if (priceTier === 'under75' && p >= 75) return false;
        if (priceTier === '75to99' && (p < 75 || p >= 100)) return false;
        if (priceTier === '100plus' && p < 100) return false;
      }
      if (minRating4 && (creator.rating_average ?? 0) < 4) return false;
      return true;
    });
  }, [creators, searchTerm, skillFilters, priceTier, minRating4]);

  const sortedCreators = useMemo(() => {
    const list = [...filteredCreators];
    const rate = (c: Creator) => c.hourly_rate ?? Number.POSITIVE_INFINITY;
    const rating = (c: Creator) => c.rating_average ?? -1;
    const nameKey = (c: Creator) => (displayName(c) + c.username).toLowerCase();

    list.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return rating(b) - rating(a) || rate(a) - rate(b) || nameKey(a).localeCompare(nameKey(b));
        case 'price_low':
          return rate(a) - rate(b) || rating(b) - rating(a) || nameKey(a).localeCompare(nameKey(b));
        case 'price_high':
          return rate(b) - rate(a) || rating(b) - rating(a) || nameKey(a).localeCompare(nameKey(b));
        case 'name':
          return nameKey(a).localeCompare(nameKey(b));
        case 'recommended':
        default:
          return rating(b) - rating(a) || rate(a) - rate(b) || nameKey(a).localeCompare(nameKey(b));
      }
    });
    return list;
  }, [filteredCreators, sortBy]);

  useEffect(() => {
    if (!selectedCreator || !creators.length) return;
    const match = creators.find((c) => c.id === selectedCreator || c.username === selectedCreator);
    if (match) setPendingId(match.id);
  }, [selectedCreator, creators]);

  // Scroll highlighted / preselected card into view
  useEffect(() => {
    if (!creators.length || loading) return;
    const scrollTarget =
      pendingId ||
      preselectedCreatorId ||
      (preselectedCreatorSlug ? creators.find((c) => c.username === preselectedCreatorSlug)?.id : null);
    if (!scrollTarget) return;
    const t = window.setTimeout(() => {
      const element = document.querySelector(`[data-creator-id="${scrollTarget}"]`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 280);
    return () => window.clearTimeout(t);
  }, [pendingId, creators, loading, preselectedCreatorId, preselectedCreatorSlug]);

  const toggleSkill = useCallback((skill: string) => {
    setSkillFilters((prev) => (prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]));
  }, []);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setSkillFilters([]);
    setPriceTier(null);
    setMinRating4(false);
    setSortBy('recommended');
  }, []);

  const hasActiveFilters =
    searchTerm.trim().length > 0 || skillFilters.length > 0 || priceTier !== null || minRating4 || sortBy !== 'recommended';

  const pendingCreator = pendingId
    ? sortedCreators.find((c) => c.id === pendingId) ?? creators.find((c) => c.id === pendingId)
    : null;
  const pendingHiddenByFilters =
    Boolean(pendingId) && !sortedCreators.some((c) => c.id === pendingId) && Boolean(pendingCreator);

  const handleCardActivate = (creator: Creator) => {
    setPendingId(creator.id);
  };

  const handleConfirm = () => {
    if (!pendingCreator) return;
    onSelect(pendingCreator.id, pendingCreator.username);
  };

  const isCardSelected = (creator: Creator) =>
    pendingId === creator.id || selectedCreator === creator.id || selectedCreator === creator.username;

  // Show local loading only when fetching creators. Avoid duplicating the
  // global page initialization spinner by not rendering here during init.
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
        <p>Use search and filters to narrow the list, tap someone to select them, then continue.</p>
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
            placeholder="Search name, @username, or skill…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input reviewer-search-input"
            aria-label="Search reviewers"
          />
          {searchTerm.trim() ? (
            <button
              type="button"
              className="reviewer-search-clear"
              onClick={() => setSearchTerm('')}
              aria-label="Clear search"
            >
              ×
            </button>
          ) : null}
        </div>

        <div className="reviewer-toolbar-meta">
          <span className="reviewer-count">
            {sortedCreators.length} reviewer{sortedCreators.length === 1 ? '' : 's'}
          </span>
          {hasActiveFilters ? (
            <button type="button" className="reviewer-clear-filters" onClick={clearFilters}>
              Reset filters
            </button>
          ) : null}
        </div>

        <div className="reviewer-filter-row">
          <label className="reviewer-sort-label">
            <span className="sr-only">Sort by</span>
            <select
              className="reviewer-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              aria-label="Sort reviewers"
            >
              <option value="recommended">Recommended</option>
              <option value="rating">Highest rated</option>
              <option value="price_low">Price: low to high</option>
              <option value="price_high">Price: high to low</option>
              <option value="name">Name A–Z</option>
            </select>
          </label>
        </div>

        <div className="reviewer-chip-group" role="group" aria-label="Price">
          <span className="reviewer-chip-heading">Price</span>
          <button
            type="button"
            className={`reviewer-chip ${priceTier === null ? 'is-active' : ''}`}
            onClick={() => setPriceTier(null)}
          >
            Any
          </button>
          {tierCounts.under75 > 0 ? (
            <button
              type="button"
              className={`reviewer-chip ${priceTier === 'under75' ? 'is-active' : ''}`}
              onClick={() => setPriceTier((p) => (p === 'under75' ? null : 'under75'))}
            >
              Under $75
            </button>
          ) : null}
          {tierCounts.mid > 0 ? (
            <button
              type="button"
              className={`reviewer-chip ${priceTier === '75to99' ? 'is-active' : ''}`}
              onClick={() => setPriceTier((p) => (p === '75to99' ? null : '75to99'))}
            >
              $75–99
            </button>
          ) : null}
          {tierCounts.high > 0 ? (
            <button
              type="button"
              className={`reviewer-chip ${priceTier === '100plus' ? 'is-active' : ''}`}
              onClick={() => setPriceTier((p) => (p === '100plus' ? null : '100plus'))}
            >
              $100+
            </button>
          ) : null}
        </div>

        <div className="reviewer-chip-group" role="group" aria-label="Rating">
          <span className="reviewer-chip-heading">Rating</span>
          <button
            type="button"
            className={`reviewer-chip ${!minRating4 ? 'is-active' : ''}`}
            onClick={() => setMinRating4(false)}
          >
            Any
          </button>
          <button
            type="button"
            className={`reviewer-chip ${minRating4 ? 'is-active' : ''}`}
            onClick={() => setMinRating4((v) => !v)}
            aria-pressed={minRating4}
          >
            4+ ★
          </button>
        </div>

        {allSkills.length > 0 ? (
          <div className="reviewer-skills-chips" role="group" aria-label="Filter by specialty">
            <span className="reviewer-chip-heading">Specialty</span>
            <div className="reviewer-skills-scroll">
              {allSkills.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  className={`reviewer-chip reviewer-chip-skill ${skillFilters.includes(skill) ? 'is-active' : ''}`}
                  onClick={() => toggleSkill(skill)}
                  aria-pressed={skillFilters.includes(skill)}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="creators-grid creators-grid--list creators-grid-scroll">
        {sortedCreators.map((creator) => {
          const selected = isCardSelected(creator);
          return (
            <div
              key={creator.id}
              role="button"
              tabIndex={0}
              data-creator-id={creator.id}
              className={`creator-card creator-card--row ${selected ? 'selected' : ''}`}
              onClick={() => handleCardActivate(creator)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCardActivate(creator);
                }
              }}
              aria-pressed={selected}
            >
              <div className="creator-avatar">
                <AsyncAvatar
                  avatarPathOrUrl={creator.avatar_url || null}
                  alt={displayName(creator)}
                  size={72}
                />
              </div>

              <div className="creator-info">
                <div className="creator-card-topline">
                  <h3 className="creator-name">{displayName(creator)}</h3>
                  {creator.hourly_rate != null ? (
                    <span className="creator-price creator-price--badge">${creator.hourly_rate}</span>
                  ) : null}
                </div>
                {creator.username ? <p className="creator-username">@{creator.username}</p> : null}

                {creator.rating_average != null && creator.rating_average > 0 ? (
                  <div className="creator-rating">★ {creator.rating_average.toFixed(1)}</div>
                ) : (
                  <div className="creator-rating creator-rating--muted">New to Auro</div>
                )}

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
            </div>
          );
        })}
      </div>

      <div className="creator-selection-footer">
        {pendingHiddenByFilters ? (
          <p className="reviewer-offscreen-hint">
            Your pick is hidden by the current filters. Clear filters to see their card, or continue anyway.
          </p>
        ) : null}
        <button
          type="button"
          className="btn-primary creator-selection-continue"
          disabled={!pendingCreator}
          onClick={handleConfirm}
        >
          {pendingCreator ? `Continue with ${displayName(pendingCreator)}` : 'Select a reviewer to continue'}
        </button>
      </div>

      {error ? (
        <div className="error-state">
          <p style={{ color: '#ff6b6b' }}>Error: {error}</p>
          <p>Please check the console for more details.</p>
        </div>
      ) : null}

      {sortedCreators.length === 0 && !loading && !error && creators.length > 0 ? (
        <div className="no-creators">
          <p>No reviewers match these filters.</p>
          <button type="button" className="btn-secondary" onClick={clearFilters}>
            Clear filters
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
