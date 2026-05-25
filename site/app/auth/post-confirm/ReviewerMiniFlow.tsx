'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ReviewerRateInput, { isValidReviewerRate, parseReviewerRate } from '@/components/ReviewerRateInput';
import WebAvatarUploader from '@/components/WebAvatarUploader';

type Props = {
  returnHref: string;
};

type Step = 'profile' | 'rate' | 'photo' | 'acknowledgments' | 'submitted';

export default function ReviewerMiniFlow({ returnHref }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [hourlyRate, setHourlyRate] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [ackQuality, setAckQuality] = useState(false);
  const [ackRespect, setAckRespect] = useState(false);
  const [ackReliability, setAckReliability] = useState(false);

  const fullName = useMemo(
    () => [firstName.trim(), lastName.trim()].filter(Boolean).join(' '),
    [firstName, lastName]
  );
  const primaryButtonClass = 'auth-flow-btn auth-flow-btn-primary w-full';
  const secondaryButtonClass = 'auth-flow-btn auth-flow-btn-secondary w-full';

  useEffect(() => {
    const loadUser = async () => {
      if (!supabase?.auth) return;
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return;
      setUserId(user.id);
      setEmail(user.email || '');
      setFirstName(
        String(user.user_metadata?.first_name || user.user_metadata?.given_name || '').trim()
      );
      setLastName(
        String(user.user_metadata?.last_name || user.user_metadata?.family_name || '').trim()
      );
    };
    void loadUser();
  }, []);

  const submitReviewerApplication = async () => {
    if (!userId || !email) {
      setError('Please sign in again to continue.');
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter your first and last name.');
      return;
    }
    if (!isValidReviewerRate(hourlyRate)) {
      setError('Enter a whole-dollar amount of at least $1 (up to $10,000).');
      return;
    }
    if (!avatarUrl || !avatarPath) {
      setError('Please upload a profile photo.');
      return;
    }
    if (!ackQuality || !ackRespect || !ackReliability) {
      setError('Please acknowledge all reviewer requirements.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await fetch('/api/auth/ensure-profile', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          userId,
          email,
          fullName,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }),
      });

      const resp = await fetch('/api/reviewers/apply-signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          bio: '',
          focusAreas: '',
          hourlyRate: parseReviewerRate(hourlyRate),
          avatarUrl,
          avatarPath,
          socials: [],
          instagramHandle: null,
          tiktokHandle: null,
          phone: null,
          marketingConsent: false,
          userId,
          email,
          fullName,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          reviewerAcknowledgments: {
            quality: ackQuality,
            respect: ackRespect,
            reliability: ackReliability,
            acceptedAt: new Date().toISOString(),
          },
        }),
      });

      const json = await resp.json();
      if (!resp.ok) {
        throw new Error(json?.error || 'Could not submit reviewer application.');
      }

      setStep('submitted');
    } catch (e: any) {
      setError(e?.message || 'Could not submit reviewer application.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#24123B] p-6 text-white shadow-[0_12px_32px_rgba(0,0,0,0.3)]">
      {step === 'profile' && (
        <div className="space-y-5">
          <div>
            <h2 className="text-2xl font-semibold">Set up your reviewer profile</h2>
            <p className="mt-2 text-white/75">
              Before we review your application, confirm your name so your reviewer profile is complete.
            </p>
          </div>
          {error ? <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-200">{error}</p> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder:text-white/45 focus:border-[#F26955] focus:outline-none"
            />
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder:text-white/45 focus:border-[#F26955] focus:outline-none"
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => router.push(returnHref)} className={secondaryButtonClass}>
              Skip for now
            </button>
            <button
              type="button"
              onClick={() => {
                if (!firstName.trim() || !lastName.trim()) {
                  setError('Please enter both first and last name.');
                  return;
                }
                setError('');
                setStep('rate');
              }}
              className={primaryButtonClass}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 'rate' && (
        <div className="space-y-5">
          <div>
            <h2 className="text-2xl font-semibold">Set your rate</h2>
            <p className="mt-2 text-white/75">Set any whole-dollar price per review (minimum $1).</p>
          </div>
          {error ? <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-200">{error}</p> : null}
          <ReviewerRateInput value={hourlyRate} onChange={setHourlyRate} />
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep('profile')} className={secondaryButtonClass}>
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                if (!isValidReviewerRate(hourlyRate)) {
                  setError('Enter a whole-dollar amount of at least $1 (up to $10,000).');
                  return;
                }
                setError('');
                setStep('photo');
              }}
              className={primaryButtonClass}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 'photo' && (
        <div className="space-y-5">
          <div>
            <h2 className="text-2xl font-semibold">Add your profile photo</h2>
            <p className="mt-2 text-white/75">
              Use a clear, front-facing photo so reviewees know who they are working with.
            </p>
          </div>
          {error ? <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-200">{error}</p> : null}
          <WebAvatarUploader
            currentAvatarUrl={avatarUrl}
            onAvatarChange={(url, path) => {
              setAvatarUrl(url);
              setAvatarPath(path);
            }}
            ownerFirstName={firstName}
            ownerLastName={lastName}
            ownerId={userId}
            ownerEmail={email}
            size={132}
          />
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep('rate')} className={secondaryButtonClass}>
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                if (!avatarUrl || !avatarPath) {
                  setError('Please upload a profile photo.');
                  return;
                }
                setError('');
                setStep('acknowledgments');
              }}
              className={primaryButtonClass}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 'acknowledgments' && (
        <div className="space-y-5">
          <div>
            <h2 className="text-2xl font-semibold">Reviewer acknowledgments</h2>
            <p className="mt-2 text-white/75">
              Confirm these expectations before we review your application.
            </p>
          </div>
          {error ? <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-200">{error}</p> : null}
          <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/85">
            <input
              type="checkbox"
              checked={ackQuality}
              onChange={(e) => setAckQuality(e.target.checked)}
              className="mt-0.5 h-4 w-4"
            />
            <span>I will give specific, honest, and respectful feedback that helps users improve.</span>
          </label>
          <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/85">
            <input
              type="checkbox"
              checked={ackRespect}
              onChange={(e) => setAckRespect(e.target.checked)}
              className="mt-0.5 h-4 w-4"
            />
            <span>I understand reviewer access can be revoked if I violate quality or community standards.</span>
          </label>
          <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/85">
            <input
              type="checkbox"
              checked={ackReliability}
              onChange={(e) => setAckReliability(e.target.checked)}
              className="mt-0.5 h-4 w-4"
            />
            <span>I can respond reliably and keep my reviewer profile information accurate.</span>
          </label>
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep('photo')} className={secondaryButtonClass}>
              Back
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={submitReviewerApplication}
              className={`${primaryButtonClass} disabled:opacity-60`}
            >
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </div>
      )}

      {step === 'submitted' && (
        <div className="space-y-5 text-center">
          <h2 className="text-2xl font-semibold">Application submitted</h2>
          <p className="text-base text-white/72">
            Thanks for completing your setup. Every reviewer application is reviewed carefully to keep
            Auro&apos;s community high quality and trusted. We&apos;ll email you as soon as your application is approved or denied.
          </p>
          <button
            type="button"
            onClick={() => router.push(returnHref)}
            className={primaryButtonClass}
          >
            Continue to account status
          </button>
        </div>
      )}
    </div>
  );
}
