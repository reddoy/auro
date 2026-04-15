'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AdminNav from '@/app/admin/components/AdminNav';
import { cn } from '@/lib/utils';

type ReviewerTab = 'pending' | 'approved' | 'rejected' | 'users';

type ProfileRow = {
  id: string;
  email: string | null;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  bio: string | null;
  skills: string[] | null;
  hourly_rate: number | null;
  avatar_url: string | null;
  links: Record<string, unknown> | null;
  is_reviewer: string | null;
  created_at: string | null;
  stripe_connect_account_id: string | null;
  is_admin?: boolean | null;
};

function profileAvatarViewUrl(avatar_url: string | null | undefined): string | undefined {
  if (!avatar_url) return undefined;
  if (/^https?:\/\//i.test(avatar_url)) return avatar_url;
  return `/api/storage/signed-view?path=${encodeURIComponent(avatar_url)}&bucket=avatars`;
}

function formatDisplayName(p: ProfileRow): string {
  const parts = [p.first_name?.trim(), p.last_name?.trim()].filter(Boolean) as string[];
  if (parts.length) {
    return parts.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }
  if (p.username?.trim()) return p.username.trim();
  if (p.email?.trim()) return p.email.split('@')[0] || p.email;
  return p.id.slice(0, 8);
}

function initials(p: ProfileRow): string {
  const parts = [p.first_name, p.last_name].filter(Boolean) as string[];
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  if (p.username?.trim()) return p.username.trim().replace(/^@/, '').slice(0, 2).toUpperCase();
  return (p.email || '??').slice(0, 2).toUpperCase();
}

function ProfileAvatar({ p, src }: { p: ProfileRow; src?: string }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-white/[0.12] to-white/[0.04] text-sm font-semibold tracking-tight text-white ring-1 ring-white/10 sm:h-[72px] sm:w-[72px] sm:text-base">
        {initials(p)}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={72}
      height={72}
      className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-1 ring-white/10 sm:h-[72px] sm:w-[72px]"
      onError={() => setBroken(true)}
    />
  );
}

type StatusKind = 'pending' | 'approved' | 'rejected' | 'neutral' | 'admin';

function Chip({ kind, children }: { kind: StatusKind; children: React.ReactNode }) {
  const map: Record<StatusKind, string> = {
    pending: 'bg-amber-400/12 text-amber-100 ring-amber-300/25',
    approved: 'bg-emerald-400/12 text-emerald-100 ring-emerald-300/20',
    rejected: 'bg-red-400/12 text-red-100 ring-red-300/25',
    neutral: 'bg-white/[0.06] text-white/70 ring-white/10',
    admin: 'bg-violet-400/12 text-violet-100 ring-violet-300/25',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1',
        map[kind]
      )}
    >
      {children}
    </span>
  );
}

function reviewerChipKind(is_reviewer: string | null): StatusKind {
  if (is_reviewer === 'pending') return 'pending';
  if (is_reviewer === 'approved') return 'approved';
  if (is_reviewer === 'rejected') return 'rejected';
  return 'neutral';
}

function SocialLinks({ links }: { links: Record<string, unknown> | null }) {
  if (!links || typeof links !== 'object') {
    return <p className="text-xs text-white/35">No social links</p>;
  }
  const entries = Object.entries(links).filter(([, v]) => v != null && String(v).trim() !== '');
  if (entries.length === 0) {
    return <p className="text-xs text-white/35">No social links</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([key, val]) => {
        const raw = String(val).trim();
        const label = key.charAt(0).toUpperCase() + key.slice(1);
        const isUrl = /^https?:\/\//i.test(raw);
        return (
          <a
            key={key}
            href={isUrl ? raw : undefined}
            {...(isUrl ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className={cn(
              'inline-flex max-w-[220px] items-center truncate rounded-lg border border-white/12 bg-white/[0.05] px-2.5 py-1 text-xs font-medium text-white/85 transition hover:border-white/20 hover:bg-white/[0.08]',
              isUrl ? 'cursor-pointer' : 'cursor-default opacity-80'
            )}
            title={raw}
          >
            {label}
            {isUrl ? ' ↗' : `: ${raw}`}
          </a>
        );
      })}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c0325] via-[#1a0b2e] to-[#0c0325] text-white">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">{children}</div>
    </div>
  );
}

