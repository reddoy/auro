'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AdminNav from '@/app/admin/components/AdminNav';
import ParticipantCard, { CopyButton } from '@/app/admin/components/ParticipantCard';
import RequestStatusBadge from '@/app/admin/components/RequestStatusBadge';
import { cn } from '@/lib/utils';
import { formatCents } from '@/lib/admin-display';
import type { ParticipantInfo } from '@/app/admin/components/ParticipantCard';

type Timeline = {
  created_at: string | null;
  accepted_at: string | null;
  denied_at: string | null;
  fulfilled_at: string | null;
  review_submitted_at: string | null;
  deliver_by: string | null;
  accept_by: string | null;
  review_viewed_at: string | null;
  payment_distributed_at: string | null;
};

type PaymentInfo = {
  amount_cents: number | null;
  application_fee_cents: number | null;
  reviewer_amount_cents: number | null;
  payment_distributed: boolean | null;
  payment_distributed_at: string | null;
  payment_distribution_attempts: number | null;
  payment_distribution_error: string | null;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_transfer_id: string | null;
  stripe_refund_id: string | null;
  refund_status: string | null;
  refund_reason: string | null;
  refunded_amount_cents: number | null;
  dispute_status: string | null;
};

type RequestDetail = {
  id: string;
  status: string;
  payment_status: string | null;
  notes: unknown;
  photoUrls: string[];
  videoUrl: string | null;
  timeline: Timeline;
  payment: PaymentInfo;
  reviewee: ParticipantInfo | null;
  reviewer: ParticipantInfo | null;
  dispute: Record<string, unknown> | null;
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c0325] via-[#1a0b2e] to-[#0c0325] text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</div>
    </div>
  );
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function TimelineItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
      <span className="text-xs font-medium text-white/45">{label}</span>
      <span className="text-sm text-white/85">{formatDate(value)}</span>
    </div>
  );
}

