'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { profileDisplayName } from '../../lib/profile-display-name';
import { Star, Filter, TrendingUp, Award, Users } from 'lucide-react';
import Link from 'next/link';
import LandingCTAs from '../../components/LandingCTAs';
import AsyncAvatar from '../request/components/AsyncAvatar';

type Reviewer = {
  id: string;
  displayName: string;
  username: string;
  avatar_url?: string;
  skills?: string[];
  hourly_rate?: number;
  rating_average?: number;
  bio?: string;
  links?: unknown;
  created_at?: string;
};

type FilterType = 'all' | 'top-rated' | 'new' | 'affordable';

const FILTER_OPTIONS: { id: FilterType; label: string; icon: typeof Filter }[] = [
  { id: 'all', label: 'All', icon: Filter },
  { id: 'top-rated', label: 'Top Rated', icon: Award },
  { id: 'new', label: 'New', icon: TrendingUp },
  { id: 'affordable', label: 'Affordable', icon: Users },
];

export default function ReviewersIndexPage() {
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchReviewers = async () => {
      try {
        setError('');
        if (!supabase) {
          console.error('Supabase client is not available');
          setError('Unable to load reviewers. Please refresh the page.');
          return;
        }
        const { data, error } = await supabase
          .from('profiles')
          .select(
            'id, first_name, last_name, username, avatar_url, skills, hourly_rate, rating_average, bio, links, created_at',
          )
          .eq('is_reviewer', 'approved')
          .order('rating_average', { ascending: false, nullsFirst: false });

        if (error) throw error;

        const normalized: Reviewer[] = (data || []).map((c: {
          id: string;
          first_name?: string | null;
          last_name?: string | null;
          username?: string | null;
          avatar_url?: string | null;
          skills?: string[] | null;
          hourly_rate?: number | null;
          rating_average?: number | null;
          bio?: string | null;
          links?: unknown;
          created_at?: string | null;
        }) => ({
          id: c.id,
          username: c.username || '',
          avatar_url: c.avatar_url ?? undefined,
          displayName: profileDisplayName(c) || c.username || 'Reviewer',
          skills: c.skills || [],
          hourly_rate: c.hourly_rate ?? undefined,
          rating_average: c.rating_average ?? undefined,
          bio: c.bio ?? undefined,
          links: c.links ?? undefined,
          created_at: c.created_at ?? undefined,
        }));

        setReviewers(normalized);
      } catch (err: unknown) {
        console.error('Error fetching reviewers:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch reviewers');
      } finally {
        setLoading(false);
      }
    };

    fetchReviewers();
  }, []);

  const getFilteredReviewers = () => {
    let filtered = reviewers.filter((reviewer) => {
      const searchLower = searchTerm.toLowerCase();
      if (!searchTerm.trim()) return true;

      return (
        reviewer.displayName.toLowerCase().includes(searchLower) ||
        reviewer.username?.toLowerCase().includes(searchLower) ||
        reviewer.skills?.some((skill) => skill.toLowerCase().includes(searchLower))
      );
    });

    switch (selectedFilter) {
      case 'top-rated':
        filtered = filtered.filter((c) => c.rating_average && c.rating_average >= 4.5);
        break;
      case 'new':
        filtered = [...filtered].sort((a, b) => {
          const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
          return bTime - aTime;
        });
        break;
      case 'affordable':
        filtered = filtered
          .filter((c) => c.hourly_rate && c.hourly_rate <= 50)
          .sort((a, b) => (a.hourly_rate || 0) - (b.hourly_rate || 0));
        break;
      default:
        break;
    }

    return filtered;
  };

  const filteredReviewers = getFilteredReviewers();

  const clearSearch = () => setSearchTerm('');

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <div className="creator-selection loading">
          <div className="loading-spinner" aria-hidden />
          <p>Loading reviewers…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-16">
      {/* Hero */}
      <section className="px-5 py-10 text-center text-white sm:py-14">
        <h1 className="mb-4 text-[clamp(32px,8vw,56px)] font-extrabold tracking-tight">
          Discover Reviewers
        </h1>
        <p className="mx-auto mb-8 max-w-xl text-[clamp(16px,4vw,20px)] leading-relaxed text-white/90">
          Get honest feedback from verified reviewers on your style, photos, and more
        </p>
        {/* Nav shows these from md+; hero CTAs are mobile-only to avoid duplicate left-aligned desktop layout */}
        <div className="flex justify-center md:hidden">
          <LandingCTAs variant="hero" tone="mobileHero" />
        </div>
      </section>

      {/* Search & Filters */}
      <div className="mx-auto max-w-6xl px-5">
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
            placeholder="Search by name, username, or skills…"
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

        <div className="reviewer-sort-chips mb-8" role="group" aria-label="Filter reviewers">
          {FILTER_OPTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`reviewer-sort-chip flex items-center gap-1.5${selectedFilter === id ? ' is-active' : ''}`}
              onClick={() => setSelectedFilter(id)}
              aria-pressed={selectedFilter === id}
            >
              <Icon size={14} aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Reviewers Grid */}
      <div className="mx-auto max-w-6xl px-5">
        {error ? (
          <div className="error-state mb-6 rounded-2xl border border-red-500/30 bg-red-500/10">
            <p className="text-red-400">Error: {error}</p>
          </div>
        ) : null}

        {filteredReviewers.length === 0 && !error ? (
          <div className="no-creators rounded-2xl border border-white/8 bg-white/[0.04]">
            <p>
              {searchTerm
                ? `No reviewers found matching "${searchTerm}"`
                : 'No reviewers available yet'}
            </p>
            {searchTerm ? (
              <button type="button" className="btn-secondary mt-4" onClick={clearSearch}>
                Clear search
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="creators-grid">
          {filteredReviewers.map((reviewer) => (
            <Link
              key={reviewer.id}
              href={`/${reviewer.username || reviewer.id}`}
              className="creator-card group h-full text-left no-underline transition-all duration-300 hover:-translate-y-1 hover:border-[var(--grad-start)] hover:shadow-[0_12px_40px_rgba(255,111,0,0.15)]"
            >
              {/* Avatar & Basic Info */}
              <div className="mb-4 flex w-full items-center gap-4 text-left">
                <AsyncAvatar
                  avatarPathOrUrl={reviewer.avatar_url}
                  alt={reviewer.displayName}
                  size={70}
                />
                <div className="min-w-0 flex-1">
                  <h3 className="creator-name truncate text-left">{reviewer.displayName}</h3>
                  {reviewer.username && reviewer.displayName !== reviewer.username ? (
                    <p className="creator-username truncate text-left">@{reviewer.username}</p>
                  ) : null}
                </div>
              </div>

              {/* Rating & Price */}
              <div className="mb-4 flex w-full items-center justify-between rounded-xl border border-[var(--grad-start)]/20 bg-[rgba(255,111,0,0.1)] px-3 py-3">
                {reviewer.rating_average ? (
                  <div className="creator-rating mb-0 flex items-center gap-1.5">
                    <Star fill="var(--grad-start)" stroke="var(--grad-start)" size={18} />
                    <span className="font-bold text-white">{reviewer.rating_average.toFixed(1)}</span>
                  </div>
                ) : (
                  <span className="text-sm text-white/70">New</span>
                )}

                {reviewer.hourly_rate ? (
                  <div className="text-right">
                    <div className="text-lg font-bold text-[var(--grad-start)]">
                      ${reviewer.hourly_rate}
                    </div>
                    <div className="text-xs text-white/70">per review</div>
                  </div>
                ) : null}
              </div>

              {/* Bio */}
              {reviewer.bio ? (
                <p className="mb-4 line-clamp-3 text-left text-sm leading-relaxed text-white/70">
                  {reviewer.bio}
                </p>
              ) : null}

              {/* Skills */}
              {reviewer.skills && reviewer.skills.length > 0 ? (
                <div className="creator-skills mt-auto w-full justify-start">
                  {reviewer.skills.slice(0, 3).map((skill, index) => (
                    <span key={index} className="skill-tag">
                      {skill}
                    </span>
                  ))}
                  {reviewer.skills.length > 3 ? (
                    <span className="skill-tag text-white/70">+{reviewer.skills.length - 3}</span>
                  ) : null}
                </div>
              ) : null}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
