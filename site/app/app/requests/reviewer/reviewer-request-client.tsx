'use client';

import AppBackToInbox from '@/components/app/AppBackToInbox';
import AppMountReveal from '@/components/app/AppMountReveal';
import { RequestDetailSkeleton } from '@/components/app/app-skeletons';
import StatusBadge from '@/components/app/StatusBadge';
import { useAppToast } from '@/components/app/AppToastProvider';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  acceptRequest,
  denyRequest,
  getRequestById,
  saveRequestReviewDraft,
  submitRequestReview,
} from '@/lib/api';
import { uploadRequestMediaWeb } from '@/lib/request-media-web';
import { getDisplayAvatarUrl } from '@/lib/avatar';
import { supabase } from '@/lib/supabase';
import type { DbRequestSummary } from '@/types';

export default function ReviewerRequestClient({ id }: { id: string }) {
  const router = useRouter();
  const { showToast } = useAppToast();
  const [request, setRequest] = useState<DbRequestSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftVideoUrl, setDraftVideoUrl] = useState<string | null>(null);
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
      const rowDraftVideo = (row.review as { media?: { videoUrl?: string | null } } | null)?.media?.videoUrl;
      setDraftVideoUrl(rowDraftVideo || null);
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
      showToast(e instanceof Error ? e.message : 'Decline failed');
    } finally {
      setBusy(false);
    }
  };

  const onSubmitReview = async () => {
    if (!request) return;
    if (!videoFile && !draftVideoUrl) {
      showToast('Upload a final video before submitting');
      return;
    }
    setBusy(true);
    try {
      let videoUrl: string | null = draftVideoUrl;
      if (videoFile) {
        const up = await uploadRequestMediaWeb(videoFile, {});
        videoUrl = up.publicUrl || null;
      }
      if (!videoUrl) {
        throw new Error('Could not upload video');
      }
      const updated = await submitRequestReview({
        requestId: request.id,
        videoUrl,
      });
      setRequest(updated);
      showToast('Review submitted');
      router.push('/app/requests?tab=active');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setBusy(false);
    }
  };

  const onSaveDraftVideo = async () => {
    if (!request || !videoFile) return;
    setDraftSaving(true);
    try {
      const up = await uploadRequestMediaWeb(videoFile, {});
      const videoUrl = up.publicUrl || null;
      if (!videoUrl) throw new Error('Could not upload draft video');
      await saveRequestReviewDraft({ requestId: request.id, videoUrl });
      setDraftVideoUrl(videoUrl);
      showToast('Draft video saved');
      await load();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Could not save draft');
    } finally {
      setDraftSaving(false);
    }
  };

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

  return (
    <div className="px-4 pb-8 pt-6">
      <AppBackToInbox />
      <AppMountReveal ready={!!request}>
      <div className="mx-auto max-w-lg">
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
            <h2 className="text-lg font-semibold text-white">Record your video review</h2>

            <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4 text-sm text-white/80">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                  Recommended
                </span>
                <p className="font-semibold text-white">TikTok green screen</p>
              </div>
              <p className="mt-2 text-white/75">
                Use TikTok&apos;s green screen feature, record your feedback over their photos, then download
                the video and upload it here. This is the most popular option.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/75">
              <p className="font-semibold text-white">Or: screen recording with mic</p>
              <p className="mt-2 text-white/70">
                Save the photos to your camera roll, screen-record while talking through them, and make
                sure your microphone is enabled.
              </p>
            </div>

            <p className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/65">
              We always encourage you to have your face on camera — it makes feedback feel personal and
              builds trust.
            </p>

            <label className="block text-sm font-medium text-white/80">
              Video review
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                className="mt-2 w-full text-sm text-white/80 file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-white/15"
              />
            </label>

            {videoFile ? (
              <div className="flex items-center justify-between rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-xs text-white/75">
                <span className="truncate pr-3">{videoFile.name}</span>
                <button
                  type="button"
                  onClick={() => setVideoFile(null)}
                  className="shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold text-white/70 underline-offset-2 hover:text-white hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : null}

            {draftVideoUrl ? (
              <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3 text-xs text-emerald-100">
                Draft uploaded. You can replace it before submitting.
              </div>
            ) : null}

            <button
              type="button"
              disabled={draftSaving || !videoFile}
              onClick={onSaveDraftVideo}
              className="w-full rounded-2xl border border-white/20 py-3 font-semibold text-white disabled:opacity-50"
            >
              {draftSaving ? 'Saving draft…' : 'Save draft video'}
            </button>
            <button
              type="button"
              disabled={busy || (!videoFile && !draftVideoUrl)}
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
            <p className="mt-2 text-sm text-white/65">
              {request.review?.media?.videoUrl
                ? 'Your video review has been delivered. The reviewee has been notified.'
                : 'Review submitted.'}
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

        {['pending', 'rejected'].includes(request.status) && (
          <p className="mt-8 text-white/70">
            {request.status === 'rejected'
              ? 'You declined this request.'
              : 'Waiting on payment or next step.'}
          </p>
        )}
      </div>
      </AppMountReveal>
    </div>
  );
}
