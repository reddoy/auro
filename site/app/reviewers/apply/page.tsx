'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AUTH_EMAIL_RATE_LIMIT_MESSAGE, isAuthEmailRateLimitError } from '../../../lib/auth-messages';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import FunnelTopBar from '../../../components/FunnelTopBar';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { ArrowLeft, ArrowRight, Bell, Check, DollarSign, Star, UserCheck, Shield, Mail, Lock, User, FileText, Target, Phone, Instagram, Music } from 'lucide-react';
import WebAvatarUploader from '../../../components/WebAvatarUploader';
import PriceTierSelector from '../../../components/PriceTierSelector';

type RotatingReviewer = {
  firstName: string;
  avatarUrl: string | null;
};

function reviewerAvatarViewUrl(avatarUrl: string | null): string | null {
  if (!avatarUrl) return null;
  if (/^https?:\/\//i.test(avatarUrl)) return avatarUrl;
  return `/api/storage/signed-view?path=${encodeURIComponent(avatarUrl)}&bucket=avatars`;
}

export default function ReviewerApplyPage() {
  const [step, setStep] = useState<number>(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [marketingConsent, setMarketingConsent] = useState<boolean>(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [hourlyRate, setHourlyRate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [approvedReviewers, setApprovedReviewers] = useState<RotatingReviewer[]>([]);
  const [activeReviewerNameIndex, setActiveReviewerNameIndex] = useState(0);
  const [isReviewerNamesLoading, setIsReviewerNamesLoading] = useState(true);
  const [isReviewerFading, setIsReviewerFading] = useState(false);
  const [isGoogleAuthed, setIsGoogleAuthed] = useState(false);
  const [signupStatus, setSignupStatus] = useState<'not_started' | 'pending' | 'completed' | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [signupUserId, setSignupUserId] = useState<string | null>(null);
  const router = useRouter();

  // Retry utility function
  const withRetry = async <T,>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> => {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        console.warn(`[ReviewerApply] Operation failed (attempt ${attempt + 1}/${maxRetries + 1}):`, error);
        
        if (attempt < maxRetries) {
          const waitTime = delay * Math.pow(2, attempt); // Exponential backoff
          console.log(`[ReviewerApply] Retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    throw lastError;
  };

  // Data persistence utilities
  const saveFormData = useCallback(() => {
    try {
      const formData = {
        step,
        firstName,
        lastName,
        email,
        phone,
        marketingConsent,
        avatarUrl,
        avatarPath,
        hourlyRate,
        timestamp: Date.now()
      };
      localStorage.setItem('auro_reviewer_form_data', JSON.stringify(formData));
    } catch (error) {
      console.warn('[ReviewerApply] Failed to save form data:', error);
    }
  }, [step, firstName, lastName, email, phone, marketingConsent, avatarUrl, avatarPath, hourlyRate]);

  const loadFormData = useCallback(() => {
    try {
      const saved = localStorage.getItem('auro_reviewer_form_data');
      if (saved) {
        const formData = JSON.parse(saved);
        // Only restore if saved within last 2 hours
        if (Date.now() - formData.timestamp < 2 * 60 * 60 * 1000) {
          setStep(formData.step || 1);
          setFirstName(formData.firstName || '');
          setLastName(formData.lastName || '');
          setEmail(formData.email || '');
          setPhone(formData.phone || '');
          setMarketingConsent(formData.marketingConsent || false);
        setAvatarUrl(formData.avatarUrl || null);
        setAvatarPath(formData.avatarPath || null);
        setHourlyRate(formData.hourlyRate || '');
          console.log('[ReviewerApply] Restored form data from localStorage');
          return true;
        } else {
          // Clean up expired data
          localStorage.removeItem('auro_reviewer_form_data');
        }
      }
    } catch (error) {
      console.warn('[ReviewerApply] Failed to load form data:', error);
      localStorage.removeItem('auro_reviewer_form_data');
    }
    return false;
  }, []);

  const clearFormData = useCallback(() => {
    try {
      localStorage.removeItem('auro_reviewer_form_data');
      localStorage.removeItem('auro_reviewer_signup_state');
    } catch (error) {
      console.warn('[ReviewerApply] Failed to clear form data:', error);
    }
  }, []);

  // Auto-save form data when it changes
  useEffect(() => {
    if (step > 1) {
      saveFormData();
    }
  }, [step, firstName, lastName, email, phone, marketingConsent, avatarUrl, avatarPath, hourlyRate, saveFormData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const setInitialSignupUserId = async () => {
      try {
        const localId = localStorage.getItem('auro_signup_user_id');
        if (localId) {
          setSignupUserId(localId);
          return;
        }
      } catch {}

      try {
        if (!supabase?.auth) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          setSignupUserId(session.user.id);
        }
      } catch {}
    };

    setInitialSignupUserId();
  }, []);

  // Check if resuming from OAuth - improved with retry logic
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const shouldResume = urlParams.get('resume') === 'true';
    
    if (shouldResume) {
      // Verify we have a valid session after OAuth redirect with retry logic
      const verifyOAuthSession = async (retryCount = 0) => {
        try {
          console.log(`[ReviewerApply] Resuming from OAuth, verifying session... (attempt ${retryCount + 1})`);
          
          if (!supabase?.auth) {
            console.error('[ReviewerApply] Supabase client or auth is null');
            setError('Authentication service is not available. Please refresh the page and try again.');
            return;
          }

          // Progressive delay: 500ms, 1s, 2s for retries
          const delay = Math.min(500 * Math.pow(2, retryCount), 2000);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('[ReviewerApply] Session error:', error);
            if (retryCount < 3) {
              console.log('[ReviewerApply] Retrying session verification...');
              return verifyOAuthSession(retryCount + 1);
            }
            setError('Authentication failed. Please try signing in again or refresh the page.');
            return;
          }

          if (!session) {
            if (retryCount < 3) {
              console.log('[ReviewerApply] No session found, retrying...');
              return verifyOAuthSession(retryCount + 1);
            }
            setError('No active session found. Please complete the sign-in process again.');
            return;
          }
          
          console.log('[ReviewerApply] Session verified, user:', session.user.id);
          
          // Restore saved state with better error handling
          try {
            const saved = localStorage.getItem('auro_reviewer_signup_state');
            if (saved) {
              const state = JSON.parse(saved);
              // Only restore if saved within last 30 minutes
              if (Date.now() - state.timestamp < 30 * 60 * 1000) {
                setFirstName(state.firstName || '');
                setLastName(state.lastName || '');
                setEmail(state.email || '');
                console.log('[ReviewerApply] Restored saved state');
              }
              localStorage.removeItem('auro_reviewer_signup_state');
            }
          } catch (stateError) {
            console.warn('[ReviewerApply] Failed to restore saved state:', stateError);
          }
          
          // Get info from Google OAuth metadata
          try {
            const user = session.user;
            if (user.user_metadata) {
              const { given_name, family_name, email } = user.user_metadata;
              if (given_name) setFirstName(given_name);
              if (family_name) setLastName(family_name);
              if (email) {
                setEmail(email);
                // Store email in localStorage for step 6 submission
                try {
                  localStorage.setItem('auro_signup_email', email);
                  localStorage.setItem('auro_signup_user_id', user.id);
                  setSignupUserId(user.id);
                  if (given_name && family_name) {
                    localStorage.setItem('auro_signup_full_name', `${given_name} ${family_name}`);
                  }
                } catch (storageError) {
                  console.warn('[ReviewerApply] Failed to store OAuth data in localStorage:', storageError);
                }
              }
            }
            // Also check user.email directly if metadata doesn't have it
            if (user.email && !email) {
              setEmail(user.email);
              try {
                localStorage.setItem('auro_signup_email', user.email);
                localStorage.setItem('auro_signup_user_id', user.id);
                setSignupUserId(user.id);
              } catch (storageError) {
                console.warn('[ReviewerApply] Failed to store OAuth data in localStorage:', storageError);
              }
            }
          } catch (metadataError) {
            console.warn('[ReviewerApply] Failed to extract OAuth metadata:', metadataError);
          }
          
          // Mark as Google authenticated
          setIsGoogleAuthed(true);
          
          // Go to step 4 (Phone Number) after successful OAuth
          setStep(4);
          
          // Clean up URL
          window.history.replaceState({}, '', '/reviewers/apply');
        } catch (e) {
          console.error('[ReviewerApply] Failed to verify OAuth session:', e);
          if (retryCount < 2) {
            console.log('[ReviewerApply] Retrying due to exception...');
            return verifyOAuthSession(retryCount + 1);
          }
          setError('Authentication verification failed. Please refresh the page and try signing in again.');
        }
      };
      
      verifyOAuthSession();
    }
  }, []);

  const isAuthed = useMemo(() => {
    return false;
  }, []);

  // Consolidated authentication check - prevents race conditions
  useEffect(() => {
    let isMounted = true;
    let authListener: any = null;

    const checkAuthAndLoadProfile = async () => {
      let watchdogHit = false;
      const watchdog = window.setTimeout(() => {
        watchdogHit = true;
        if (!isMounted) return;
        console.warn(
          '[ReviewerApply] Initial account check exceeded 25s (likely stalled network); showing the application.'
        );
        setIsCheckingStatus(false);
      }, 25_000);

      try {
        if (!supabase?.auth) {
          console.error('[ReviewerApply] Supabase client or auth is null');
          if (isMounted) {
            setError('Authentication service is not available. Please refresh the page and try again.');
            setIsCheckingStatus(false);
          }
          return;
        }

        // Get current user and session - handle gracefully for unauthenticated users
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        // Only treat as error if it's not a missing session (which is normal for new users)
        if (userError && !userError.message?.includes('session missing') && !userError.message?.includes('AuthSessionMissingError')) {
          console.error('[ReviewerApply] User check error:', userError);
          if (isMounted) {
            setError('Unable to verify authentication. Please refresh the page and try again.');
            setIsCheckingStatus(false);
          }
          return;
        }

        if (sessionError && !sessionError.message?.includes('session missing') && !sessionError.message?.includes('AuthSessionMissingError')) {
          console.error('[ReviewerApply] Session check error:', sessionError);
          if (isMounted) {
            setError('Unable to verify authentication. Please refresh the page and try again.');
            setIsCheckingStatus(false);
          }
          return;
        }

        if (user && session) {
          console.log('[ReviewerApply] User authenticated:', user.id);
          
          // Set authentication state
          if (user.app_metadata?.provider === 'google') {
            setIsGoogleAuthed(true);
          }
          
          // Try to load saved form data first, then fall back to auth data
          const hasRestoredData = loadFormData();
          
          if (!hasRestoredData) {
            // Auto-fill from auth data only if no saved data
            if (user.email) setEmail(user.email);
            if (user.user_metadata?.given_name) setFirstName(user.user_metadata.given_name);
            if (user.user_metadata?.family_name) setLastName(user.user_metadata.family_name);
          }
          
          const signupFetchTimeoutMs = 12_000;
          try {
            const response = await withRetry(async () => {
              return fetch('/api/reviewers/signup-status', {
                headers: { authorization: `Bearer ${session.access_token}` },
                signal: AbortSignal.timeout(signupFetchTimeoutMs),
              });
            }, 2, 500);
            
            if (response.ok) {
              const data = await response.json();
              if (isMounted) {
                setSignupStatus(data.status);
                
                // If they already completed signup, show completion message
                if (data.status === 'completed') {
                  setError('You have already completed the reviewer application. An account with this email is already associated with our platform.');
                  return;
                }
                
                // If they have a pending profile, load their data
                if (data.status === 'pending' && data.profile) {
                  const profile = data.profile;
                  if (profile.preferences?.marketing_consent !== undefined) {
                    setMarketingConsent(profile.preferences.marketing_consent);
                  }
                }
              }
            }
          } catch (statusError) {
            console.error('[ReviewerApply] Failed to check signup status after retries:', statusError);
          }
        } else {
          // No user/session - this is normal for new users starting the signup process
          console.log('[ReviewerApply] No authenticated user - normal for new signups');
          
          // Try to load any saved form data for returning users
          loadFormData();
        }
      } catch (e) {
        console.error('[ReviewerApply] Failed to check auth and load profile:', e);
        if (isMounted) {
          setError('Failed to load your account information. Please refresh the page and try again.');
        }
      } finally {
        window.clearTimeout(watchdog);
        if (isMounted && !watchdogHit) {
          setIsCheckingStatus(false);
        }
      }
    };
    
    // Set up auth state listener
    if (supabase?.auth) {
      authListener = supabase.auth.onAuthStateChange((event: any, session: any) => {
        console.log('[ReviewerApply] Auth state change:', event, !!session);
        
        if (!isMounted) return;
        
        // Handle successful sign in or token refresh
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          if (session?.user) {
            console.log('[ReviewerApply] Valid session established:', session.user.id);
            // Update user info when session is available
            if (session.user.app_metadata?.provider === 'google') {
              setIsGoogleAuthed(true);
            }
            if (session.user.email) {
              setEmail(session.user.email);
              // Store email in localStorage for Google OAuth users
              if (session.user.app_metadata?.provider === 'google') {
                try {
                  localStorage.setItem('auro_signup_email', session.user.email);
                  localStorage.setItem('auro_signup_user_id', session.user.id);
                  setSignupUserId(session.user.id);
                  if (session.user.user_metadata?.given_name && session.user.user_metadata?.family_name) {
                    localStorage.setItem('auro_signup_full_name', `${session.user.user_metadata.given_name} ${session.user.user_metadata.family_name}`);
                  }
                } catch (storageError) {
                  console.warn('[ReviewerApply] Failed to store OAuth data in localStorage:', storageError);
                }
              }
            }
            if (session.user.user_metadata?.given_name) setFirstName(session.user.user_metadata.given_name);
            if (session.user.user_metadata?.family_name) setLastName(session.user.user_metadata.family_name);
            
            // Clear any previous session-related errors when we have a valid session
            if (error.includes('session') || error.includes('expired') || error.includes('authentication')) {
              setError('');
            }
          }
        }
        
        // Handle sign out
        if (event === 'SIGNED_OUT') {
          // Only show error if they were previously authenticated on this page AND had started the flow
          if ((isGoogleAuthed || email) && (step > 1)) {
            console.warn('[ReviewerApply] User signed out during application at step:', step);
            setError('Your session was ended. Please refresh the page and sign in again to continue.');
          } else {
            console.log('[ReviewerApply] SIGNED_OUT event ignored - user not in active flow');
          }
        }
      });
    }
    
    // Initial auth check
    checkAuthAndLoadProfile();
    
    return () => {
      isMounted = false;
      authListener?.data?.subscription?.unsubscribe();
    };
  }, []);

  // Validate session when reaching step 4
  useEffect(() => {
    if (step === 4 && isGoogleAuthed) {
      const validateSession = async () => {
        try {
          if (!supabase?.auth) {
            console.error('[ReviewerApply] Supabase client or auth is null');
            setError('Authentication service is not available. Please refresh the page.');
            return;
          }
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error || !session) {
            console.error('[ReviewerApply] Session validation failed at step 4:', error);
            setError('Authentication incomplete. Please click "Continue with Google" above to complete sign-in.');
          }
        } catch (e) {
          console.error('[ReviewerApply] Session validation error:', e);
        }
      };
      validateSession();
    }
  }, [step, isGoogleAuthed]);

  // Fetch approved reviewer first names for intro ticker
  useEffect(() => {
    const fetchApprovedReviewerNames = async () => {
      try {
        if (!supabase) {
          console.error('[ReviewerApply] Supabase client is not available');
          setIsReviewerNamesLoading(false);
          return;
        }

        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('first_name, avatar_url')
          .eq('is_reviewer', 'approved');

        if (!profileError && Array.isArray(data)) {
          const uniqueReviewers = Array.from(
            new Map(
              data
                .map((row) => ({
                  firstName: String((row as { first_name?: string | null }).first_name ?? '').trim(),
                  avatarUrl: reviewerAvatarViewUrl((row as { avatar_url?: string | null }).avatar_url ?? null),
                }))
                .filter((row) => row.firstName.length > 0)
                .map((row) => [row.firstName.toLowerCase(), row]),
            ).values(),
          );

          setApprovedReviewers(uniqueReviewers);
          setActiveReviewerNameIndex(0);
          setIsReviewerFading(false);
          setIsReviewerNamesLoading(false);
          return;
        }

        setIsReviewerNamesLoading(false);
      } catch (err) {
        console.error('Error fetching approved reviewer names:', err);
        setIsReviewerNamesLoading(false);
      }
    };

    fetchApprovedReviewerNames();
    const interval = setInterval(fetchApprovedReviewerNames, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (approvedReviewers.length <= 1) return;

    const interval = setInterval(() => {
      setIsReviewerFading(true);
      setTimeout(() => {
        setActiveReviewerNameIndex((prev) => (prev + 1) % approvedReviewers.length);
        setIsReviewerFading(false);
      }, 250);
    }, 3200);

    return () => clearInterval(interval);
  }, [approvedReviewers]);

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
    return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
  }, [password]);

  const passwordsMatch = useMemo(() => password && passwordConfirm && password === passwordConfirm, [password, passwordConfirm]);



  const handleGoogleAuth = async () => {
    setLoading(true);
    setError('');

    try {
      // Save current form data before OAuth redirect
      saveFormData();

      if (!supabase?.auth) {
        setError('Authentication service is not available. Please refresh the page and try again.');
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect_to=${encodeURIComponent('/reviewers/apply?resume=true')}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        console.error('[ReviewerApply] Google OAuth error:', error);
        if (error.message.includes('popup')) {
          setError('Google sign-in was blocked by your browser. Please allow popups for this site and try again.');
        } else if (error.message.includes('network')) {
          setError('Network error during sign-in. Please check your internet connection and try again.');
        } else {
          setError('Google sign-in failed. Please try again or use the email signup option below.');
        }
        setLoading(false);
        return;
      }
    } catch (error: any) {
      console.error('[ReviewerApply] Unexpected error during Google auth:', error);
      setError('An unexpected error occurred during sign-in. Please refresh the page and try again.');
      setLoading(false);
    }
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
      if (!email) { setError('Please enter your email'); return; }
      
      // Set status to pending when they start filling out the form
      if (signupStatus === 'not_started') {
        try {
          if (!supabase?.auth) {
            console.error('[ReviewerApply] Supabase client or auth is null');
            setError('Authentication service is not available. Please refresh the page.');
            return;
          }
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;
          
          if (token) {
            await fetch('/api/reviewers/signup-status', {
              method: 'POST',
              headers: { 
                'content-type': 'application/json',
                authorization: `Bearer ${token}`
              },
              body: JSON.stringify({ status: 'pending' })
            });
            setSignupStatus('pending');
          }
        } catch (e) {
          console.error('Failed to update signup status:', e);
        }
      }
      
      setStep(3);
      return;
    }
    if (step === 3) {
      // Password creation and account sign-up
      if (!password || !passwordConfirm) { setError('Please create and confirm your password'); return; }
      if (!isPasswordValid) { setError('Password must be at least 8 chars with uppercase, lowercase, and number'); return; }
      if (!passwordsMatch) { setError('Passwords do not match'); return; }
      try {
        setLoading(true);
        
        if (!supabase?.auth) {
          setError('Authentication service is not available. Please refresh the page.');
          setLoading(false);
          return;
        }
        
        const fullName = `${firstName} ${lastName}`.trim();
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { 
            data: { full_name: fullName, first_name: firstName, last_name: lastName },
            emailRedirectTo: null // Don't send confirmation email yet - we'll send it after full signup
          }
        });
        if (error) throw error;
        if (data?.user) {
          console.log('[ReviewerApply] Account created successfully:', data.user.id);
          
          // Store signup data for later use
          try {
            localStorage.setItem('auro_signup_user_id', data.user.id);
            setSignupUserId(data.user.id);
            localStorage.setItem('auro_signup_email', email);
            localStorage.setItem('auro_signup_full_name', fullName);
          } catch {}
          
          // Try to ensure profile exists
          try {
            await fetch('/api/auth/ensure-profile', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ userId: data.user.id, email, fullName })
            });
          } catch (profileError) {
            console.warn('[ReviewerApply] Failed to ensure profile:', profileError);
          }
          
          // Check if we have a session after signup
          const { data: { session: newSession } } = await supabase.auth.getSession();
          if (newSession) {
            console.log('[ReviewerApply] Session established after signup');
            setStep(4);
          } else {
            console.log('[ReviewerApply] No session after signup - user may need to confirm email');
            // For now, continue to step 4 - the session will be established when they confirm
            setStep(4);
          }
        }
      } catch (e: any) {
        console.error('[ReviewerApply] Sign up error:', e);
        if (isAuthEmailRateLimitError(e)) {
          setError(AUTH_EMAIL_RATE_LIMIT_MESSAGE);
        } else if (e?.message?.includes('already registered')) {
          setError('An account with this email already exists. Please sign in instead or use a different email address.');
        } else if (e?.message?.includes('invalid email')) {
          setError('Please enter a valid email address.');
        } else if (e?.message?.includes('password')) {
          setError('Password requirements not met. Please check the requirements below and try again.');
        } else if (e?.message?.includes('network') || e?.message?.includes('fetch')) {
          setError('Network error during sign-up. Please check your internet connection and try again.');
        } else {
          setError('Sign-up failed. Please try again or contact support if the problem persists.');
        }
      } finally {
        setLoading(false);
      }
      return;
    }
    if (step === 4) {
      // Profile picture step - required
      if (!avatarUrl || !avatarPath) {
        setError('Please upload a profile picture to continue');
        return;
      }
      setStep(5);
      return;
    }
    if (step === 5) {
      // Rate step - required (must be a valid tier)
      if (!hourlyRate || hourlyRate.trim() === '') {
        setError('Please select a price tier to continue');
        return;
      }
      const rateNumber = parseFloat(hourlyRate);
      if (isNaN(rateNumber) || rateNumber <= 0) {
        setError('Please select a valid price tier');
        return;
      }
      setStep(6);
      return;
    }
    if (step === 6) {
      // Phone number step - submit application
      if (!firstName || firstName.trim().length === 0) {
        setError('Please enter your first name');
        return;
      }
      if (!lastName || lastName.trim().length === 0) {
        setError('Please enter your last name');
        return;
      }
      if (!phone || phone.trim().length === 0) { 
        setError('Please enter your phone number'); 
        return; 
      }
      // Basic phone validation (allow various formats)
      const phoneDigits = phone.replace(/\D/g, '');
      if (phoneDigits.length < 10) {
        setError('Please enter a valid phone number');
        return;
      }
      
      // Submit the application
      try {
        setLoading(true);
        setError(''); // Clear any previous errors
        
        console.log('[ReviewerApply] Submitting application at step 4');
        
        // Always use the signup endpoint for simplicity - it handles both authenticated and unauthenticated cases
        let signupUserId = localStorage.getItem('auro_signup_user_id');
        let signupEmail = localStorage.getItem('auro_signup_email');
        let signupFullName = localStorage.getItem('auro_signup_full_name') || '';
        
        // For Google OAuth users, also check current session if localStorage doesn't have email
        if (!signupEmail && isGoogleAuthed) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.email) {
              signupEmail = session.user.email;
              signupUserId = session.user.id || null;
              // Store for consistency
              try {
                if (signupEmail) {
                  localStorage.setItem('auro_signup_email', signupEmail);
                }
                if (signupUserId) {
                  localStorage.setItem('auro_signup_user_id', signupUserId);
                  setSignupUserId(signupUserId);
                }
              } catch {}
            }
          } catch (sessionError) {
            console.warn('[ReviewerApply] Failed to get session for Google OAuth user:', sessionError);
          }
        }
        
        // Also check email state variable as fallback
        if (!signupEmail && email) {
          signupEmail = email;
        }
        
        if (!signupEmail) {
          setError('Please complete the signup process first. Go back to step 2 and create your account.');
          setLoading(false);
          setStep(2);
          return;
        }
        
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(signupEmail)) {
          setError('Invalid email format. Please go back to step 2 and enter a valid email address.');
          setLoading(false);
          setStep(2);
          return;
        }
        
        const requestData = {
          bio: '',
          focusAreas: '',
          hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
          avatarUrl: avatarUrl,
          avatarPath: avatarPath,
          socials: [],
          instagramHandle: null,
          tiktokHandle: null,
          phone: phone || null,
          marketingConsent,
          userId: signupUserId, // May be null, that's OK
          email: signupEmail,
          fullName: signupFullName,
          firstName: firstName,
          lastName: lastName
        };
        
        console.log('[ReviewerApply] Sending signup request with data:', {
          userId: signupUserId,
          email: signupEmail,
          fullName: signupFullName
        });
        
        const resp = await withRetry(async () => {
          return fetch('/api/reviewers/apply-signup', {
            method: 'POST',
            headers: { 
              'content-type': 'application/json'
            },
            body: JSON.stringify(requestData)
          });
        }, 2, 1000);
        
        const json = await resp.json();
        
        if (!resp.ok) {
          console.error('[ReviewerApply] Signup API error:', json);
          throw new Error(json?.error || 'Failed to submit');
        }
        
        console.log('[ReviewerApply] Application submitted successfully');
        
        // Send confirmation email only for regular email signups (not Google OAuth)
        if (!isGoogleAuthed) {
          try {
            console.log('[ReviewerApply] Sending confirmation email...');
            await fetch('/api/auth/resend-verification', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ email: signupEmail })
            });
            console.log('[ReviewerApply] Confirmation email sent successfully');
          } catch (emailError) {
            console.warn('[ReviewerApply] Failed to send confirmation email:', emailError);
            // Don't fail the entire flow if email sending fails
          }
        } else {
          console.log('[ReviewerApply] Skipping confirmation email for Google OAuth user (email already verified)');
        }
        
        clearFormData(); // Clear saved data on successful submission
        setStep(7);
        setLoading(false);
        return;
        
      } catch (e: any) {
        console.error('[ReviewerApply] Error submitting application:', e);
        if (e?.message?.includes('already completed')) {
          setError('You have already completed the reviewer application. Please check your email for confirmation or contact support.');
        } else if (e?.message?.includes('session') || e?.message?.includes('auth')) {
          setError('Your session has expired. Please refresh the page and sign in again to complete your application.');
        } else if (e?.message?.includes('network') || e?.message?.includes('fetch')) {
          setError('Network error during submission. Please check your internet connection and try again.');
        } else if (e?.message?.includes('validation')) {
          setError('Please check that all required fields are filled out correctly and try again.');
        } else {
          setError('Failed to submit application. Please try again or contact support if the problem persists.');
        }
        setLoading(false);
      }
      return;
    }
  };

  // Modern Stepper Component - Mobile optimized
  const Stepper = () => {
    const steps = [
      { id: 1, label: 'Intro', shortLabel: 'Intro', icon: Star },
      { id: 2, label: 'Account', shortLabel: 'Account', icon: User },
      { id: 3, label: 'Password', shortLabel: 'Pass', icon: Lock },
      { id: 4, label: 'Photo', shortLabel: 'Photo', icon: User },
      { id: 5, label: 'Rate', shortLabel: 'Rate', icon: DollarSign },
      { id: 6, label: 'Phone', shortLabel: 'Phone', icon: Phone },
      { id: 7, label: 'Done', shortLabel: 'Done', icon: Check }
    ];

    // Calculate progress percentage, capping at 100%
    const lastStepId = Math.max(...steps.map(s => s.id));
    const progressPercent = Math.min(100, ((step - 1) / (lastStepId - 1)) * 100);

    return (
      <div className="w-full px-2 py-3 md:px-4 md:py-6 bg-gradient-to-b from-background/50 to-transparent">
        <div className="flex items-center justify-between relative max-w-5xl mx-auto">
          {/* Progress line */}
          <div className="absolute top-3.5 sm:top-4 md:top-6 left-0 right-0 h-0.5 bg-white/10">
            <div 
              className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 ease-out shadow-sm shadow-primary/50"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          
          {steps.map((stepItem, idx) => {
            const isCompleted = step > stepItem.id;
            const isCurrent = step === stepItem.id;
            const isClickable = step > stepItem.id;
            const Icon = stepItem.icon;
            
            return (
              <div
                key={stepItem.id}
                className="flex min-w-0 flex-col items-center relative z-10 flex-1"
                onClick={isClickable ? () => setStep(stepItem.id) : undefined}
                style={{ cursor: isClickable ? 'pointer' : 'default' }}
              >
                <div
                  className={`
                    w-7 h-7 md:w-12 md:h-12 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold
                    transition-all duration-300 ease-out
                    ${isCompleted 
                      ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30' 
                      : isCurrent 
                        ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-xl shadow-primary/50 scale-110' 
                        : 'bg-white/10 border border-white/20 text-gray-400'
                    }
                  `}
                >
                  {isCompleted ? (
                    <Check className="w-3 h-3 md:w-5 md:h-5" />
                  ) : (
                    <Icon className="w-3 h-3 md:w-5 md:h-5" />
                  )}
                </div>
                <span
                  className={[
                    'mt-1 md:mt-2 max-w-[4.25rem] sm:max-w-[5rem] text-center text-[10px] md:text-xs font-medium leading-tight hyphens-none',
                    'line-clamp-2 break-words',
                    isCurrent ? 'text-primary font-bold' : isCompleted ? 'text-white' : 'text-gray-500',
                  ].join(' ')}
                  title={stepItem.label}
                >
                  {stepItem.shortLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Show loading state while checking signup status
  if (isCheckingStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-card to-background text-white">
        <FunnelTopBar variant="reviewer-apply" />
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            <p className="text-gray-300">Checking your account status...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show completion message if they already completed signup
  if (signupStatus === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-card to-background text-white">
        <FunnelTopBar variant="reviewer-apply" />
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6">
          <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="py-12 text-center space-y-6">
              <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-10 h-10 text-white" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white">Already Signed Up!</h3>
                <p className="text-gray-300">
                  You have already completed the reviewer application. An account with this email is already associated with our platform.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  asChild
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary hover:to-secondary text-white"
                >
                  <a href="/">
                    Back to Home
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background text-white">
      <FunnelTopBar variant="reviewer-apply" />
      <div className="w-full">
        <Stepper />
      </div>
      
      {step === 1 && (
        <div className="flex-1 flex items-start md:items-center justify-center px-4 py-4 md:py-8 min-h-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="w-full max-w-2xl mx-auto">
            <div className="flex flex-col gap-6 md:gap-8">
              <div className="pt-1 md:pt-2 hyphens-none mx-auto max-w-xl px-4">
                <h1 className="text-center text-[2rem] sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight">
                  <span className="block whitespace-nowrap text-white">Review profiles honestly.</span>
                  <span className="block whitespace-nowrap text-white">Men get actionable advice.</span>
                  <span className="block bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                    You earn per review.
                  </span>
                </h1>
              </div>

              <div className="px-0 sm:px-4 space-y-2.5 md:space-y-4">
                <div className="grid grid-cols-3 gap-2.5 md:gap-4">
                  <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 backdrop-blur-sm rounded-xl p-2.5 md:p-4 border border-green-500/20">
                    <div className="flex flex-col items-center space-y-1 md:space-y-2">
                      <div className="w-9 h-9 md:w-12 md:h-12 bg-gradient-to-br from-green-500/30 to-green-600/20 rounded-full flex items-center justify-center">
                        <DollarSign className="w-4 h-4 md:w-6 md:h-6 text-green-400" />
                      </div>
                      <div className="text-center px-0.5">
                        <div className="text-sm md:text-lg font-bold text-white leading-tight">Your rate</div>
                        <div className="text-xs text-gray-300 leading-snug">$5–$1,000 tiers</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-sm rounded-xl p-2.5 md:p-4 border border-primary/20">
                    <div className="flex flex-col items-center space-y-1 md:space-y-2">
                      <div className="w-9 h-9 md:w-12 md:h-12 bg-gradient-to-br from-primary/30 to-primary/20 rounded-full flex items-center justify-center">
                        <UserCheck className="w-4 h-4 md:w-6 md:h-6 text-primary" />
                      </div>
                      <div className="text-center px-0.5">
                        <div className="text-sm md:text-lg font-bold text-white leading-tight">You choose</div>
                        <div className="text-xs text-gray-300 leading-snug">Who you review</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-secondary/10 to-secondary/5 backdrop-blur-sm rounded-xl p-2.5 md:p-4 border border-secondary/20">
                    <div className="flex flex-col items-center space-y-1 md:space-y-2">
                      <div className="w-9 h-9 md:w-12 md:h-12 bg-gradient-to-br from-secondary/30 to-secondary/20 rounded-full flex items-center justify-center">
                        <Bell className="w-4 h-4 md:w-6 md:h-6 text-secondary" />
                      </div>
                      <div className="text-center px-0.5">
                        <div className="text-sm md:text-lg font-bold text-white leading-tight">Guys find you</div>
                        <div className="text-xs text-gray-300 leading-snug">Notified on each request</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 md:space-y-4 px-0 sm:px-4 pb-2 md:pb-4">
                {/* Main CTA */}
                <Button 
                  size="xl" 
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary hover:to-secondary text-white py-5 md:py-6 text-base md:text-lg font-bold rounded-2xl shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-all duration-300 border-2 border-white/10 whitespace-normal min-h-[3.25rem]"
                  onClick={() => setStep(2)}
                >
                  <div className="flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-3 px-2 text-center">
                    <span className="leading-snug">Start your reviewer application</span>
                    <ArrowRight className="w-5 h-5 md:w-6 md:h-6 shrink-0" aria-hidden />
                  </div>
                </Button>

                <div className="bg-gradient-to-r from-primary/20 via-accent/20 to-secondary/20 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-primary/30">
                  <div className="text-center">
                    <p className="text-xs md:text-sm font-medium text-primary/85">Join our fantastic reviewer community!</p>
                    <div className="mt-1 h-14 md:h-16 flex items-center justify-center">
                      <div
                        className={`flex items-center gap-3 max-w-full px-1 transition-all duration-300 ${
                          isReviewerFading ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
                        }`}
                      >
                        {isReviewerNamesLoading
                          ? (
                            <p className="text-sm md:text-base text-white/80">Loading approved reviewers...</p>
                          )
                          : approvedReviewers.length > 0
                            ? (
                              <>
                                {approvedReviewers[activeReviewerNameIndex]?.avatarUrl ? (
                                  <img
                                    src={approvedReviewers[activeReviewerNameIndex].avatarUrl as string}
                                    alt={approvedReviewers[activeReviewerNameIndex].firstName}
                                    className="h-9 w-9 md:h-10 md:w-10 rounded-full object-cover border border-white/20"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="h-9 w-9 md:h-10 md:w-10 rounded-full border border-white/20 bg-white/10 flex items-center justify-center">
                                    <User className="h-4 w-4 md:h-5 md:w-5 text-white/70" />
                                  </div>
                                )}
                                <p className="max-w-[11rem] md:max-w-[16rem] truncate text-base md:text-xl font-semibold text-white">
                                  {approvedReviewers[activeReviewerNameIndex].firstName}
                                </p>
                              </>
                            )
                            : (
                              <p className="text-sm md:text-base text-white/80">Approved reviewers rotate here soon</p>
                            )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trust indicators */}
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 md:gap-4 text-xs text-gray-400">
                  <div className="flex items-center gap-1 md:gap-1.5">
                    <Check className="w-3 h-3 md:w-4 md:h-4 text-green-400" />
                    <span>No commitment</span>
                  </div>
                  <div className="w-0.5 h-0.5 bg-gray-600 rounded-full"></div>
                  <div className="flex items-center gap-1 md:gap-1.5">
                    <Shield className="w-3 h-3 md:w-4 md:h-4 text-secondary" />
                    <span>Vetted only</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {step === 2 && (
        <div className="flex-1 flex items-center justify-center px-4 py-4 md:py-8 min-h-[calc(100vh-120px)]">
          {isGoogleAuthed ? (
            <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="py-12 text-center space-y-6">
                <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-10 h-10 text-white" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-white">
                    {signupStatus === 'pending' ? 'Continue Your Application' : 'Already Signed In!'}
                  </h3>
                  <p className="text-gray-300">
                    You're authenticated with Google as <span className="text-green-400 font-semibold">{email}</span>
                    {signupStatus === 'pending' && (
                      <span className="block mt-2 text-primary text-sm">
                        You started the application process. You can continue where you left off.
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1 bg-transparent border-white/20 text-white hover:bg-white/10"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep(4)}
                    className="flex-1 bg-gradient-to-r from-primary to-secondary hover:from-primary hover:to-secondary text-white"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader className="text-center space-y-1 md:space-y-2 py-4 md:py-6">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-blue-500/20 to-blue-600/20 rounded-full flex items-center justify-center mx-auto">
                  <User className="w-6 h-6 md:w-8 md:h-8 text-blue-400" />
                </div>
                <CardTitle className="text-xl md:text-2xl font-bold text-white">Create Your Account</CardTitle>
                <CardDescription className="text-sm md:text-base text-gray-300">
                  Enter your email to get started
                </CardDescription>
              </CardHeader>
            
            <CardContent className="space-y-4 md:space-y-6 py-4 md:py-6">
              {error && (
                <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-3 py-2 md:px-4 md:py-3 rounded-lg text-xs md:text-sm">
                  {error}
                </div>
              )}
              
              {/* Google Auth */}
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full bg-white hover:bg-gray-50 text-gray-900 border-gray-300 py-2.5 md:py-3 hover:text-gray-900 active:text-gray-900 focus:text-gray-900"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" className="mr-2">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-600" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-gray-400">Or continue with email</span>
                </div>
            </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                {/* Marketing Consent */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="marketing-consent"
                      checked={marketingConsent}
                      onChange={(e) => setMarketingConsent(e.target.checked)}
                      className="mt-1 w-4 h-4 text-primary bg-white/10 border-white/20 rounded focus:ring-primary focus:ring-2"
                    />
                    <label htmlFor="marketing-consent" className="text-sm text-gray-300 leading-relaxed">
                      I agree to receive marketing messages by email and SMS about new features, opportunities, and updates
                    </label>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 bg-transparent border-white/20 text-white hover:bg-white/10"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={loading || !email}
                  className="flex-1 bg-gradient-to-r from-primary to-secondary hover:from-primary hover:to-secondary text-white"
                >
                  {loading ? 'Please wait...' : 'Continue'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="flex-1 flex items-center justify-center px-4 py-4 md:py-8 min-h-[calc(100vh-120px)]">
          {isGoogleAuthed ? (
            <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="py-12 text-center space-y-6">
                <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-10 h-10 text-white" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-white">Password Not Required</h3>
                  <p className="text-gray-300">
                    You signed in with Google, so you don't need a password!
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="flex-1 bg-transparent border-white/20 text-white hover:bg-white/10"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep(4)}
                    className="flex-1 bg-gradient-to-r from-primary to-secondary hover:from-primary hover:to-secondary text-white"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader className="text-center space-y-1 md:space-y-2 py-4 md:py-6">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-green-500/20 to-green-600/20 rounded-full flex items-center justify-center mx-auto">
                  <Lock className="w-6 h-6 md:w-8 md:h-8 text-green-400" />
                </div>
                <CardTitle className="text-xl md:text-2xl font-bold text-white">Secure Your Account</CardTitle>
                <CardDescription className="text-sm md:text-base text-gray-300">
                  Create a strong password to protect your account
                </CardDescription>
              </CardHeader>
            
            <CardContent className="space-y-4 md:space-y-6 py-4 md:py-6">
              {error && (
                <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-3 py-2 md:px-4 md:py-3 rounded-lg text-xs md:text-sm">
                  {error}
                </div>
              )}
              
              <div className="space-y-3 md:space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    autoComplete="new-password"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    style={{
                      WebkitTextFillColor: '#ffffff',
                      WebkitBoxShadow: '0 0 0px 1000px rgba(255, 255, 255, 0.1) inset',
                    }}
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className={`${isPasswordValid ? 'text-green-400' : 'text-red-400'}`}>
                      Strength: {passwordStrength.label}
                    </span>
                    <div className="flex space-x-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`w-2 h-1 rounded-full ${
                            level <= passwordStrength.score
                              ? isPasswordValid
                                ? 'bg-green-400'
                                : 'bg-primary'
                              : 'bg-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Confirm Password</label>
                  <input
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    style={{
                      WebkitTextFillColor: '#ffffff',
                      WebkitBoxShadow: '0 0 0px 1000px rgba(255, 255, 255, 0.1) inset',
                    }}
                  />
                {!passwordsMatch && passwordConfirm.length > 0 && (
                    <div className="text-xs text-red-400">Passwords do not match</div>
                )}
              </div>
            </div>

              {/* Password Requirements */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 md:p-4">
                <h4 className="text-xs md:text-sm font-medium text-blue-300 mb-1.5 md:mb-2">Password Requirements:</h4>
                <ul className="text-[10px] md:text-xs text-blue-200 space-y-0.5 md:space-y-1">
                  <li className={`flex items-center ${password.length >= 8 ? 'text-green-400' : ''}`}>
                    <Check className={`w-3 h-3 mr-2 ${password.length >= 8 ? 'text-green-400' : 'text-gray-500'}`} />
                    At least 8 characters
                  </li>
                  <li className={`flex items-center ${/[A-Z]/.test(password) ? 'text-green-400' : ''}`}>
                    <Check className={`w-3 h-3 mr-2 ${/[A-Z]/.test(password) ? 'text-green-400' : 'text-gray-500'}`} />
                    One uppercase letter
                  </li>
                  <li className={`flex items-center ${/[a-z]/.test(password) ? 'text-green-400' : ''}`}>
                    <Check className={`w-3 h-3 mr-2 ${/[a-z]/.test(password) ? 'text-green-400' : 'text-gray-500'}`} />
                    One lowercase letter
                  </li>
                  <li className={`flex items-center ${/\d/.test(password) ? 'text-green-400' : ''}`}>
                    <Check className={`w-3 h-3 mr-2 ${/\d/.test(password) ? 'text-green-400' : 'text-gray-500'}`} />
                    One number
                  </li>
                </ul>
            </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="flex-1 bg-transparent border-white/20 text-white hover:bg-white/10"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={loading || !isPasswordValid || !passwordsMatch}
                  className="flex-1 bg-gradient-to-r from-primary to-secondary hover:from-primary hover:to-secondary text-white"
                >
                  {loading ? 'Creating...' : 'Continue'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
          </div>
            </CardContent>
          </Card>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="flex-1 flex items-start md:items-center justify-center px-4 py-2 md:py-8 min-h-[calc(100vh-120px)] overflow-y-auto">
          <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader className="text-center space-y-1 md:space-y-2 py-3 md:py-6">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-blue-500/20 to-blue-600/20 rounded-full flex items-center justify-center mx-auto">
                <User className="w-6 h-6 md:w-8 md:h-8 text-blue-400" />
              </div>
              <CardTitle className="text-xl md:text-2xl font-bold text-white">Add Your Photo</CardTitle>
              <CardDescription className="text-sm md:text-base text-gray-300">
                Upload a clear profile picture of yourself (required)
              </CardDescription>
            </CardHeader>
          
          <CardContent className="space-y-4 md:space-y-6 py-2 md:py-6">
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-3 py-2 md:px-4 md:py-3 rounded-lg text-xs md:text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-4 md:space-y-6">
              {/* Profile Picture Upload */}
              <div className="space-y-3 flex flex-col items-center">
                <WebAvatarUploader
                  currentAvatarUrl={avatarUrl}
                  onAvatarChange={(url, path) => {
                    setAvatarUrl(url);
                    setAvatarPath(path);
                  }}
                  size={140}
                  ownerFirstName={firstName}
                  ownerLastName={lastName}
                  ownerId={signupUserId}
                  ownerEmail={email}
                />
                <p className="text-sm text-gray-300 text-center max-w-sm">
                  Upload a clear photo of yourself. This is required to complete your application.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setStep(isGoogleAuthed ? 2 : 3)}
                className="flex-1 bg-transparent border-white/20 text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!avatarUrl || !avatarPath}
                className="flex-1 bg-gradient-to-r from-primary to-secondary hover:from-primary hover:to-secondary text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      )}

      {step === 5 && (
        <div className="flex-1 flex items-start md:items-center justify-center px-4 py-2 md:py-8 min-h-[calc(100vh-120px)] overflow-y-auto">
          <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader className="text-center space-y-1 md:space-y-2 py-3 md:py-6">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-green-500/20 to-green-600/20 rounded-full flex items-center justify-center mx-auto">
                <DollarSign className="w-6 h-6 md:w-8 md:h-8 text-green-400" />
              </div>
              <CardTitle className="text-xl md:text-2xl font-bold text-white">Set Your Rate</CardTitle>
              <CardDescription className="text-sm md:text-base text-gray-300">
                Choose how much you'd like to earn per review
              </CardDescription>
            </CardHeader>
          
          <CardContent className="space-y-4 md:space-y-6 py-2 md:py-6">
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-3 py-2 md:px-4 md:py-3 rounded-lg text-xs md:text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-6">
              {/* Rate Input */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-300 text-center block">
                  Your Rate Per Review
                </label>
                <PriceTierSelector
                  value={hourlyRate}
                  onChange={setHourlyRate}
                />
                <p className="text-xs text-gray-400 text-center">
                  Select a price tier from the dropdown (e.g., $25, $50, $75, etc.)
                </p>
              </div>

              {/* Earnings Calculator */}
              {hourlyRate && !isNaN(parseFloat(hourlyRate)) && parseFloat(hourlyRate) > 0 && (() => {
                const rate = parseFloat(hourlyRate);
                const takeHomeRate = rate * 0.8; // 80% take home
                const platformFee = rate * 0.2; // 20% platform fee
                
                return (
                  <div className="space-y-4">
                    {/* Breakdown Section */}
                    <div className="bg-gradient-to-br from-green-500/20 via-emerald-500/20 to-teal-500/20 border border-green-500/30 rounded-xl p-5">
                      <h3 className="text-sm font-semibold text-white mb-4 text-center">Your Take-Home Breakdown</h3>
                      <div className="bg-black/30 rounded-lg p-4 space-y-3">
                        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                          <span className="text-sm text-gray-300">Rate</span>
                          <span className="text-lg font-semibold text-white tabular-nums">${rate.toFixed(0)}</span>
                        </div>
                        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 text-xs text-gray-400">
                          <span>Platform fee</span>
                          <span className="tabular-nums shrink-0">-${platformFee.toFixed(2)}</span>
                        </div>
                        <div className="pt-3 border-t border-green-500/30 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                          <span className="text-sm font-semibold text-green-300">You take home</span>
                          <span className="text-2xl font-bold text-green-400 tabular-nums">${takeHomeRate.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Projected Earnings Section */}
                    <div className="bg-gradient-to-br from-blue-500/20 via-indigo-500/20 to-secondary/20 border border-blue-500/30 rounded-xl p-5">
                      <h3 className="text-sm font-semibold text-white mb-4 text-center">Projected Earnings</h3>
                      <div className="space-y-3">
                        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                          <span className="text-sm text-gray-300">Per review</span>
                          <span className="text-xl font-bold text-blue-400 tabular-nums">${takeHomeRate.toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                          <span className="text-sm text-gray-300">× 5 per week</span>
                          <span className="text-lg font-semibold text-blue-300 tabular-nums">${(takeHomeRate * 5).toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                          <span className="text-sm text-gray-300">× 20 per month</span>
                          <span className="text-lg font-semibold text-blue-300 tabular-nums">${(takeHomeRate * 20).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Default Earnings Info */}
              {(!hourlyRate || isNaN(parseFloat(hourlyRate)) || parseFloat(hourlyRate) <= 0) && (
                <div className="bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/20 border border-primary/30 rounded-xl p-5">
                  <div className="text-center space-y-2">
                    <p className="text-sm font-semibold text-white">Typical Rate</p>
                    <p className="text-sm text-gray-300 text-center leading-relaxed px-1">
                      Most reviewers: <span className="text-primary font-semibold tabular-nums">$25–50</span> per review
                    </p>
                    <p className="text-xs text-gray-400">Set your rate above or we'll suggest one</p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setStep(4)}
                className="flex-1 bg-transparent border-white/20 text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleNext}
                className="flex-1 bg-gradient-to-r from-primary to-secondary hover:from-primary hover:to-secondary text-white"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      )}

      {step === 6 && (
        <div className="flex-1 flex items-center justify-center px-4 py-4 md:py-8 min-h-[calc(100vh-120px)]">
          <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader className="text-center space-y-1 md:space-y-2 py-4 md:py-6">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-blue-500/20 to-blue-600/20 rounded-full flex items-center justify-center mx-auto">
                <Phone className="w-6 h-6 md:w-8 md:h-8 text-blue-400" />
              </div>
              <CardTitle className="text-xl md:text-2xl font-bold text-white">Phone Number</CardTitle>
              <CardDescription className="text-sm md:text-base text-gray-300">
                We need your phone number to contact you about reviews
              </CardDescription>
            </CardHeader>
          
          <CardContent className="space-y-4 md:space-y-6 py-4 md:py-6">
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-3 py-2 md:px-4 md:py-3 rounded-lg text-xs md:text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-4 md:space-y-5">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jane"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <p className="text-xs text-gray-400">
                  We'll use this to notify you about new review requests and payment updates.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setStep(5)}
                className="w-full bg-transparent border-white/20 text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={loading || !phone || !firstName || !lastName}
                className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary hover:to-secondary text-white py-6 text-base font-semibold rounded-xl shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all duration-300"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Submitting...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Complete Application
                    <ArrowRight className="w-5 h-5" />
                  </span>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      )}

      {step === 7 && (
        <div className="flex-1 flex items-center justify-center px-4 py-8 min-h-[calc(100vh-120px)]">
          <Card className="w-full max-w-lg bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-8 md:p-10 space-y-8">
              {/* Success Icon */}
              <div className="flex justify-center">
                <div className="w-24 h-24 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
                  <Check className="w-12 h-12 text-white" />
                </div>
              </div>
              
              {/* Success Message */}
              <div className="text-center space-y-3">
                <h3 className="text-3xl md:text-4xl font-bold text-white">Application Submitted! 🎉</h3>
                <p className="text-base text-gray-300 leading-relaxed max-w-md mx-auto">
                  Thank you for applying to become a reviewer! We've received your application.
                </p>
              </div>

              {/* Rohan's Message */}
              <div className="bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/20 border border-primary/30 rounded-xl p-6 space-y-4 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 rounded-full overflow-hidden flex-shrink-0 border-2 border-primary/50 shadow-lg">
                    <img
                      src="/rohan-headshot-backyard-min.jpg"
                      alt="Rohan"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/rohan-headshot.jpg';
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-base text-white font-semibold">Rohan O'Malley</p>
                    <p className="text-sm text-gray-300">Founder</p>
                  </div>
                </div>
                <div className="text-sm text-gray-200 leading-relaxed">
                  <p>
                    Hey! I review every application personally to make sure it aligns with the quality bar on Auro. We will follow up as soon as your application has been reviewed.
                  </p>
                </div>
              </div>

              {/* Next Steps */}
              <div className="bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-secondary/10 border border-blue-500/20 rounded-xl p-6 space-y-4">
                <h4 className="text-base font-semibold text-white text-center">What happens next?</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0 mt-1.5"></div>
                    <span className="text-sm text-gray-300 flex-1">Check your email and verify your account</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0 mt-1.5"></div>
                    <span className="text-sm text-gray-300 flex-1">We'll personally review your application</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0 mt-1.5"></div>
                    <span className="text-sm text-gray-300 flex-1">You'll receive an email notification once your application is reviewed</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-4 pt-2">
                <Button 
                  asChild
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary hover:to-secondary text-white py-6 text-base font-semibold rounded-xl shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all duration-300"
                >
                  <a href="/">
                    Back to Home
                  </a>
                </Button>
                
                <p className="text-xs text-gray-400 text-center">
                  Questions? Reach out to us at <span className="text-primary">support@appauro.com</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}



