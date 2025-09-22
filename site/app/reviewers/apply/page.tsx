'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';

type SocialAccount = {
  provider: 'tiktok' | 'instagram';
  username?: string | null;
};

export default function FoundingReviewerApplyPage() {
  const [step, setStep] = useState<number>(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [marketingConsent, setMarketingConsent] = useState<boolean>(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [focusAreas, setFocusAreas] = useState('');
  const [rate, setRate] = useState<string>('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [tiktokHandle, setTiktokHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const avatarInputRef = useRef<HTMLInputElement>(null);

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

  const passwordStrength = useMemo(() => {
    const val = password || '';
    let score = 0;
    if (val.length >= 8) score += 1;
    if (/[A-Z]/.test(val)) score += 1;
    if (/[a-z]/.test(val)) score += 1;
    if (/\d/.test(val)) score += 1;
    if (/[^A-Za-z0-9]/.test(val)) score += 1;
    const labels = ['Very Weak','Weak','Moderate','Strong','Very Strong'];
    return { score, label: labels[Math.max(0, Math.min(4, score - 1))] };
  }, [password]);

  const isPasswordValid = useMemo(() => {
    return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
  }, [password]);

  const passwordsMatch = useMemo(() => password && passwordConfirm && password === passwordConfirm, [password, passwordConfirm]);

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

  const handleNext = async () => {
    setError('');
    if (step === 1) {
      // Information screen → go to form
      setStep(2);
      return;
    }
    if (step === 2) {
      // Account basics step
      if (!fullName || !email) { setError('Please enter your name and email'); return; }
      setStep(3);
      return;
    }
    if (step === 3) {
      // Password creation and account sign-up
      if (!password || !passwordConfirm) { setError('Please create and confirm your password'); return; }
      if (!isPasswordValid) { setError('Password must be at least 8 chars with uppercase, lowercase, number, and symbol'); return; }
      if (!passwordsMatch) { setError('Passwords do not match'); return; }
      try {
        setLoading(true);
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
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
          setStep(4);
        }
      } catch (e: any) {
        setError(e?.message || 'Sign up failed');
      } finally {
        setLoading(false);
      }
      return;
    }
    if (step === 4) {
      // Profile details step
      if (!rate || isNaN(Number(rate)) || Number(rate) <= 0) { setError('Please enter a valid rate'); return; }
      setStep(5);
      return;
    }
    if (step === 5) {
      // Socials step -> go to Bio & Focus
      setStep(6);
      return;
    }
    if (step === 6) {
      try {
        setLoading(true);
        const avatar = await uploadAvatarViaSignedUrl();
        const { data: s } = await supabase.auth.getSession();
        const token = (s as any)?.session?.access_token as string | undefined;
        let explicitUserId: string | null = null;
        try {
          const { data: u } = await supabase.auth.getUser();
          explicitUserId = (u?.user?.id as string) || null;
        } catch {}
        const socialArray: SocialAccount[] = [];
        const clean = (h: string) => (h || '').trim().replace(/^@+/, '');
        if (instagramHandle.trim()) socialArray.push({ provider: 'instagram', username: clean(instagramHandle) });
        if (tiktokHandle.trim()) socialArray.push({ provider: 'tiktok', username: clean(tiktokHandle) });

        const resp = await fetch('/api/reviewers/apply', {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            bio,
            focusAreas,
            hourlyRate: Number(rate),
            avatarUrl: avatar?.url || null,
            avatarPath: avatar?.path || null,
            socials: socialArray,
            instagramHandle: instagramHandle || null,
            tiktokHandle: tiktokHandle || null,
            phone,
            marketingConsent,
            userId: explicitUserId || null,
          })
        });
        const json = await resp.json();
        if (!resp.ok) throw new Error(json?.error || 'Failed to submit');
        setStep(7);
      } catch (e: any) {
        setError(e?.message || 'Failed to submit application');
      } finally {
        setLoading(false);
      }
      return;
    }
  };

  // Stepper UI helper (match request flow styles)
  const Stepper = () => (
    <div className="progress-bar">
      {['Intro','Account','Password','Profile','Socials','Bio & Focus','Done'].map((label, idx) => {
        const s = idx + 1;
        const stateClass = step === s ? 'current' : (step > s ? 'active' : '');
        const isClickable = s < step; // allow navigating back to completed steps
        const handleClick = () => {
          if (isClickable) setStep(s);
        };
        return (
          <div
            key={label}
            className={`progress-step ${stateClass}`}
            onClick={handleClick}
            role={isClickable ? 'button' : undefined}
            style={isClickable ? { cursor: 'pointer' } : undefined}
            aria-disabled={!isClickable}
            aria-current={step === s ? 'step' : undefined}
            tabIndex={isClickable ? 0 : -1}
            onKeyDown={(e) => { if (isClickable && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setStep(s); } }}
          >
            <div className="step-number">{step > s ? '✓' : s}</div>
            <div className="step-title">{label}</div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="apply-page request-page">
      <div className="container" style={{ marginBottom: 16 }}>
        <Stepper />
      </div>
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
        <div className="container">
          <div className="request-content">
            <div className="step-header">
              <h2>Account</h2>
              <p>Tell us who you are and how to reach you.</p>
            </div>
            {error && <div className="error-message">{error}</div>}
            <div className="form-fields">
              <div className="form-field">
                <label>Full name</label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
              </div>
              <div className="form-field">
                <label>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" />
              </div>
            </div>
            <div className="step-actions">
              <button className="btn-secondary" onClick={() => setStep(1)}>Back</button>
              <button className="btn-primary" disabled={loading} onClick={handleNext}>{loading ? 'Please wait...' : 'Continue'}</button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="container">
          <div className="request-content">
            <div className="step-header">
              <h2>Create a password</h2>
            </div>
            {error && <div className="error-message">{error}</div>}
            <div className="form-fields">
              <div className="form-field">
                <label>Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 chars, upper, lower, number, symbol" />
                <div style={{ marginTop: 6, fontSize: 12, color: isPasswordValid ? '#10b981' : '#ef4444' }}>Strength: {passwordStrength.label}</div>
              </div>
              <div className="form-field">
                <label>Confirm password</label>
                <input type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} placeholder="Re-enter password" />
                {!passwordsMatch && passwordConfirm.length > 0 && (
                  <div style={{ marginTop: 6, fontSize: 12, color: '#ef4444' }}>Passwords do not match</div>
                )}
              </div>
            </div>
            <div className="step-actions">
              <button className="btn-secondary" onClick={() => setStep(2)}>Back</button>
              <button className="btn-primary" disabled={loading} onClick={handleNext}>{loading ? 'Creating...' : 'Continue'}</button>
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="container">
          <div className="request-content">
            <div className="step-header">
              <h2>Set up your reviewer profile</h2>
            </div>
            {error && <div className="error-message">{error}</div>}
            <div className="form-fields">
              <div className="form-field">
                <label>Profile photo</label>
                {avatarPreview ? (
                  <div className="photo-item" style={{ width: 120, height: 120 }}>
                    <img src={avatarPreview} alt="Preview" />
                    <button type="button" className="remove-photo" onClick={() => { setAvatarFile(null); setAvatarPreview(null); }}>×</button>
                  </div>
                ) : (
                  <div className="upload-placeholder" style={{ width: 160, height: 160 }} onClick={() => avatarInputRef.current?.click()}>
                    <div className="upload-icon">🤳</div>
                    <span>Add profile photo</span>
                  </div>
                )}
                <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleAvatarChange(e.target.files?.[0] || null)} />
              </div>
              <div className="form-field">
                <label>Rate per review (USD)</label>
                <input type="number" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="e.g. 25" />
              </div>
            </div>
            <div className="step-actions">
              <button className="btn-secondary" onClick={() => setStep(3)}>Back</button>
              <button className="btn-primary" disabled={loading} onClick={handleNext}>{loading ? 'Saving...' : 'Continue'}</button>
            </div>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="container">
          <div className="request-content">
            <div className="step-header">
              <h2>Socials</h2>
            </div>
            {error && <div className="error-message">{error}</div>}
            <div className="form-fields">
              <div className="form-field">
                <label>Instagram handle</label>
                <input value={instagramHandle} onChange={(e) => setInstagramHandle(e.target.value)} placeholder="@username" />
              </div>
              <div className="form-field">
                <label>TikTok handle</label>
                <input value={tiktokHandle} onChange={(e) => setTiktokHandle(e.target.value)} placeholder="@username" />
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
              <button className="btn-secondary" onClick={() => setStep(4)}>Back</button>
              <button className="btn-primary" disabled={loading} onClick={handleNext}>{loading ? 'Next...' : 'Continue'}</button>
            </div>
          </div>
        </div>
      )}

      {step === 6 && (
        <div className="container">
          <div className="request-content">
            <div className="step-header">
              <h2>Bio & Focus</h2>
            </div>
            {error && <div className="error-message">{error}</div>}
            <div className="form-fields">
              <div className="form-field">
                <label>Bio</label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Why you give reviews; what you focus on" rows={4} />
              </div>
              <div className="form-field">
                <label>Focus areas</label>
                <input value={focusAreas} onChange={(e) => setFocusAreas(e.target.value)} placeholder="e.g., wardrobe, room setup, selfies, dating profile" />
              </div>
            </div>
            <div className="step-actions">
              <button className="btn-secondary" onClick={() => setStep(5)}>Back</button>
              <button className="btn-primary" disabled={loading} onClick={handleNext}>{loading ? 'Submitting...' : 'Submit Application'}</button>
            </div>
          </div>
        </div>
      )}

      {step === 7 && (
        <div className="container">
          <div className="success-card">
            <div className="success-icon">🎉</div>
            <h3>Thanks — you’re on the list!</h3>
            <p>We sent a verification email to confirm your account. Stay tuned for the app launch — we’ll reach out with next steps.</p>
            <div style={{ marginTop: 16 }}>
              <a href="/" className="btn-primary">Back to Home</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


