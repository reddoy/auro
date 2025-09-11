'use client';

import React, { useState } from 'react';

type Props = {
  isAuthenticated: boolean;
  onNext: () => void;
  onBack: () => void;
  supabase: any;
};

export default function AuthStep({ isAuthenticated, onNext, onBack, supabase }: Props) {
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // SMS 2FA removed

  const handleSignUp = async () => {
    if (!email || !password || !fullName) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        // Best-effort: save identifiers for server-side linking and later resume
        try {
          localStorage.setItem('auro_signup_user_id', data.user.id);
          localStorage.setItem('auro_signup_email', email);
          localStorage.setItem('auro_signup_full_name', fullName);
        } catch {}

        // Ensure profile via server (service role), independent of RLS
        try {
          await fetch('/api/auth/ensure-profile', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ userId: data.user.id, email, fullName })
          });
        } catch {}

        // On the client, also attempt to upsert profile using authenticated session if available
        try {
          await supabase
            .from('profiles')
            .upsert({ id: data.user.id, full_name: fullName, email, updated_at: new Date().toISOString() }, { onConflict: 'id' });
        } catch {}

        // Do not force verified session here to reduce friction; proceed to payment
        onNext();
      }
    } catch (error: any) {
      setError(error.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      const { data: u } = await supabase.auth.getUser();
      const isRealUser = !!u?.user && (u.user as any)?.app_metadata?.provider !== 'anon';
      if (isRealUser) {
        // Backfill profile via server, best-effort
        try {
          await fetch('/api/auth/ensure-profile', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ userId: (u!.user as any).id, email: (u!.user as any).email || email })
          });
        } catch {}
        onNext();
      } else {
        setError('Sign-in did not complete. Please try again.');
      }
    } catch (error: any) {
      setError(error.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/request`
        }
      });

      if (error) throw error;
    } catch (error: any) {
      setError(error.message || 'Google sign in failed');
      setLoading(false);
    }
  };

  // SMS 2FA removed

  if (isAuthenticated) {
    return (
      <div className="auth-step authenticated">
        <div className="step-header">
          <h2>✅ Account Ready</h2>
          <p>You're already signed in and ready to proceed with payment.</p>
        </div>

        <div className="step-actions">
          <button type="button" onClick={onBack} className="btn-secondary">
            Back
          </button>
          <button type="button" onClick={onNext} className="btn-primary">
            Continue to Payment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-step">
      <div className="step-header">
        <h2>{isSignUp ? 'Create Your Account' : 'Sign In'}</h2>
        <p>
          {isSignUp
            ? "Create an account to track your review and get notified when it's ready."
            : 'Sign in to your existing account to continue.'}
        </p>
      </div>

      <div className="auth-container">
        <div className="auth-tabs">
            <button 
              type="button"
              className={`auth-tab ${isSignUp ? 'active' : ''}`}
              onClick={() => {
                setIsSignUp(true);
                setError('');
              }}
            >
              Sign Up
            </button>
            <button 
              type="button"
              className={`auth-tab ${!isSignUp ? 'active' : ''}`}
              onClick={() => {
                setIsSignUp(false);
                setError('');
              }}
            >
              Sign In
            </button>
        </div>

        <div className="auth-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="social-auth">
              <button 
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="btn-google"
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
            </div>

          <div className="divider">
            <span>or</span>
          </div>

          <div className="form-fields">
              {isSignUp && (
                <div className="form-field">
                  <label htmlFor="fullName">Full Name</label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              )}

              <div className="form-field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignUp ? "Create a password (min 6 characters)" : "Enter your password"}
                  minLength={6}
                  required
                />
              </div>

              <button 
                type="button"
                onClick={isSignUp ? handleSignUp : handleSignIn}
                disabled={loading}
                className="btn-primary auth-submit"
              >
                {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
              </button>
            </div>

          <div className="auth-switch">
            {isSignUp ? (
              <p>
                Already have an account?{' '}
                <button 
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  className="link-button"
                >
                  Sign in
                </button>
              </p>
            ) : (
              <p>
                Don't have an account?{' '}
                <button 
                  type="button"
                  onClick={() => setIsSignUp(true)}
                  className="link-button"
                >
                  Sign up
                </button>
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="step-actions">
        <button type="button" onClick={onBack} className="btn-secondary">
          Back
        </button>
      </div>
    </div>
  );
}
