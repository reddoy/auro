'use client';

import AppBackToInbox from '@/components/app/AppBackToInbox';
import AppMountReveal from '@/components/app/AppMountReveal';
import { RequestDetailSkeleton } from '@/components/app/app-skeletons';
import StatusBadge from '@/components/app/StatusBadge';
import { useAppToast } from '@/components/app/AppToastProvider';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getRequestById,
  getReviewerReviewByRequestId,
  markReviewAsViewed,
  submitReviewerReview,
  type ReviewerReview,
} from '@/lib/api';
import { APP_INBOX_QUERY_KEY } from '@/hooks/useAppInboxQuery';
import { getDisplayAvatarUrl } from '@/lib/avatar';
import { getSignedStorageUrl } from '@/lib/storage-media-url';
import { supabase } from '@/lib/supabase';
import type { DbRequestSummary } from '@/types';

export default function ReviewRequestClient({ id }: { id: string }) {
  const { showToast } = useAppToast();
  const queryClient = useQueryClient();
  const [request, setRequest] = useState<DbRequestSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewerName, setReviewerName] = useState('Reviewer');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [reviewerReview, setReviewerReview] = useState<ReviewerReview | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!supabase) {
        setError('Not configured');
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError('Sign in required');
        return;
      }
      const row = await getRequestById(id);
      if (!row) {
        setError('Request not found');
        return;
      }
      if (row.userId !== user.id) {
        setError('You do not have access to this request');
        return;
      }
      setRequest(row);

      const { data: prof } = await supabase
        .from('profiles')
        .select('first_name,last_name,username,avatar_url')
        .eq('id', row.influencerId)
        .maybeSingle();
      if (prof) {
        const dn =
          [prof.first_name, prof.last_name].filter(Boolean).join(' ') ||
          prof.username ||
          'Reviewer';
        setReviewerName(dn);
        if (prof.avatar_url) {
          setAvatarUrl(await getDisplayAvatarUrl(prof.avatar_url));
        }
      }

      const urls: string[] = [];
      for (const p of row.photos || []) {
        const u = await getSignedStorageUrl(p, 'request-media');
        if (u) urls.push(u);
        else if (/^https?:/i.test(p)) urls.push(p);
      }
      setPhotoUrls(urls);

      const v = (row.review as { media?: { videoUrl?: string | null } } | null)?.media?.videoUrl;
      if (v) {
        setVideoSrc(/^https?:/i.test(v) ? v : (await getSignedStorageUrl(v, 'request-media')) || v);
      } else {
        setVideoSrc(null);
      }

      if (row.status === 'completed' && row.review) {
        markReviewAsViewed(row.id).catch(() => {});
        try {
          const existing = await getReviewerReviewByRequestId(row.id);
          setReviewerReview(existing);
        } catch {
          // non-blocking — card will show without prior rating
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const onSubmitRating = useCallback(async () => {
    if (!request) return;
    if (rating < 1 || rating > 5) {
      showToast('Pick a star rating');
      return;
    }
    setSubmittingRating(true);
    try {
      const trimmed = comment.trim();
      const result = await submitReviewerReview({
        requestId: request.id,
        rating,
        comment: trimmed ? trimmed : undefined,
      });
      setReviewerReview(result);
      showToast('Thanks for rating your reviewer');
      // Refresh inbox so the 'Rate your reviewer' pill clears from the list.
      void queryClient.invalidateQueries({ queryKey: APP_INBOX_QUERY_KEY });
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Could not submit rating');
    } finally {
      setSubmittingRating(false);
    }
  }, [request, rating, comment, showToast, queryClient]);

  if (loading) {
    return <RequestDetailSkeleton />;
  }

  if (error || !request) {
    return (
      <div className="px-4 py-10">
        <p className="text-red-300">{error || 'Not found'}</p>
        <Link
          href="/app/requests?tab=active"
          className="mt-4 inline-block text-sm font-medium text-primary"
        >
          ← Back to inbox
        </Link>
      </div>
    );
  }

  const review = request.review as
    | {
        ratings?: { overall?: number };
        feedback?: { generalFeedback?: string };
        media?: { videoUrl?: string | null };
      }
    | null
    | undefined;

  const shownStars = hoverRating || rating;

  return (
    <div className="px-4 pb-8 pt-6">
      <AppBackToInbox />
      <AppMountReveal ready={!!request}>
      <div className="mx-auto max-w-lg">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-white/10 text-lg font-semibold text-white">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              reviewerName.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{reviewerName}</h1>
            <p className="text-sm text-white/70">
              {new Date(request.createdAt).toLocaleString()}
            </p>
            <div className="mt-2">
              <StatusBadge status={request.status} />
            </div>
          </div>
        </div>

        {photoUrls.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-sm font-medium text-white/70">Photos</p>
            <div className="flex flex-wrap gap-2">
              {photoUrls.map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={src}
                  src={src}
                  alt=""
                  className="h-24 w-24 rounded-xl object-cover"
                />
              ))}
            </div>
          </div>
        )}

        {request.status === 'pending' && (
          <p className="mt-8 rounded-xl border border-white/10 bg-white/5 p-4 text-white/70">
            Payment is still pending. Check your email to complete checkout.
          </p>
        )}

        {request.status === 'paid' && (
          <div className="mt-8 space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/75">
            <p className="font-medium text-white">Payment received</p>
            <p>
              Your reviewer can accept or decline this request. If they decline, you will receive a full
              refund (typically 5–10 business days on your card).
            </p>
            <p className="text-white/60">
              If they do not respond within 2 weeks, you are automatically refunded.
            </p>
          </div>
        )}

        {request.status === 'in_progress' && (
          <p className="mt-8 text-white/70">
            Your reviewer is working on this request. Once they upload and submit the final video, it will appear here.
          </p>
        )}

        {request.status === 'completed' && review && (
          <div className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-lg font-semibold text-white">
              {reviewerName}&apos;s review
            </p>
            {videoSrc ? (
              <video src={videoSrc} controls className="w-full rounded-xl" />
            ) : (
              <p className="text-sm text-white/60">Your reviewer didn&apos;t attach a video.</p>
            )}
            {review.feedback?.generalFeedback ? (
              <p className="whitespace-pre-wrap text-sm text-white/75">{review.feedback.generalFeedback}</p>
            ) : null}
          </div>
        )}

        {request.status === 'completed' && videoSrc && (
          reviewerReview ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-sm text-white/65">You rated {reviewerName}</p>
              <div className="mt-1 flex items-center gap-2">
                <div className="flex" aria-label={`Rated ${reviewerReview.rating} out of 5`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span
                      key={n}
                      className={
                        n <= reviewerReview.rating ? 'text-primary' : 'text-white/20'
                      }
                      style={{ fontSize: 20, lineHeight: 1 }}
                      aria-hidden="true"
                    >
                      ★
                    </span>
                  ))}
                </div>
                <span className="text-sm font-semibold text-white">
                  {reviewerReview.rating}/5
                </span>
              </div>
              {reviewerReview.comment ? (
                <p className="mt-3 whitespace-pre-wrap text-sm text-white/75">{reviewerReview.comment}</p>
              ) : null}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-base font-semibold text-white">Rate {reviewerName}</p>
              <p className="mt-1 text-sm text-white/60">
                Honest ratings help other guys find the best reviewers. Takes ten seconds.
              </p>

              <div className="mt-4 flex items-center gap-1.5" role="radiogroup" aria-label="Star rating">
                {[1, 2, 3, 4, 5].map((n) => {
                  const active = n <= shownStars;
                  return (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={rating === n}
                      aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
                      onClick={() => setRating(n)}
                      onMouseEnter={() => setHoverRating(n)}
                      onMouseLeave={() => setHoverRating(0)}
                      onFocus={() => setHoverRating(n)}
                      onBlur={() => setHoverRating(0)}
                      className="rounded-md p-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                    >
                      <span
                        className={`block transition ${active ? 'text-primary' : 'text-white/25'}`}
                        style={{ fontSize: 32, lineHeight: 1 }}
                        aria-hidden="true"
                      >
                        ★
                      </span>
                    </button>
                  );
                })}
              </div>

              <label className="mt-4 block text-sm font-medium text-white/75">
                Note (optional)
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Kept private to your reviewer."
                  rows={3}
                  maxLength={500}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-white/35 focus:border-primary/60 focus:outline-none"
                />
              </label>

              <button
                type="button"
                disabled={submittingRating || rating < 1}
                onClick={onSubmitRating}
                className="mt-4 w-full rounded-2xl bg-primary py-3 font-semibold text-primary-foreground transition hover:bg-primary/92 disabled:opacity-50"
              >
                {submittingRating ? 'Submitting…' : 'Submit rating'}
              </button>
            </div>
          )
        )}

        {request.status === 'rejected' && (
          <p className="mt-8 text-white/70">This request was declined. A refund has been issued — it should appear on your card within a few business days.</p>
        )}

        {request.status === 'timeout' && (
          <p className="mt-8 text-white/70">
            This review expired before it could be completed. You have been refunded (or your refund is processing) — it
            should appear on your card within a few business days.
          </p>
        )}

        {request.status === 'refunded' && (
          <p className="mt-8 text-white/70">This request was refunded. The refund should appear on your card within a few business days.</p>
        )}
      </div>
      </AppMountReveal>
    </div>
  );
}
