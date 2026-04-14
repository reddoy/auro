'use client';

import AppBackToInbox from '@/components/app/AppBackToInbox';
import AppMountReveal from '@/components/app/AppMountReveal';
import { RequestDetailSkeleton } from '@/components/app/app-skeletons';
import StatusBadge from '@/components/app/StatusBadge';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { getRequestById, markReviewAsViewed } from '@/lib/api';
import { getDisplayAvatarUrl } from '@/lib/avatar';
import { getSignedStorageUrl } from '@/lib/storage-media-url';
import { supabase } from '@/lib/supabase';
import type { DbRequestSummary } from '@/types';

export default function ReviewRequestClient({ id }: { id: string }) {
  const [request, setRequest] = useState<DbRequestSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewerName, setReviewerName] = useState('Reviewer');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

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

        {(request.status === 'pending' || request.status === 'accepted') && (
          <p className="mt-8 rounded-xl border border-white/10 bg-white/5 p-4 text-white/70">
            Payment is still pending. Check your email to complete checkout.
          </p>
        )}

        {request.status === 'paid' && (
          <p className="mt-8 text-white/70">
            Payment complete — your reviewer will accept and start soon.
          </p>
        )}

        {request.status === 'in_progress' && (
          <p className="mt-8 text-white/70">Your reviewer is working on this request.</p>
        )}

        {request.status === 'completed' && review && (
          <div className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-lg font-bold text-white">
              Overall {(review.ratings?.overall ?? '—') as string | number}/10
            </p>
            {review.feedback?.generalFeedback ? (
              <p className="whitespace-pre-wrap text-white/70">{review.feedback.generalFeedback}</p>
            ) : null}
            {videoSrc && (
              <video src={videoSrc} controls className="w-full rounded-xl" />
            )}
          </div>
        )}

        {request.status === 'rejected' && (
          <p className="mt-8 text-white/70">This request was declined. If you paid, a refund should process automatically.</p>
        )}
      </div>
      </AppMountReveal>
    </div>
  );
}
