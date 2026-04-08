'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  acceptRequest,
  denyRequest,
  getRequestById,
  submitRequestReview,
} from '@/lib/api';
import { uploadRequestMediaWeb } from '@/lib/request-media-web';
import { getDisplayAvatarUrl } from '@/lib/avatar';
import { supabase } from '@/lib/supabase';
import type { DbRequestSummary } from '@/types';
import StatusBadge from '@/components/app/StatusBadge';

export default function ReviewerRequestClient({ id }: { id: string }) {
  const router = useRouter();
  const [request, setRequest] = useState<DbRequestSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [overall, setOverall] = useState(7);
  const [feedback, setFeedback] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [requesterName, setRequesterName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

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
      if (row.influencerId !== user.id) {
        setError('You do not have access to this request');
        return;
      }
      setRequest(row);
      const name =
        row.requester_name ||
        (row as { requester_username?: string }).requester_username ||
        'Requester';
      setRequesterName(name);
      const uid = row.userId;
      if (uid) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('first_name,last_name,username,avatar_url')
          .eq('id', uid)
          .maybeSingle();
        if (prof) {
          const dn =
            [prof.first_name, prof.last_name].filter(Boolean).join(' ') ||
            prof.username ||
            name;
          setRequesterName(dn);
          if (prof.avatar_url) {
            const u = await getDisplayAvatarUrl(prof.avatar_url);
            setAvatarUrl(u);
          }
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

  const onAccept = async () => {
    if (!request) return;
    setBusy(true);
    try {
      const updated = await acceptRequest(request.id);
      setRequest(updated);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Accept failed');
    } finally {
      setBusy(false);
    }
  };

  const onDeny = async () => {
    if (!request) return;
    if (!confirm('Decline this request? The requester will be refunded if payment completed.')) return;
    setBusy(true);
    try {
      const updated = await denyRequest(request.id);
      setRequest(updated);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Decline failed');
    } finally {
      setBusy(false);
    }
  };

  const onSubmitReview = async () => {
    if (!request) return;
    if (overall < 1 || overall > 10) {
      alert('Overall rating must be 1–10');
      return;
    }
    setBusy(true);
    try {
      let videoUrl: string | null = null;
      if (videoFile) {
        const up = await uploadRequestMediaWeb(videoFile, {});
        videoUrl = up.publicUrl || null;
      }
      const updated = await submitRequestReview({
        requestId: request.id,
        review: {
          ratings: { overall },
          feedback: {
            generalFeedback: feedback.trim() || undefined,
            strengths: [],
            improvements: [],
          },
        },
        videoUrl,
        imageUrl: null,
      });
      setRequest(updated);
      alert('Review submitted!');
      router.push('/app/requests');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-10 text-center text-white/70">
        Loading…
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="px-4 py-10">
        <p className="text-red-300">{error || 'Not found'}</p>
        <Link href="/app/requests" className="mt-4 inline-block text-primary">
          ← Back to list
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 pb-8 pt-6">
      <Link href="/app/requests" className="text-sm text-primary">
        ← My reviews
      </Link>
      <div className="mx-auto mt-4 max-w-lg">
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-white/10 text-lg font-semibold"
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              requesterName.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{requesterName}</h1>
            <p className="text-sm text-white/70">
              {new Date(request.createdAt).toLocaleString()}
            </p>
            <div className="mt-2">
              <StatusBadge status={request.status} />
            </div>
          </div>
        </div>

        {request.status === 'paid' && (
          <div className="mt-8 space-y-3">
            <p className="text-white/70">Payment received. Accept to start or decline to refund.</p>
            <button
              type="button"
              disabled={busy}
              onClick={onAccept}
              className="w-full rounded-2xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50 hover:bg-primary/90"
            >
              Accept
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onDeny}
              className="w-full rounded-2xl border border-white/20 py-3 font-semibold text-white disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        )}

        {request.status === 'in_progress' && (
          <div className="mt-8 space-y-4">
            <h2 className="text-lg font-semibold text-white">Submit review</h2>
            <label className="block text-sm text-white/70">
              Overall (1–10)
              <input
                type="number"
                min={1}
                max={10}
                value={overall}
                onChange={(e) => setOverall(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white"
              />
            </label>
            <label className="block text-sm text-white/70">
              Written feedback (optional)
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
                className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white placeholder:text-white/30"
                placeholder="What went well, what to improve…"
              />
            </label>
            <label className="block text-sm text-white/70">
              Video review (optional)
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                className="mt-1 w-full text-sm text-white/80"
              />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={onSubmitReview}
              className="w-full rounded-2xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50 hover:bg-primary/90"
            >
              {busy ? 'Submitting…' : 'Submit review'}
            </button>
          </div>
        )}

        {request.status === 'completed' && request.review && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="font-semibold text-white">Submitted</p>
            <p className="mt-2 text-white/70">
              Overall: {(request.review as { ratings?: { overall?: number } }).ratings?.overall ?? '—'}/10
            </p>
            {(request.review as { media?: { videoUrl?: string | null } }).media?.videoUrl && (
              <video
                src={(request.review as { media: { videoUrl: string } }).media.videoUrl}
                controls
                className="mt-4 w-full rounded-xl"
              />
            )}
          </div>
        )}

        {['pending', 'accepted', 'rejected'].includes(request.status) && (
          <p className="mt-8 text-white/70">
            {request.status === 'rejected'
              ? 'You declined this request.'
              : 'Waiting on payment or next step.'}
          </p>
        )}
      </div>
    </div>
  );
}