export default function AdminReviewersPage() {
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean | 'forbidden' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ReviewerTab>('pending');
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [userTotal, setUserTotal] = useState<number | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [listLoading, setListLoading] = useState(false);

  const authHeader = useCallback(async (): Promise<string | null> => {
    if (!supabase?.auth) return null;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ? `Bearer ${session.access_token}` : null;
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      if (!supabase?.auth) {
        setIsAuthorized(false);
        setLoading(false);
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const h = await authHeader();
        if (h) {
          const authResponse = await fetch('/api/admin/check-access', { headers: { Authorization: h } });
          if (authResponse.ok) {
            setIsAuthorized(true);
            setLoading(false);
            return;
          }
        }
        setIsAuthorized('forbidden');
        setLoading(false);
        return;
      }
      setIsAuthorized(false);
      setLoading(false);
    } catch {
      setIsAuthorized(false);
      setLoading(false);
    }
  }, [authHeader]);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  const loadList = useCallback(async () => {
    const h = await authHeader();
    if (!h) return;
    setError(null);
    setListLoading(true);
    try {
      if (tab === 'users') {
        const res = await fetch('/api/admin/users?limit=150&offset=0', { headers: { Authorization: h } });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(j.error || 'Failed to load users');
          setProfiles([]);
          return;
        }
        setProfiles(j.profiles || []);
        setUserTotal(typeof j.count === 'number' ? j.count : null);
        return;
      }
      const res = await fetch(`/api/admin/reviewers?status=${encodeURIComponent(tab)}`, {
        headers: { Authorization: h },
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error || 'Failed to load reviewers');
        setProfiles([]);
        return;
      }
      setProfiles(j.profiles || []);
      setUserTotal(null);
    } finally {
      setListLoading(false);
    }
  }, [authHeader, tab]);

  useEffect(() => {
    if (isAuthorized !== true) return;
    void loadList();
  }, [isAuthorized, loadList]);

  const filteredProfiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) => {
      const name = formatDisplayName(p).toLowerCase();
      const blob = [p.email, p.username, p.id, name, p.bio].filter(Boolean).join(' ').toLowerCase();
      return blob.includes(q);
    });
  }, [profiles, search]);

  const decide = async (userId: string, action: 'approve' | 'reject') => {
    const label = action === 'approve' ? 'Approve' : 'Reject';
    if (!confirm(`${label} this reviewer application?`)) return;
    const h = await authHeader();
    if (!h) return;
    setActingId(userId);
    setError(null);
    try {
      const res = await fetch('/api/admin/reviewers/decision', {
        method: 'POST',
        headers: { Authorization: h, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Request failed');
      await loadList();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setActingId(null);
    }
  };

  if (loading) {
    return (
      <Shell>
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-white/60">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          <p className="text-sm font-medium">Loading admin…</p>
        </div>
      </Shell>
    );
  }

  if (isAuthorized === false) {
    return (
      <Shell>
        <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center">
          <h1 className="text-xl font-semibold tracking-tight">Sign in required</h1>
          <p className="mt-3 text-sm leading-relaxed text-white/65">
            Sign in with your Auro account. Admins need <code className="text-primary">is_admin = true</code> on their
            profile in Supabase, or to be listed in <code className="text-primary">MASTER_ADMIN_EMAILS</code> /{' '}
            <code className="text-primary">MASTER_ADMIN_USER_IDS</code> in the site environment.
          </p>
          <Link
            href="/auth/sign-in?redirect_to=/admin/reviewers"
            className="mt-6 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Sign in
          </Link>
        </div>
      </Shell>
    );
  }

  if (isAuthorized === 'forbidden') {
    return (
      <Shell>
        <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center">
          <h1 className="text-xl font-semibold tracking-tight">Not an admin</h1>
          <p className="mt-3 text-sm leading-relaxed text-white/65">
            You are signed in, but this account cannot use admin tools. Ask the project owner to set{' '}
            <code className="text-primary">is_admin = true</code> on your row in <code className="text-primary">profiles</code>, or add your email to{' '}
            <code className="text-primary">MASTER_ADMIN_EMAILS</code>.
          </p>
          <Link href="/" className="mt-6 inline-block text-sm font-semibold text-primary hover:underline">
            Back to home
          </Link>
        </div>
      </Shell>
    );
  }

  const tabs: { id: ReviewerTab; label: string }[] = [
    { id: 'pending', label: 'Pending' },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'users', label: 'All users' },
  ];

  return (
    <Shell>
      <AdminNav current="people" />

      <header className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/90">Admin</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">People & reviewers</h1>
          <p className="mt-1 max-w-xl text-sm text-white/55">Applications, reviewer status, and profiles in one place.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadList()}
          disabled={listLoading}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white/90 transition hover:border-white/25 hover:bg-white/[0.1] disabled:opacity-50"
        >
          <RefreshCw className={cn('h-4 w-4', listLoading && 'animate-spin')} aria-hidden />
          Refresh
        </button>
      </header>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.04] p-1">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-semibold transition sm:px-4',
                tab === id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, @username, or id…"
            className="w-full rounded-xl border border-white/12 bg-white/[0.06] py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-white/35 outline-none ring-primary/40 transition focus:border-primary/40 focus:ring-2"
            aria-label="Filter list"
          />
        </div>
      </div>

      {tab === 'users' && userTotal !== null && (
        <p className="mt-3 text-xs text-white/45">
          Showing {filteredProfiles.length} of {profiles.length} loaded ({userTotal} total in database).
        </p>
      )}

      {error && (
        <div
          className="mt-4 rounded-xl border border-red-400/35 bg-red-500/10 px-4 py-3 text-sm text-red-100"
          role="alert"
        >
          {error}
        </div>
      )}

      <ul className="mt-6 flex flex-col gap-3">
        {filteredProfiles.map((p) => {
          const av = profileAvatarViewUrl(p.avatar_url || undefined);
          const name = formatDisplayName(p);
          const busy = actingId === p.id;
          const showActions = tab === 'pending' && p.is_reviewer === 'pending';

          return (
            <li
              key={p.id}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 shadow-sm shadow-black/20 backdrop-blur-sm transition hover:border-white/[0.12] sm:p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <ProfileAvatar p={p} src={av} />

                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold tracking-tight text-white">{name}</h2>
                    <Chip kind={reviewerChipKind(p.is_reviewer)}>
                      {p.is_reviewer === 'pending'
                        ? 'Pending'
                        : p.is_reviewer === 'approved'
                          ? 'Reviewer'
                          : p.is_reviewer === 'rejected'
                            ? 'Rejected'
                            : 'User'}
                    </Chip>
                    {p.is_admin ? <Chip kind="admin">Admin</Chip> : null}
                    {p.stripe_connect_account_id ? (
                      <Chip kind="neutral">Stripe</Chip>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-white/55">
                    {p.email ? <span className="truncate">{p.email}</span> : null}
                    {p.username ? (
                      <>
                        <span className="text-white/25" aria-hidden>
                          ·
                        </span>
                        <span>@{p.username}</span>
                        <span className="text-white/25" aria-hidden>
                          ·
                        </span>
                        <Link
                          href={`/${encodeURIComponent(p.username)}`}
                          className="font-medium text-primary hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Public profile
                        </Link>
                      </>
                    ) : null}
                  </div>

                  {p.bio ? (
                    <p className="line-clamp-3 text-sm leading-relaxed text-white/75">{p.bio}</p>
                  ) : null}

                  {p.skills && p.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {p.skills.slice(0, 8).map((s) => (
                        <span
                          key={s}
                          className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-white/70"
                        >
                          {s}
                        </span>
                      ))}
                      {p.skills.length > 8 ? (
                        <span className="self-center text-[11px] text-white/40">+{p.skills.length - 8} more</span>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-white/50">
                    {p.hourly_rate != null ? (
                      <span>
                        Rate: <span className="font-semibold text-white/80">${Number(p.hourly_rate).toFixed(2)}</span>{' '}
                        <span className="text-white/35">USD</span>
                      </span>
                    ) : null}
                    {p.created_at ? (
                      <span className="text-white/35">Joined {new Date(p.created_at).toLocaleDateString()}</span>
                    ) : null}
                  </div>

                  <div className="border-t border-white/[0.06] pt-3">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-white/40">Social</p>
                    <SocialLinks links={p.links} />
                  </div>
                </div>

                {showActions ? (
                  <div className="flex shrink-0 flex-row gap-2 sm:flex-col sm:items-stretch">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void decide(p.id, 'approve')}
                      className="rounded-xl bg-emerald-600/90 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-50"
                    >
                      {busy ? '…' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void decide(p.id, 'reject')}
                      className="rounded-xl border border-red-400/40 bg-red-500/15 px-4 py-2.5 text-sm font-semibold text-red-100 transition hover:bg-red-500/25 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {filteredProfiles.length === 0 && !error ? (
        <p className="mt-10 text-center text-sm text-white/45">
          {search.trim() ? 'No matches for that search.' : 'No rows for this filter.'}
        </p>
      ) : null}
    </Shell>
  );
}