export default function AdminRequestDetailPage({ params }: { params: { id: string } }) {
  const requestId = params.id;
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean | 'forbidden' | null>(null);
  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

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
        return false;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIsAuthorized(false);
        return false;
      }
      const h = await authHeader();
      if (!h) {
        setIsAuthorized('forbidden');
        return false;
      }
      const authResponse = await fetch('/api/admin/check-access', { headers: { Authorization: h } });
      if (authResponse.ok) {
        setIsAuthorized(true);
        return true;
      }
      setIsAuthorized('forbidden');
      return false;
    } catch {
      setIsAuthorized(false);
      return false;
    }
  }, [authHeader]);

  const loadDetail = useCallback(async () => {
    if (!requestId) return;
    const h = await authHeader();
    if (!h) return;
    setError(null);
    setRefreshing(true);
    try {
      const res = await fetch(`/api/admin/requests/${requestId}`, {
        headers: { Authorization: h },
        cache: 'no-store',
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error || 'Failed to load request');
        setDetail(null);
        return;
      }
      setDetail(j.request || null);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [authHeader, requestId]);

  useEffect(() => {
    if (!requestId) return;
    void (async () => {
      const ok = await checkAuth();
      if (ok) await loadDetail();
      else setLoading(false);
    })();
  }, [requestId, checkAuth, loadDetail]);

  if (loading) {
    return (
      <Shell>
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-white/60">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          <p className="text-sm font-medium">Loading request…</p>
        </div>
      </Shell>
    );
  }

  if (isAuthorized === false) {
    return (
      <Shell>
        <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center">
          <h1 className="text-xl font-semibold tracking-tight">Sign in required</h1>
          <Link
            href={`/auth/sign-in?redirect_to=/admin/requests/${requestId || ''}`}
            className="mt-6 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
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
        </div>
      </Shell>
    );
  }

  if (error || !detail) {
    return (
      <Shell>
        <AdminNav current="requests" />
        <Link
          href="/admin/requests"
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to requests
        </Link>
        <p className="mt-8 text-center text-sm text-red-200">{error || 'Request not found'}</p>
      </Shell>
    );
  }

  const { payment: p } = detail;

  return (
    <Shell>
      <AdminNav current="requests" />

      <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/admin/requests"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            All requests
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">Request</h1>
            <CopyButton value={detail.id} label={detail.id.slice(0, 8) + '…'} />
            <RequestStatusBadge status={detail.status} />
            {detail.payment_status ? (
              <span className="text-xs font-semibold uppercase tracking-wide text-white/45">
                Payment: {detail.payment_status}
              </span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadDetail()}
          disabled={refreshing}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white/90 disabled:opacity-50"
        >
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          Refresh
        </button>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <ParticipantCard label="Reviewee" participant={detail.reviewee} />
        <ParticipantCard label="Reviewer" participant={detail.reviewer} />
      </div>

      <section className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-white/40">Timeline</h2>
        <div className="mt-4 space-y-3">
          <TimelineItem label="Created" value={detail.timeline.created_at} />
          <TimelineItem label="Accept by" value={detail.timeline.accept_by} />
          <TimelineItem label="Accepted" value={detail.timeline.accepted_at} />
          <TimelineItem label="Deliver by" value={detail.timeline.deliver_by} />
          <TimelineItem label="Review submitted" value={detail.timeline.review_submitted_at} />
          <TimelineItem label="Completed" value={detail.timeline.fulfilled_at} />
          <TimelineItem label="Payout distributed" value={detail.timeline.payment_distributed_at} />
          <TimelineItem label="Denied" value={detail.timeline.denied_at} />
          <TimelineItem label="Review viewed" value={detail.timeline.review_viewed_at} />
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-white/40">Payment</h2>
          <Link href="/admin/payments" className="text-xs font-semibold text-primary hover:underline">
            Open payments dashboard
          </Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs text-white/45">Total charged</p>
            <p className="text-lg font-semibold text-white">{formatCents(p.amount_cents)}</p>
          </div>
          <div>
            <p className="text-xs text-white/45">Platform fee</p>
            <p className="text-lg font-semibold text-white">{formatCents(p.application_fee_cents)}</p>
          </div>
          <div>
            <p className="text-xs text-white/45">Reviewer payout</p>
            <p className="text-lg font-semibold text-white">{formatCents(p.reviewer_amount_cents)}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <span
            className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1',
              p.payment_distributed
                ? 'bg-emerald-400/12 text-emerald-100 ring-emerald-300/20'
                : 'bg-amber-400/12 text-amber-100 ring-amber-300/25'
            )}
          >
            {p.payment_distributed ? 'Payout distributed' : 'Payout pending'}
          </span>
          {p.payment_distributed && p.payment_distributed_at ? (
            <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs font-semibold text-white/70 ring-1 ring-white/10">
              Paid {formatDate(p.payment_distributed_at)}
            </span>
          ) : null}
          {p.refund_status && p.refund_status !== 'none' ? (
            <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs font-semibold text-white/70 ring-1 ring-white/10">
              Refund: {p.refund_status}
            </span>
          ) : null}
        </div>
        {p.payment_distribution_error ? (
          <p className="mt-3 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {p.payment_distribution_error}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          {p.stripe_payment_intent_id ? (
            <CopyButton value={p.stripe_payment_intent_id} label="Payment intent" />
          ) : null}
          {p.stripe_session_id ? <CopyButton value={p.stripe_session_id} label="Session" /> : null}
          {p.stripe_transfer_id ? <CopyButton value={p.stripe_transfer_id} label="Transfer" /> : null}
        </div>
      </section>

      {detail.dispute ? (
        <section className="mt-6 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-5">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-amber-100/80">Dispute</h2>
          <pre className="mt-3 overflow-x-auto text-xs text-amber-50/90">
            {JSON.stringify(detail.dispute, null, 2)}
          </pre>
        </section>
      ) : null}

      {detail.photoUrls.length > 0 ? (
        <section className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
            Submitted photos ({detail.photoUrls.length})
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {detail.photoUrls.map((url, i) => (
              <button
                key={url}
                type="button"
                onClick={() => setLightboxUrl(url)}
                className="aspect-[3/4] overflow-hidden rounded-xl ring-1 ring-white/10 transition hover:ring-primary/50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Submission ${i + 1}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {detail.videoUrl ? (
        <section className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-white/40">Reviewer video</h2>
          <video
            src={detail.videoUrl}
            controls
            className="mt-4 max-h-[480px] w-full rounded-xl bg-black ring-1 ring-white/10"
          />
        </section>
      ) : null}

      {lightboxUrl ? (
        <button
          type="button"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setLightboxUrl(null)}
          aria-label="Close photo preview"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt="Enlarged submission"
            className="max-h-full max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </button>
      ) : null}
    </Shell>
  );
}
