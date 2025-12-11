'use client';

import React, { useEffect, useState } from 'react';
import type { RequestData } from '../page';

type Props = {
  isAuthenticated: boolean;
  onNext: () => void;
  onBack: () => void;
  supabase: any;
  requestData?: RequestData;
  onSaveState?: () => void;
};

export default function AuthStep({ isAuthenticated, onNext, onBack, supabase, requestData, onSaveState }: Props) {
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  // SMS 2FA removed

  useEffect(() => {
    const fetchUser = async () => {
      if (!isAuthenticated || !supabase?.auth) {
        setCurrentUserEmail(null);
        return;
      }
      try {
        const { data } = await supabase.auth.getUser();
        setCurrentUserEmail(data.user?.email ?? null);
      } catch (err) {
        console.warn('[AuthStep] Failed to load current user:', err);
        setCurrentUserEmail(null);
      }
    };

    fetchUser();
  }, [isAuthenticated, supabase]);

  const handleSignUp = async () => {
    if (!email || !password || !fullName) {
      setError('Please fill in all fields');
      return;
    }

    // Validate Supabase client before attempting sign-up
    if (!supabase) {
      console.error('[AuthStep] Supabase client is null');
      setError('Authentication service is not available. Please refresh the page.');
      return;
    }

    if (!supabase.auth) {
      console.error('[AuthStep] Supabase auth is null');
      setError('Authentication service is not available. Please refresh the page.');
      return;
    }

    // Validate Supabase URL and key are configured
    const supabaseUrl = (supabase as any)?.supabaseUrl || (supabase as any)?.supabaseKey;
    if (!supabaseUrl) {
      console.error('[AuthStep] Supabase URL/key not configured');
      setError('Database connection not configured. Please contact support.');
      return;
    }

    console.log('[AuthStep] Starting sign-up with validated Supabase client');

    setLoading(true);
    setError('');

    try {
      // Get the site URL for email redirect
      const siteUrl = typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL || 'https://www.appauro.com';
      const redirectTo = `${siteUrl}/auth/confirm?type=signup`;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: redirectTo,
        }
      });

      // Log signup attempt details for debugging email issues
      console.log('[AuthStep] Signup attempt:', {
        email,
        hasError: !!error,
        errorMessage: error?.message,
        errorCode: error?.status || error?.code,
        errorDetails: error,
        userCreated: !!data?.user,
        userId: data?.user?.id,
        sessionCreated: !!data?.session,
        emailRedirectTo: redirectTo,
        supabaseUrl: supabase?.supabaseUrl || 'unknown',
        note: 'If confirmation email not received, check Supabase SMTP settings and spam folder'
      });

      if (error) {
        console.error('[AuthStep] Signup error details:', {
          message: error.message,
          status: error.status,
          code: error.code,
          name: error.name,
          fullError: error
        });
        throw error;
      }

      if (!data?.user) {
        console.error('[AuthStep] Signup succeeded but no user created!', {
          data,
          email,
          hasData: !!data,
          hasUser: !!data?.user
        });
        throw new Error('Sign up completed but user was not created. Please try again or contact support.');
      }

      if (data.user) {
        // Best-effort: save identifiers for server-side linking and later resume
        try {
          localStorage.setItem('auro_signup_user_id', data.user.id);
          localStorage.setItem('auro_signup_email', email);
          localStorage.setItem('auro_signup_full_name', fullName);
        } catch {}

        // Ensure profile via server (service role), independent of RLS
        try {
          
          const response = await fetch('/api/auth/ensure-profile', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ userId: data.user.id, email, fullName })
          });
          const result = await response.json();
          
        } catch (err: any) {
          console.error('[AuthStep] ensure-profile error:', err?.message);
        }

        // On the client, also attempt to upsert profile using authenticated session if available
        try {
          await supabase
            .from('profiles')
            .upsert({ id: data.user.id, full_name: fullName, email }, { onConflict: 'id' });
        } catch {}

        // Do not force verified session here to reduce friction; proceed to payment
        onNext();
      }
    } catch (error: any) {
      console.error('[AuthStep] Signup catch block:', {
        error,
        message: error?.message,
        status: error?.status,
        code: error?.code,
        name: error?.name,
        stack: error?.stack
      });
      
      // Provide more specific error messages
      let errorMessage = 'Sign up failed';
      
      // Check for "user already exists" errors first - check multiple variations
      const errorMsg = String(error?.message || '').toLowerCase();
      const errorCode = error?.status || error?.code || '';
      const errorCodeStr = String(errorCode).toLowerCase();
      
      if (
        errorMsg.includes('already registered') ||
        errorMsg.includes('user already exists') ||
        errorMsg.includes('email address is already registered') ||
        errorMsg.includes('already exists') ||
        errorMsg.includes('duplicate') ||
        errorCode === 422 ||
        errorCodeStr.includes('422')
      ) {
        errorMessage = 'An account with this email already exists. Please sign in instead.';
        // Automatically switch to sign-in mode for better UX, but keep the error message
        setTimeout(() => {
          setIsSignUp(false);
          // Keep the error message visible even after switching tabs
          setError(errorMessage);
        }, 100);
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.status === 400) {
        errorMessage = 'Invalid sign-up information. Please check your email and password.';
      } else if (error?.status === 429) {
        errorMessage = 'Too many sign-up attempts. Please wait a moment and try again.';
      } else if (error?.code === 'PGRST301' || error?.message?.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error?.message?.includes('signup')) {
        errorMessage = 'Sign-up is currently disabled. Please contact support.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    if (!supabase?.auth) {
      setError('Authentication service is not available. Please refresh the page.');
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
    if (!supabase?.auth) {
      setError('Authentication service is not available. Please refresh the page.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Save the full flow state to localStorage so we can restore it after OAuth
      // This includes all the requestData (photos, message, consent, etc.)
      try {
        // First, call the parent's save function if provided to ensure state is saved with latest values
        // This uses refs to get the absolute latest state
        if (onSaveState) {
          onSaveState();
        }
        
        // Wait a moment to ensure parent's save completed, then save again with explicit requestData
        // This ensures we have the latest state even if parent's save hasn't completed yet
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Also explicitly save the state here with the full requestData as a backup
        // Use the requestData prop which should have the latest values
        const savedState = {
          currentStep: 'auth', // We're on the auth step
          requestData: requestData || {
            photos: { outfits: [], roomTourPhotos: [], datingProfileScreenshots: [] },
            message: '',
            consent: {
              shareOnSocial: undefined,
              agreedAt: ''
            }
          },
          timestamp: Date.now(),
        };
        localStorage.setItem('auro_request_flow_state', JSON.stringify(savedState));
        console.log('[AuthStep] Saved full flow state before OAuth redirect:', {
          step: savedState.currentStep,
          hasPhotos: !!(savedState.requestData.photos.datingProfileScreenshots?.length || savedState.requestData.photos.outfits?.length || savedState.requestData.photos.roomTourPhotos?.length),
          hasMessage: !!savedState.requestData.message,
          hasCreator: !!(savedState.requestData.creatorId || savedState.requestData.creatorSlug),
          timestamp: savedState.timestamp
        });
      } catch (e) {
        console.warn('[AuthStep] Failed to save flow state:', e);
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect_to=${encodeURIComponent(window.location.pathname + window.location.search)}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
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
          <p>
            {currentUserEmail
              ? `You're signed in as ${currentUserEmail}.`
              : "You're already signed in and ready to proceed with payment."}
          </p>
          <p>
            Want to use a different account instead? You can sign in as someone else or create a new account.
          </p>
        </div>

        <div className="step-actions">
          <button type="button" onClick={onBack} className="btn-secondary">
            Back
          </button>
          <button type="button" onClick={onNext} className="btn-primary">
            Continue to Payment
          </button>
          <button
            type="button"
            className="btn-tertiary"
            onClick={async () => {
              if (!supabase?.auth) {
                setError('Authentication service is not available. Please refresh the page.');
                return;
              }
              setLoading(true);
              setError('');
              try {
                await supabase.auth.signOut();
                setCurrentUserEmail(null);
                setIsSignUp(false);
                setEmail('');
                setPassword('');
                setFullName('');
              } catch (signOutError: any) {
                setError(signOutError?.message || 'Unable to switch accounts. Please try again.');
              } finally {
                setLoading(false);
              }
            }}
          >
            Use a different account
          </button>
        </div>

        {error && (
          <div className="error-message" style={{ marginTop: '16px' }}>
            {error}
          </div>
        )}
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
                // Only clear error if it's not the "already exists" message
                if (!error?.includes('already exists')) {
                  setError('');
                }
              }}
            >
              Sign Up
            </button>
            <button 
              type="button"
              className={`auth-tab ${!isSignUp ? 'active' : ''}`}
              onClick={() => {
                setIsSignUp(false);
                // Only clear error if it's not the "already exists" message
                if (!error?.includes('already exists')) {
                  setError('');
                }
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
              {error && (
                <div className="form-error" role="alert" aria-live="polite">
                  <span className="form-error-icon">⚠️</span>
                  <span className="form-error-text">{error}</span>
                </div>
              )}
              
              {isSignUp && (
                <div className="form-field">
                  <label htmlFor="fullName">Full Name</label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="Enter your full name"
                    required
                    aria-describedby={error ? 'fullName-error' : undefined}
                    aria-invalid={!!error && !fullName}
                  />
                  {error && !fullName && (
                    <span id="fullName-error" className="field-error" role="alert">
                      Full name is required
                    </span>
                  )}
                </div>
              )}

              <div className="form-field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Enter your email"
                  required
                  aria-describedby={error ? 'email-error' : undefined}
                  aria-invalid={!!error && !email}
                />
                {error && !email && (
                  <span id="email-error" className="field-error" role="alert">
                    Email is required
                  </span>
                )}
              </div>

              <div className="form-field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder={isSignUp ? "Create a password (min 6 characters)" : "Enter your password"}
                  minLength={6}
                  required
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  aria-describedby={error ? 'password-error' : undefined}
                  aria-invalid={!!error && (!password || password.length < 6)}
                />
                {error && (!password || password.length < 6) && (
                  <span id="password-error" className="field-error" role="alert">
                    Password must be at least 6 characters
                  </span>
                )}
              </div>

              <button 
                type="button"
                onClick={isSignUp ? handleSignUp : handleSignIn}
                disabled={loading}
                className="btn-primary auth-submit"
                aria-label={loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
              >
                {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
              </button>

              {!isSignUp && (
                <div style={{ marginTop: '12px', textAlign: 'center' }}>
                  <a 
                    href="/auth/forgot-password"
                    className="link-button"
                    style={{ fontSize: '14px', color: '#FF2D55' }}
                  >
                    Forgot Password?
                  </a>
                </div>
              )}
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
