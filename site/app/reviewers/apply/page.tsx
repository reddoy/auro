'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';

type SocialAccount = {
  provider: 'tiktok' | 'instagram';
  username?: string | null;
};

export default function FoundingReviewerApplyPage() {
  const [step, setStep] = useState<number>(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [marketingConsent, setMarketingConsent] = useState<boolean>(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [focusAreas, setFocusAreas] = useState('');
  const [rate, setRate] = useState<string>('');
  const [socials, setSocials] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const isAuthed = useMemo(() => {
    return false;
  }, []);

  useEffect(() => {
    const sub = supabase.auth.onAuthStateChange((_event, session) => {
      // no-op; we can trigger a re-render by updating local state if needed
    });
    return () => {
      try { (sub as any)?.data?.subscription?.unsubscribe?.(); } catch {}
    };
  }, []);

  const handleAvatarChange = async (f: File | null) => {
    if (!f) {
      setAvatarFile(null);
      setAvatarPreview(null);
      return;
    }
    setAvatarFile(f);
    try {
      const url = URL.createObjectURL(f);
      setAvatarPreview(url);
    } catch {}
  };

  const uploadAvatarViaSignedUrl = async (): Promise<{ url: string; path: string } | null> => {
    if (!avatarFile) return null;
    // Ask server for a signed upload URL and then upload with supabase client
    const contentType = avatarFile.type || 'image/jpeg';
    const res = await fetch('/api/storage/signed-upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fileName: avatarFile.name || 'avatar.jpg', contentType, category: 'selfie', uploadSessionId: 'reviewer-apply' })
    });
    if (!res.ok) throw new Error('Failed to get signed upload URL');
    const { path, token, bucket } = await res.json();
    const { error: uploadErr } = await (supabase.storage as any)
      .from(bucket || 'avatars')
      .uploadToSignedUrl(path, token, avatarFile, { contentType });
    if (uploadErr) throw new Error(uploadErr.message);
    // Sign for immediate preview
    const signRes = await fetch('/api/storage/signed-upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'sign-view', path, expiresIn: 60 * 60 * 24 })
    });
    const signJson = await signRes.json();
    return { url: signJson?.signedUrl || '', path };
  };

  const handleSignUpOrNext = async () => {
    setError('');
    if (step === 1) {
      // Information screen → go to form
      setStep(2);
      return;
    }
    if (step === 2) {
      // Account step: create account
      if (!email || !password || !fullName) {
        setError('Please fill name, email and password');
        return;
      }
      try {
        setLoading(true);
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, phone } }
        });
        if (error) throw error;
        if (data?.user) {
          try {
            await fetch('/api/auth/ensure-profile', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ userId: data.user.id, email, fullName })
            });
          } catch {}
          setStep(3);
        }
      } catch (e: any) {
        setError(e?.message || 'Sign up failed');
      } finally {
        setLoading(false);
      }
      return;
    }
    if (step === 3) {
      // Profile details step
      if (!rate) {
        setError('Please set a rate per review');
        return;
      }
      try {
        setLoading(true);
        const avatar = await uploadAvatarViaSignedUrl();
        // Send application to server
        const resp = await fetch('/api/reviewers/apply', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            bio,
            focusAreas,
            hourlyRate: Number(rate),
            avatarUrl: avatar?.url || null,
            avatarPath: avatar?.path || null,
            socials,
            phone,
            marketingConsent,
          })
        });
        const json = await resp.json();
        if (!resp.ok) throw new Error(json?.error || 'Failed to submit');
        setStep(4);
      } catch (e: any) {
        setError(e?.message || 'Failed to save application');
      } finally {
        setLoading(false);
      }
      return;
    }
  };

  const connectSocial = async (provider: 'tiktok' | 'instagram') => {
    try {
      setLoading(true);
      const { data: u } = await supabase.auth.getUser();
      const userId = u?.user?.id;
      if (!userId) throw new Error('Please sign up first');
      // For now, we simulate linking by calling callback directly with params
      const url = `/api/social/connect/callback/${provider}?user_id=${encodeURIComponent(userId)}&username=${encodeURIComponent(provider)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to link');
      setSocials((prev) => {
        const next = prev.filter((s) => s.provider !== provider);
        next.push({ provider, username: provider });
        return next;
      });
    } catch (e: any) {
      setError(e?.message || 'Failed to connect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="apply-page">
      {step === 1 && (
        <section className="hero">
          <div className="container">
            <div className="hero__inner">
              <div className="hero__copy">
                <h1>Become a Founding Reviewer</h1>
                <p className="sub">Join an exclusive group shaping the next big lifestyle feedback platform.</p>
                <ul className="benefits" style={{ marginTop: 12 }}>
                  <li>Earn more: first 100 creators keep 85% of every payment instead of 80%.</li>
                  <li>Early access = more visibility and influence over the app’s features.</li>
                  <li>Spots are limited — secure your spot today.</li>
                </ul>
                <div style={{ marginTop: 16 }}>
                  <button className="cta-primary" onClick={() => setStep(2)}>Apply Now</button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {step === 2 && (
        <div className="card" style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2>Create your account</h2>
          <p>Sign up with email and set a password. We’ll send a verification email.</p>
          {error && <div className="error-message">{error}</div>}
          <div className="form-grid">
            <div className="form-field">
              <label>Full name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
            </div>
            <div className="form-field">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" />
            </div>
            <div className="form-field">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
            </div>
            <div className="form-field">
              <label>Phone number</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 123 4567" />
              <label className="checkbox-option" style={{ marginTop: 8 }}>
                <input type="checkbox" checked={marketingConsent} onChange={(e) => setMarketingConsent(e.target.checked)} />
                <span className="checkbox-custom"></span>
                I agree to receive marketing messages by email and SMS
              </label>
            </div>
          </div>
          <div className="step-actions">
            <button className="btn-secondary" onClick={() => setStep(1)}>Back</button>
            <button className="btn-primary" disabled={loading} onClick={handleSignUpOrNext}>{loading ? 'Please wait...' : 'Continue'}</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card" style={{ maxWidth: 880, margin: '0 auto' }}>
          <h2>Set up your reviewer profile</h2>
          {error && <div className="error-message">{error}</div>}
          <div className="form-grid">
            <div className="form-field">
              <label>Profile photo</label>
              {avatarPreview ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img src={avatarPreview} alt="Preview" style={{ width: 72, height: 72, borderRadius: 12, objectFit: 'cover' }} />
                  <button className="btn-secondary" onClick={() => { setAvatarFile(null); setAvatarPreview(null); }}>Remove</button>
                </div>
              ) : (
                <input type="file" accept="image/*" onChange={(e) => handleAvatarChange(e.target.files?.[0] || null)} />
              )}
            </div>
            <div className="form-field">
              <label>Rate per review (USD)</label>
              <input type="number" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="e.g. 25" />
            </div>
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label>Bio</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Why you give reviews; what you focus on" rows={4} />
            </div>
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label>Focus areas</label>
              <input value={focusAreas} onChange={(e) => setFocusAreas(e.target.value)} placeholder="e.g., wardrobe, room setup, selfies, dating profile" />
            </div>
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label>Connect socials</label>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button type="button" className="btn-secondary" onClick={() => connectSocial('tiktok')}>Connect TikTok</button>
                <button type="button" className="btn-secondary" onClick={() => connectSocial('instagram')}>Connect Instagram</button>
              </div>
              {socials.length > 0 && (
                <div style={{ marginTop: 8, color: '#666' }}>
                  Linked: {socials.map(s => s.provider).join(', ')}
                </div>
              )}
            </div>
          </div>
          <div className="step-actions">
            <button className="btn-secondary" onClick={() => setStep(2)}>Back</button>
            <button className="btn-primary" disabled={loading} onClick={handleSignUpOrNext}>{loading ? 'Saving...' : 'Submit Application'}</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="card" style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <h2>Thanks — you’re on the list!</h2>
          <p>We sent a verification email to confirm your account. Stay tuned for the app launch — we’ll reach out with next steps.</p>
          <p>If you don’t see the email, check your spam folder.</p>
          <div style={{ marginTop: 16 }}>
            <a href="/" className="btn-primary">Back to Home</a>
          </div>
        </div>
      )}
    </div>
  );
}


