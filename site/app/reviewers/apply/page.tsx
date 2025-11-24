'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import ReviewerCounter from '../../../components/ReviewerCounter';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { ArrowLeft, ArrowRight, Check, Star, DollarSign, Users, Clock, Shield, Mail, Lock, User, FileText, Target, Phone, Instagram, Music } from 'lucide-react';


export default function FoundingReviewerApplyPage() {
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
  const [instagramHandle, setInstagramHandle] = useState('');
  const [tiktokHandle, setTiktokHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [reviewerCount, setReviewerCount] = useState<number>(0);
  const [isGoogleAuthed, setIsGoogleAuthed] = useState(false);
  const [signupStatus, setSignupStatus] = useState<'not_started' | 'pending' | 'completed' | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
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
        instagramHandle,
        tiktokHandle,
        timestamp: Date.now()
      };
      localStorage.setItem('auro_reviewer_form_data', JSON.stringify(formData));
    } catch (error) {
      console.warn('[ReviewerApply] Failed to save form data:', error);
    }
  }, [step, firstName, lastName, email, phone, marketingConsent, avatarUrl, avatarPath, instagramHandle, tiktokHandle]);

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
          setInstagramHandle(formData.instagramHandle || '');
          setTiktokHandle(formData.tiktokHandle || '');
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
  }, [step, firstName, lastName, email, phone, marketingConsent, avatarUrl, avatarPath, instagramHandle, tiktokHandle, saveFormData]);

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
              if (email) setEmail(email);
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
          
          // Check signup status with retry
          try {
            const response = await withRetry(async () => {
              return fetch('/api/reviewers/signup-status', {
                headers: { authorization: `Bearer ${session.access_token}` }
              });
            }, 2, 500);
            
            if (response.ok) {
              const data = await response.json();
              if (isMounted) {
                setSignupStatus(data.status);
                
                // If they already completed signup, show completion message
                if (data.status === 'completed') {
                  setError('You have already completed the reviewer application. An account with this email is already associated with our platform.');
                  setIsCheckingStatus(false);
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
            // Don't fail the entire flow for this - just log the error
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
        if (isMounted) {
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
            if (session.user.email) setEmail(session.user.email);
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
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
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

  // Fetch reviewer count - only count completed reviewers
  useEffect(() => {
    const fetchReviewerCount = async () => {
      try {
        if (!supabase) {
          console.error('[ReviewerApply] Supabase client is not available');
          return;
        }
        // Count only completed reviewers from profiles table
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id', { count: 'exact' })
          .eq('is_reviewer', true)
          .eq('reviewer_signup_status', 'completed');
        
        if (!profileError && profileData) {
          setReviewerCount(profileData.length || 0);
          return;
        }

        // Fallback to creators table (legacy)
        const { data, error } = await supabase
          .from('creators')
          .select('id', { count: 'exact' })
          .eq('is_reviewer', true);

        if (!error && data) {
          setReviewerCount(data.length || 0);
        }
      } catch (err) {
        console.error('Error fetching reviewer count:', err);
        // Silently fail - default to 0
      }
    };

    fetchReviewerCount();
    const interval = setInterval(fetchReviewerCount, 30000);
    return () => clearInterval(interval);
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
      if (!firstName || !lastName || !email) { setError('Please enter your first name, last name, and email'); return; }
      
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
      if (!isPasswordValid) { setError('Password must be at least 8 chars with uppercase, lowercase, number, and symbol'); return; }
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
        if (e?.message?.includes('already registered')) {
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
      // Phone number step - submit application (profile picture step removed)
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
        const signupUserId = localStorage.getItem('auro_signup_user_id');
        const signupEmail = localStorage.getItem('auro_signup_email');
        const signupFullName = localStorage.getItem('auro_signup_full_name') || '';
        
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
          hourlyRate: null,
          avatarUrl: avatarUrl,
          avatarPath: avatarPath,
          socials: [],
          instagramHandle: instagramHandle || null,
          tiktokHandle: tiktokHandle || null,
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
        
        // Send confirmation email
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
        }
        
        clearFormData(); // Clear saved data on successful submission
        setStep(6);
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
      { id: 4, label: 'Phone', shortLabel: 'Phone', icon: Phone },
      { id: 6, label: 'Done', shortLabel: 'Done', icon: Check }
    ];

    // Calculate progress percentage, capping at 100%
    const lastStepId = Math.max(...steps.map(s => s.id));
    const progressPercent = Math.min(100, ((step - 1) / (lastStepId - 1)) * 100);

    return (
      <div className="w-full px-2 py-3 md:px-4 md:py-6 bg-gradient-to-b from-[#0c0325]/50 to-transparent">
        <div className="flex items-center justify-between relative max-w-5xl mx-auto">
          {/* Progress line */}
          <div className="absolute top-4 md:top-6 left-0 right-0 h-0.5 bg-white/10">
            <div 
              className="h-full bg-gradient-to-r from-orange-500 to-purple-600 transition-all duration-500 ease-out shadow-sm shadow-orange-500/50"
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
                className="flex flex-col items-center relative z-10 flex-1"
                onClick={isClickable ? () => setStep(stepItem.id) : undefined}
                style={{ cursor: isClickable ? 'pointer' : 'default' }}
              >
                <div
                  className={`
                    w-7 h-7 md:w-12 md:h-12 rounded-full flex items-center justify-center text-sm font-semibold
                    transition-all duration-300 ease-out
                    ${isCompleted 
                      ? 'bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow-lg shadow-orange-500/30' 
                      : isCurrent 
                        ? 'bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow-xl shadow-orange-500/50 scale-110' 
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
                <span className={`
                  mt-1 md:mt-2 text-[10px] md:text-xs font-medium text-center px-0.5
                  hidden sm:block
                  ${isCurrent ? 'text-orange-400 font-bold' : isCompleted ? 'text-white' : 'text-gray-500'}
                `}>
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
      <div className="min-h-screen bg-gradient-to-br from-[#0c0325] via-[#1a0b3d] to-[#0c0325] text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-300">Checking your account status...</p>
        </div>
      </div>
    );
  }

  // Show completion message if they already completed signup
  if (signupStatus === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0c0325] via-[#1a0b3d] to-[#0c0325] text-white flex items-center justify-center px-6">
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
                className="w-full bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white"
              >
                <a href="/">
                  Back to Home
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c0325] via-[#1a0b3d] to-[#0c0325] text-white">
      <div className="w-full">
        <Stepper />
      </div>
      
      {step === 1 && (
        <div className="flex-1 flex items-center justify-center px-4 py-2 md:py-6 min-h-[calc(100vh-120px)] md:min-h-[calc(100vh-100px)]">
          {/* Layout - Optimized for all screen sizes */}
          <div className="w-full max-w-2xl mx-auto">
            <div className="flex flex-col justify-between h-[calc(100vh-140px)] max-h-[700px] md:max-h-[800px]">
              {/* Top Section - Compact */}
              <div className="text-center space-y-2.5 md:space-y-4 pt-2 md:pt-4">
                <Badge className="bg-gradient-to-r from-orange-500/20 to-purple-600/20 border-orange-500/30 text-orange-400 px-3 py-1 md:px-4 md:py-2 text-xs md:text-sm">
                  <Star className="w-3 h-3 md:w-4 md:h-4 mr-1.5 md:mr-2" />
                  Exclusive Founding Program
                </Badge>
                
                <h1 className="text-3xl md:text-5xl font-bold leading-tight px-2">
                  <span className="block text-white">Girls rate guys.</span>
                  <span className="block text-white">Guys get advice.</span>
                  <span className="block bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
                    Girls get paid.
                  </span>
                </h1>
                
                <p className="text-xs md:text-base text-gray-300 px-4 leading-relaxed max-w-xl mx-auto">
                  We're building the platform where your honest feedback helps guys level up—and you earn money doing it. 
                  <span className="text-orange-400 font-semibold"> Join the first 35 reviewers</span> and lock in exclusive perks forever.
                </p>
              </div>

              {/* Middle Section - Benefits Cards */}
              <div className="px-4 space-y-2.5 md:space-y-4">
                <div className="grid grid-cols-3 gap-2.5 md:gap-4">
                  <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 backdrop-blur-sm rounded-xl p-2.5 md:p-4 border border-green-500/20">
                    <div className="flex flex-col items-center space-y-1 md:space-y-2">
                      <div className="w-9 h-9 md:w-12 md:h-12 bg-gradient-to-br from-green-500/30 to-green-600/20 rounded-full flex items-center justify-center">
                        <DollarSign className="w-4 h-4 md:w-6 md:h-6 text-green-400" />
                      </div>
                      <div className="text-center">
                        <div className="text-sm md:text-lg font-bold text-white">$25-50</div>
                        <div className="text-[10px] md:text-xs text-gray-300">per review</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 backdrop-blur-sm rounded-xl p-2.5 md:p-4 border border-orange-500/20">
                    <div className="flex flex-col items-center space-y-1 md:space-y-2">
                      <div className="w-9 h-9 md:w-12 md:h-12 bg-gradient-to-br from-orange-500/30 to-orange-600/20 rounded-full flex items-center justify-center">
                        <Star className="w-4 h-4 md:w-6 md:h-6 text-orange-400" />
                      </div>
                      <div className="text-center">
                        <div className="text-sm md:text-lg font-bold text-white">80%</div>
                        <div className="text-[10px] md:text-xs text-gray-300">earnings forever</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 backdrop-blur-sm rounded-xl p-2.5 md:p-4 border border-purple-500/20">
                    <div className="flex flex-col items-center space-y-1 md:space-y-2">
                      <div className="w-9 h-9 md:w-12 md:h-12 bg-gradient-to-br from-purple-500/30 to-purple-600/20 rounded-full flex items-center justify-center">
                        <Clock className="w-4 h-4 md:w-6 md:h-6 text-purple-400" />
                      </div>
                      <div className="text-center">
                        <div className="text-sm md:text-lg font-bold text-white">Flexible</div>
                        <div className="text-[10px] md:text-xs text-gray-300">schedule</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Additional perks */}
                <div className="bg-gradient-to-r from-blue-500/10 to-indigo-600/10 backdrop-blur-sm rounded-xl p-2.5 md:p-4 border border-blue-500/20">
                  <div className="flex items-center justify-center gap-4 md:gap-6 text-xs md:text-sm">
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <Shield className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-400" />
                      <span className="text-white font-medium">Founding badge</span>
                    </div>
                    <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <Users className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-400" />
                      <span className="text-white font-medium">Priority reviews</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Section - CTA + Urgency */}
              <div className="space-y-2.5 md:space-y-4 px-4 pb-4 md:pb-6">
                {/* Live counter urgency bar */}
                <div className="bg-gradient-to-r from-orange-500/20 via-pink-500/20 to-purple-600/20 backdrop-blur-sm rounded-xl p-2.5 md:p-4 border border-orange-500/30">
                  <div className="flex items-center justify-between mb-1.5 md:mb-2">
                    <span className="text-xs md:text-sm font-medium text-orange-300">Founding Spots</span>
                    <span className="text-xs md:text-sm font-bold text-white">{Math.max(0, 35 - reviewerCount)}/35 left</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 md:h-3 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-500 to-pink-500 transition-all duration-500 rounded-full"
                      style={{ width: `${Math.min(100, ((35 - reviewerCount) / 35) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Main CTA */}
                <Button 
                  size="xl" 
                  className="w-full bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white py-5 md:py-6 text-base md:text-lg font-bold rounded-2xl shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/50 transition-all duration-300 border-2 border-white/10"
                  onClick={() => setStep(2)}
                >
                  <div className="flex items-center justify-center gap-2 md:gap-3">
                    <span>Join Now - Limited Spots!</span>
                    <ArrowRight className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                </Button>

                {/* Trust indicators */}
                <div className="flex items-center justify-center gap-3 md:gap-4 text-[10px] md:text-xs text-gray-400">
                  <div className="flex items-center gap-1 md:gap-1.5">
                    <Check className="w-3 h-3 md:w-4 md:h-4 text-green-400" />
                    <span>No commitment</span>
                  </div>
                  <div className="w-0.5 h-0.5 bg-gray-600 rounded-full"></div>
                  <div className="flex items-center gap-1 md:gap-1.5">
                    <Clock className="w-3 h-3 md:w-4 md:h-4 text-blue-400" />
                    <span>Launch Jan 15</span>
                  </div>
                  <div className="w-0.5 h-0.5 bg-gray-600 rounded-full"></div>
                  <div className="flex items-center gap-1 md:gap-1.5">
                    <Shield className="w-3 h-3 md:w-4 md:h-4 text-purple-400" />
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
                      <span className="block mt-2 text-orange-400 text-sm">
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
                    className="flex-1 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white"
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
                  Tell us who you are and how to reach you
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
                  <span className="bg-[#0c0325] px-2 text-gray-400">Or continue with email</span>
                </div>
            </div>

              {/* Form Fields */}
              <div className="space-y-4">
                {/* Name Fields - Side by Side */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Jane"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                      className="mt-1 w-4 h-4 text-orange-500 bg-white/10 border-white/20 rounded focus:ring-orange-500 focus:ring-2"
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
                  disabled={loading || !firstName || !lastName || !email}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white"
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
                    className="flex-1 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white"
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
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                                : 'bg-orange-400'
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
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                  <li className={`flex items-center ${/[^A-Za-z0-9]/.test(password) ? 'text-green-400' : ''}`}>
                    <Check className={`w-3 h-3 mr-2 ${/[^A-Za-z0-9]/.test(password) ? 'text-green-400' : 'text-gray-500'}`} />
                    One special character
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
                  className="flex-1 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white"
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
            
            <div className="space-y-3 md:space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400">
                  We'll use this to notify you about new review requests and payment updates.
                </p>
              </div>

              {/* Social Media Handles */}
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Instagram className="w-4 h-4 text-pink-400" />
                    Instagram Handle
                  </label>
                  <input
                    type="text"
                    value={instagramHandle}
                    onChange={(e) => setInstagramHandle(e.target.value)}
                    placeholder="@yourusername"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-400">
                    Optional: Your Instagram handle (without the @ symbol)
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Music className="w-4 h-4 text-gray-400" />
                    TikTok Handle
                  </label>
                  <input
                    type="text"
                    value={tiktokHandle}
                    onChange={(e) => setTiktokHandle(e.target.value)}
                    placeholder="@yourusername"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-400">
                    Optional: Your TikTok handle (without the @ symbol)
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
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
                disabled={loading || !phone}
                className="flex-1 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white"
              >
                {loading ? 'Submitting...' : 'Complete Application'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      )}

      {step === 6 && (
        <div className="flex-1 flex items-center justify-center px-4 py-8 min-h-[calc(100vh-120px)]">
          <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-white/20 text-center">
            <CardContent className="p-8 space-y-6">
              <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-10 h-10 text-white" />
              </div>
              
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-white">Application Submitted! 🎉</h3>
                <p className="text-gray-300 leading-relaxed">
                  Thank you for applying to become a reviewer! We've received your application and will review it personally.
                </p>
              </div>

              <div className="bg-gradient-to-r from-orange-500/20 to-purple-600/20 border border-orange-500/30 rounded-lg p-4 space-y-3">
                <h4 className="text-lg font-semibold text-white">What happens next?</h4>
                <div className="space-y-2 text-sm text-gray-300">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span>Check your email and verify your account</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span>We'll personally review your application to ensure you align with our platform</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span>You'll receive an email notification once your application is approved</span>
                  </div>
                  
                  {/* Approval Notice */}
                  <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-xs text-blue-300 text-center">
                      ⏳ <strong>Review Process:</strong> We personally review each application to ensure quality. You'll be notified via email once your application has been reviewed.
                    </p>
                  </div>
            </div>
          </div>

              <div className="space-y-4">
                <Button 
                  asChild
                  className="w-full bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white"
                >
                  <a href="/">
                    Back to Home
                  </a>
                </Button>
                
                <p className="text-xs text-gray-400">
                  Questions? Reach out to us at support@appauro.com
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}



