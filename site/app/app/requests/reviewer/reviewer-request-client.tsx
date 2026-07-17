'use client';

import AppBackToInbox from '@/components/app/AppBackToInbox';
import AppMountReveal from '@/components/app/AppMountReveal';
import { RequestDetailSkeleton } from '@/components/app/app-skeletons';
import StatusBadge from '@/components/app/StatusBadge';
import { useAppToast } from '@/components/app/AppToastProvider';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  acceptRequest,
  denyRequest,
  getRequestById,
  saveRequestReviewDraft,
  submitRequestReview,
} from '@/lib/api';
import { downloadUrlAsFile, downloadUrlsAsZip, slugForFilename } from '@/lib/download-blob';
import { uploadRequestMediaWeb } from '@/lib/request-media-web';
import { getDisplayAvatarUrl } from '@/lib/avatar';
import { getSignedStorageUrl } from '@/lib/storage-media-url';
import { supabase } from '@/lib/supabase';
import type { DbRequestSummary } from '@/types';

const EXAMPLE_REVIEW_SRC = '/katie_henry_review.mov';

const SUBMIT_CONFIRM =
  'Submit this review?\n\nOnce you submit, you cannot change or replace the video. Make sure this is the right one.';

export default function ReviewerRequestClient({ id }: { id: string }) {
  const router = useRouter();
  const { showToast } = useAppToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [request, setRequest] = useState<DbRequestSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftVideoUrl, setDraftVideoUrl] = useState<string | null>(null);
  const [draftPreviewSrc, setDraftPreviewSrc] = useState<string | null>(null);
  const [requesterName, setRequesterName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [zipping, setZipping] = useState(false);
  const [downloadingPhotoIndex, setDownloadingPhotoIndex] = useState<number | null>(null);

  const clearLocalVideo = useCallback(() => {
    setVideoFile(null);
    setLocalPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const setPickedVideo = useCallback((file: File | null) => {
    setLocalPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
    setVideoFile(file);
  }, []);

  const resolveVideoSrc = useCallback(async (raw: string | null | undefined) => {
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw) || raw.startsWith('blob:')) return raw;
    return (await getSignedStorageUrl(raw, 'request-media')) || raw;
  }, []);

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
      const rowDraftVideo = (row.review as { media?: { videoUrl?: string | null } } | null)?.media
        ?.videoUrl;
      setDraftVideoUrl(rowDraftVideo || null);
      setDraftPreviewSrc(await resolveVideoSrc(rowDraftVideo));
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

      const urls: string[] = [];
      for (const p of row.photos || []) {
        const u = await getSignedStorageUrl(p, 'request-media');
        if (u) urls.push(u);
        else if (/^https?:/i.test(p)) urls.push(p);
      }
      setPhotoUrls(urls);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id, resolveVideoSrc]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    };
  }, [localPreviewUrl]);

  const onAccept = async () => {
    if (!request) return;
    setBusy(true);
    try {
      if (!supabase) {
        showToast('Not configured');
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        showToast('Sign in required');
        return;
      }
      const latest = await getRequestById(id);
      if (!latest) {
        showToast('Request not found');
        return;
      }
      if (latest.influencerId !== user.id) {
        showToast('You do not have access to this request');
        return;
      }
      if (latest.status === 'in_progress') {
        setRequest(latest);
        showToast('Already accepted — you can record your review below.');
        return;
      }
      if (latest.status !== 'paid') {
        showToast(
          latest.status === 'pending' || latest.status === 'accepted'
            ? 'Payment is not complete yet. Ask the requester to finish checkout, then try again.'
            : `This request cannot be accepted right now (status: ${latest.status}).`
        );
        return;
      }
      const updated = await acceptRequest(latest.id);
      setRequest(updated);
      showToast('Accepted — you can start your review.');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Accept failed');
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
    if (!confirm(SUBMIT_CONFIRM)) return;
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
      clearLocalVideo();
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
      setDraftPreviewSrc(await resolveVideoSrc(videoUrl));
      clearLocalVideo();
      showToast('Draft saved — preview below. You can replace it anytime before submitting.');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Could not save draft');
    } finally {
      setDraftSaving(false);
    }
  };

  const onDownloadAllPhotos = async () => {
    if (photoUrls.length === 0) return;
    setZipping(true);
    try {
      const slug = slugForFilename(requesterName, 'reviewee');
      await downloadUrlsAsZip(photoUrls, `auro-${slug}-photos.zip`, 'photo');
      showToast('Photos downloaded');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Could not download photos');
    } finally {
      setZipping(false);
    }
  };

  const onDownloadOnePhoto = async (url: string, index: number) => {
    setDownloadingPhotoIndex(index);
    try {
      await downloadUrlAsFile(url, `photo-${index + 1}.jpg`);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Could not download photo');
    } finally {
      setDownloadingPhotoIndex(null);
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
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

  const showWorkspace = request.status === 'paid' || request.status === 'in_progress';
  const notes = (request.notes || '').trim();
  const activePreview = localPreviewUrl || draftPreviewSrc;
  const hasVideoReady = Boolean(videoFile || draftVideoUrl);

  return (
    <div className="px-4 pb-10 pt-6">
      <AppBackToInbox />
      <AppMountReveal ready={!!request}>
        <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 text-lg font-semibold">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                requesterName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-white">{requesterName}</h1>
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
              <p className="text-sm text-white/70 sm:text-base">
                Payment received. Preview their photos below, then accept to start or decline to
                refund.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={onAccept}
                className="min-h-[48px] w-full rounded-2xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50 hover:bg-primary/90"
              >
                Accept
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onDeny}
                className="min-h-[48px] w-full rounded-2xl border border-white/20 py-3 font-semibold text-white disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          )}

          {showWorkspace && (
            <div className="mt-8 space-y-6">
              <section>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold text-white">Their photos</h2>
                  {photoUrls.length > 0 ? (
                    <button
                      type="button"
                      disabled={zipping}
                      onClick={onDownloadAllPhotos}
                      className="min-h-[40px] shrink-0 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white transition active:bg-white/10 disabled:opacity-50"
                    >
                      {zipping ? 'Preparing…' : 'Download all'}
                    </button>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-white/60">
                  Download these for green screen in TikTok, CapCut, or similar.
                </p>
                {photoUrls.length > 0 ? (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {photoUrls.map((src, i) => (
                      <button
                        key={`${src}-${i}`}
                        type="button"
                        disabled={downloadingPhotoIndex === i}
                        onClick={() => onDownloadOnePhoto(src, i)}
                        className="relative aspect-square overflow-hidden rounded-xl bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:opacity-60"
                        title="Download photo"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className="h-full w-full object-cover" />
                        <span className="absolute inset-x-0 bottom-0 bg-black/65 py-2 text-center text-[11px] font-semibold text-white">
                          {downloadingPhotoIndex === i ? 'Saving…' : 'Download'}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white/55">
                    No photos attached to this request.
                  </p>
                )}
                {notes ? (
                  <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/45">
                      Notes from them
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-white/80">{notes}</p>
                  </div>
                ) : null}
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-white">How to record</h2>
                <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4 text-sm text-white/80">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                      Recommended
                    </span>
                    <p className="font-semibold text-white">TikTok green screen</p>
                  </div>
                  <ol className="mt-3 list-decimal space-y-2 pl-4 text-white/75">
                    <li>Download their photos above.</li>
                    <li>
                      Open TikTok (or CapCut) → Effects → Green Screen → pick a photo → record
                      your feedback over it. Have your face on camera.
                    </li>
                    <li>Export the video, then upload it below when you&apos;re done.</li>
                  </ol>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm font-semibold text-white">Example review</p>
                  <p className="mt-1 text-xs text-white/60">
                    Katie reviewing Henry — honest, specific, face on camera. Aim for that tone:
                    clear feedback, not performance.
                  </p>
                  <video
                    src={EXAMPLE_REVIEW_SRC}
                    controls
                    playsInline
                    preload="metadata"
                    className="mt-3 aspect-video w-full rounded-xl bg-black/40"
                  />
                </div>

                <p className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/65">
                  Face on camera makes feedback feel personal and builds trust. Keep it sharp and
                  useful — what works, what doesn&apos;t, and what to change.
                </p>
              </section>
            </div>
          )}

          {request.status === 'in_progress' && (
            <div className="mt-8 space-y-4">
              <h2 className="text-lg font-semibold text-white">When you&apos;re done, upload here</h2>
              <p className="text-sm text-white/60">
                Upload the exported video. Preview it, replace it if it&apos;s wrong, then submit
                when you&apos;re sure.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setPickedVideo(file);
                }}
              />

              {!activePreview ? (
                <button
                  type="button"
                  onClick={openFilePicker}
                  className="flex min-h-[52px] w-full items-center justify-center rounded-2xl border border-dashed border-white/25 bg-white/[0.03] px-4 py-4 text-sm font-semibold text-white active:bg-white/[0.06]"
                >
                  Choose video
                </button>
              ) : (
                <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/45">
                      {localPreviewUrl ? 'New video (not saved yet)' : 'Saved draft'}
                    </p>
                    {videoFile ? (
                      <span className="max-w-[55%] truncate text-[11px] text-white/55">
                        {videoFile.name}
                      </span>
                    ) : null}
                  </div>
                  <video
                    key={activePreview}
                    src={activePreview}
                    controls
                    playsInline
                    className="aspect-video w-full rounded-xl bg-black/40"
                  />
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={openFilePicker}
                      className="min-h-[48px] rounded-2xl border border-white/20 py-3 text-sm font-semibold text-white active:bg-white/10"
                    >
                      Replace video
                    </button>
                    {localPreviewUrl ? (
                      <button
                        type="button"
                        onClick={clearLocalVideo}
                        className="min-h-[48px] rounded-2xl border border-white/10 py-3 text-sm font-semibold text-white/70 active:bg-white/5"
                      >
                        Clear selection
                      </button>
                    ) : null}
                  </div>
                  {draftVideoUrl && !localPreviewUrl ? (
                    <p className="text-xs text-emerald-100/90">
                      Draft is saved. Replace anytime before you submit.
                    </p>
                  ) : null}
                </div>
              )}

              {videoFile ? (
                <button
                  type="button"
                  disabled={draftSaving}
                  onClick={onSaveDraftVideo}
                  className="min-h-[48px] w-full rounded-2xl border border-white/20 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {draftSaving ? 'Saving draft…' : 'Save as draft'}
                </button>
              ) : null}

              <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 p-3 text-xs text-amber-50/95">
                Submitting delivers the video to the reviewee and notifies them. You can&apos;t
                change it after that — double-check the preview first.
              </div>

              <button
                type="button"
                disabled={busy || !hasVideoReady}
                onClick={onSubmitReview}
                className="min-h-[52px] w-full rounded-2xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50 hover:bg-primary/90"
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
                  playsInline
                  className="mt-4 aspect-video w-full rounded-xl"
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
