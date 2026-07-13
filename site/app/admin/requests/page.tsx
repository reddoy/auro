'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Copy, RefreshCw, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AdminNav from '@/app/admin/components/AdminNav';
import RequestStatusBadge from '@/app/admin/components/RequestStatusBadge';
import { cn } from '@/lib/utils';
import { formatCents } from '@/lib/admin-display';

type ParticipantSummary = {
  id: string;
  email: string | null;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
};

type RequestSummary = {
  id: string;
  status: string;
  payment_status: string | null;
  amount_cents: number | null;
  created_at: string;
  photo_count: number;
  reviewee: ParticipantSummary | null;
  reviewer: ParticipantSummary | null;
};

type StatusFilter = '' | 'pending' | 'paid' | 'in_progress' | 'completed' | 'rejected' | 'timeout' | 'refunded';

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: '', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'paid', label: 'Paid' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'timeout', label: 'Timeout' },
  { id: 'refunded', label: 'Refunded' },
];

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c0325] via-[#1a0b2e] to-[#0c0325] text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</div>
    </div>
  );
}

function ParticipantCell({ participant }: { participant: ParticipantSummary | null }) {
  const [broken, setBroken] = useState(false);

  if (!participant) {
    return <span className="text-white/45">—</span>;
  }

  const initials = participant.displayName
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '??';

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {participant.avatarUrl && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={participant.avatarUrl}
          alt=""
          width={32}
          height={32}
          className="h-8 w-8 shrink-0 rounded-lg object-cover ring-1 ring-white/10"
          onError={() => setBroken(true)}
        />
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-white/[0.12] to-white/[0.04] text-[10px] font-semibold text-white ring-1 ring-white/10">
          {initials}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate font-medium text-white">{participant.displayName}</p>
        {participant.email ? (
          <p className="truncate text-xs text-white/45">{participant.email}</p>
        ) : null}
      </div>
    </div>
  );
}

export default function AdminRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean | 'forbidden' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [listLoading, setListLoading] = useState(false);
  const loadListRequestId = useRef(0);

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

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadList = useCallback(async () => {
    const h = await authHeader();
    if (!h) return;
    const requestId = ++loadListRequestId.current;
    setError(null);
    setListLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50', offset: '0' });
      if (debouncedSearch) params.set('q', debouncedSearch);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/admin/requests?${params.toString()}`, {
        headers: { Authorization: h },
        cache: 'no-store',
      });
      const j = await res.json().catch(() => ({}));
      if (requestId !== loadListRequestId.current) return;
      if (!res.ok) {
        setError(j.error || 'Failed to load requests');
        setRequests([]);
        return;
      }
      setRequests(j.requests || []);
      setTotalCount(typeof j.count === 'number' ? j.count : null);
    } finally {
      if (requestId === loadListRequestId.current) {
        setListLoading(false);
      }
    }
  }, [authHeader, debouncedSearch, statusFilter]);

  useEffect(() => {
    if (isAuthorized !== true) return;
    void loadList();
  }, [isAuthorized, loadList]);

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
            Sign in with your Auro admin account to search and inspect review requests.
          </p>
          <Link
            href="/auth/sign-in?redirect_to=/admin/requests"
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
            This account cannot use admin tools.
          </p>
          <Link href="/" className="mt-6 inline-block text-sm font-semibold text-primary hover:underline">
            Back to home
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <AdminNav current="requests" />

      <header className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/90">Admin</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Requests</h1>
          <p className="mt-1 max-w-xl text-sm text-white/55">
            Search review requests, contact participants, and inspect submissions.
          </p>
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

      <div className="mt-6 flex flex-col gap-4">
        <div className="relative max-w-xl">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Request ID, email, username, or name…"
            className="w-full rounded-xl border border-white/12 bg-white/[0.06] py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-white/35 outline-none ring-primary/40 transition focus:border-primary/40 focus:ring-2"
            aria-label="Search requests"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map(({ id, label }) => (
            <button
              key={id || 'all'}
              type="button"
              onClick={() => setStatusFilter(id)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                statusFilter === id
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {totalCount !== null && (
        <p className="mt-3 text-xs text-white/45">
          Showing {requests.length} of {totalCount} matching requests
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

      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/[0.08] bg-white/[0.03]">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.08] text-[11px] font-semibold uppercase tracking-wide text-white/40">
              <th className="px-4 py-3">Request</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Reviewee</th>
              <th className="px-4 py-3">Reviewer</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr
                key={r.id}
                className="border-b border-white/[0.06] transition hover:bg-white/[0.04]"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-white/80">{r.id.slice(0, 8)}…</code>
                    <button
                      type="button"
                      onClick={() => void navigator.clipboard.writeText(r.id)}
                      className="text-white/35 hover:text-white/70"
                      title="Copy full ID"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {r.photo_count > 0 ? (
                    <p className="mt-0.5 text-xs text-white/40">{r.photo_count} photo{r.photo_count !== 1 ? 's' : ''}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <RequestStatusBadge status={r.status} />
                  {r.payment_status ? (
                    <p className="mt-1 text-xs capitalize text-white/40">{r.payment_status}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <ParticipantCell participant={r.reviewee} />
                </td>
                <td className="px-4 py-3">
                  <ParticipantCell participant={r.reviewer} />
                </td>
                <td className="px-4 py-3 text-white/80">{formatCents(r.amount_cents)}</td>
                <td className="px-4 py-3 text-white/50">
                  {new Date(r.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/requests/${r.id}`}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                  >
                    View
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {requests.length === 0 && !error && !listLoading ? (
        <p className="mt-10 text-center text-sm text-white/45">
          {debouncedSearch || statusFilter ? 'No matching requests.' : 'No requests yet.'}
        </p>
      ) : null}
    </Shell>
  );
}
