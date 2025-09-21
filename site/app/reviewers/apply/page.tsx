'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
      // Account step: create account
      if (!email || !password || !fullName) { setError('Please fill name, email and password'); return; }
      if (!isPasswordValid) { setError('Password must be at least 8 chars with uppercase, lowercase, number, and symbol'); return; }
      if (!passwordsMatch) { setError('Passwords do not match'); return; }
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
      if (!rate || isNaN(Number(rate)) || Number(rate) <= 0) { setError('Please enter a valid rate'); return; }
      try {
        setLoading(true);
        // proceed to Socials/Bio step next
        setStep(4);
      } catch (e: any) {
        setError(e?.message || 'Failed to save application');
      } finally {
        setLoading(false);
      }
      return;
    }
    if (step === 4) {
      try {
        setLoading(true);
        const avatar = await uploadAvatarViaSignedUrl();
        const { data: s } = await supabase.auth.getSession();
        const token = (s as any)?.session?.access_token as string | undefined;
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
          })
        });
        const json = await resp.json();
        if (!resp.ok) throw new Error(json?.error || 'Failed to submit');
        setStep(5);
      } catch (e: any) {
        setError(e?.message || 'Failed to submit application');
      } finally {
        setLoading(false);
      }
      return;
    }
  };

  // Stepper UI helper
  const Stepper = () => (
    <ol className="stepper" style={{ display: 'flex', gap: 12, margin: '0 0 16px 0', padding: 0, listStyle: 'none', justifyContent: 'center', flexWrap: 'wrap' }}>
      {['Intro','Account','Profile','Socials & Bio','Done'].map((label, idx) => {
        const s = idx + 1;
        const active = step === s;
        const completed = step > s;
        return (
          <li key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 28, height: 28, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: completed ? '#10b981' : active ? '#6366f1' : '#e5e7eb', color: completed || active ? '#fff' : '#111827', fontWeight: 600 }}>
              {completed ? '✓' : s}
            </span>
            <span style={{ color: active ? '#111827' : '#6b7280', fontWeight: active ? 600 : 400 }}>{label}</span>
          </li>
        );
      })}
    </ol>
  );

  return (
    <div className="apply-page">
      <div style={{ marginBottom: 16 }}>
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
            <button className="btn-primary" disabled={loading} onClick={handleNext}>{loading ? 'Please wait...' : 'Continue'}</button>
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
          </div>
          <div className="step-actions">
            <button className="btn-secondary" onClick={() => setStep(2)}>Back</button>
            <button className="btn-primary" disabled={loading} onClick={handleNext}>{loading ? 'Saving...' : 'Continue'}</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="card" style={{ maxWidth: 880, margin: '0 auto' }}>
          <h2>Socials and bio</h2>
          {error && <div className="error-message">{error}</div>}
          <div className="form-grid">
            <div className="form-field">
              <label>Instagram handle</label>
              <input value={instagramHandle} onChange={(e) => setInstagramHandle(e.target.value)} placeholder="@username" />
            </div>
            <div className="form-field">
              <label>TikTok handle</label>
              <input value={tiktokHandle} onChange={(e) => setTiktokHandle(e.target.value)} placeholder="@username" />
            </div>
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label>Bio</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Why you give reviews; what you focus on" rows={4} />
            </div>
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label>Focus areas</label>
              <input value={focusAreas} onChange={(e) => setFocusAreas(e.target.value)} placeholder="e.g., wardrobe, room setup, selfies, dating profile" />
            </div>
          </div>
          <div className="step-actions">
            <button className="btn-secondary" onClick={() => setStep(3)}>Back</button>
            <button className="btn-primary" disabled={loading} onClick={handleNext}>{loading ? 'Submitting...' : 'Submit Application'}</button>
          </div>
        </div>
      )}

      {step === 5 && (
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


