'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase as supabaseClient } from '../../lib/supabase';

// Step components
import IntroStep from './components/IntroStep';
import CreatorSelection from './components/CreatorSelection';
import PhotoUpload from './components/PhotoUpload';
import PromptAnswers from './components/PromptAnswers';
import ConsentForm from './components/ConsentForm';
import AuthStep from './components/AuthStep';
import PaymentStep from './components/PaymentStep';
import DownloadApp from './components/DownloadApp';
import AsyncAvatar from './components/AsyncAvatar';

export type RequestData = {
  creatorId?: string;
  creatorSlug?: string;
  photos: { outfits: string[]; roomTourPhotos: string[]; datingProfileScreenshots: string[] };
  message: string;
  consent: {
    shareOnSocial: boolean | undefined;
    agreedAt: string;
  };
  userId?: string;
  requestId?: string;
  uploadSessionId?: string;
};

const STEPS = [
  'intro',
  'creator-selection',
  'photo-upload', 
  'prompt-answers',
  'consent',
  'auth',
  'payment',
  'download-app'
] as const;

type Step = typeof STEPS[number];

export default function RequestPage() {
  const router = useRouter();
  
  // Initialize currentStep from localStorage if available (for OAuth return)
  // Use lazy initializer to check localStorage only once on mount
  const [currentStep, setCurrentStep] = useState<Step>(() => {
    if (typeof window === 'undefined') return 'intro';
    try {
      const saved = localStorage.getItem('auro_request_flow_state');
      if (saved) {
        const flowState = JSON.parse(saved);
        const age = Date.now() - (flowState.timestamp || 0);
        // Only use saved state if it's recent (within 30 minutes)
        if (age <= 30 * 60 * 1000) {
          const stepToRestore = flowState.currentStep || flowState.step;
          if (stepToRestore && STEPS.includes(stepToRestore as Step)) {
            console.log('[RequestPage] Initializing from saved state:', stepToRestore);
            return stepToRestore as Step;
          }
        }
      }
    } catch (e) {
      console.warn('[RequestPage] Failed to read saved state on init:', e);
    }
    return 'intro';
  });
  
  // Initialize requestData from localStorage if available
  const [requestData, setRequestData] = useState<RequestData>(() => {
    if (typeof window === 'undefined') {
      return {
        photos: { outfits: [], roomTourPhotos: [], datingProfileScreenshots: [] },
        message: '',
        consent: {
          shareOnSocial: undefined,
          agreedAt: ''
        }
      };
    }
    try {
      const saved = localStorage.getItem('auro_request_flow_state');
      if (saved) {
        const flowState = JSON.parse(saved);
        const age = Date.now() - (flowState.timestamp || 0);
        if (age <= 30 * 60 * 1000 && flowState.requestData) {
          console.log('[RequestPage] Initializing requestData from saved state');
          // Use saved data with fallbacks for required properties
          const saved = flowState.requestData;
          return {
            photos: saved.photos || { outfits: [], roomTourPhotos: [], datingProfileScreenshots: [] },
            message: saved.message || '',
            consent: saved.consent || {
              shareOnSocial: undefined,
              agreedAt: ''
            },
            creatorId: saved.creatorId,
            creatorSlug: saved.creatorSlug,
            userId: saved.userId,
            requestId: saved.requestId,
            uploadSessionId: saved.uploadSessionId,
          };
        }
      }
    } catch (e) {
      console.warn('[RequestPage] Failed to read saved requestData on init:', e);
    }
    return {
      photos: { outfits: [], roomTourPhotos: [], datingProfileScreenshots: [] },
      message: '',
      consent: {
        shareOnSocial: undefined,
        agreedAt: ''
      }
    };
  });
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [supabase, setSupabase] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  // Check if Supabase client is properly configured
  if (!supabaseClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-card to-background flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-white mb-4">Configuration Error</h1>
          <p className="text-white/80 mb-6">
            The application is missing required environment variables for database connection.
          </p>
          <p className="text-white/60 text-sm">
            Please ensure <code className="bg-white/20 px-2 py-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="bg-white/20 px-2 py-1 rounded">NEXT_PUBLIC_SUPABASE_ANON</code> are configured.
          </p>
        </div>
      </div>
    );
  }

  // Save flow state to localStorage
  // Use refs to always get the latest values
  const currentStepRef = useRef(currentStep);
  const requestDataRef = useRef(requestData);
  
  useEffect(() => {
    currentStepRef.current = currentStep;
    requestDataRef.current = requestData;
  }, [currentStep, requestData]);

  const saveFlowState = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const flowState = {
        currentStep: currentStepRef.current,
        requestData: requestDataRef.current,
        timestamp: Date.now(),
      };
      localStorage.setItem('auro_request_flow_state', JSON.stringify(flowState));
    } catch (e) {
      console.warn('[RequestPage] Failed to save flow state:', e);
    }
  }, []);

  const clearFlowState = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem('auro_request_flow_state');
    } catch (e) {
      console.warn('[RequestPage] Failed to clear flow state:', e);
    }
  }, []);

  // Restore flow state from localStorage (if returning from OAuth)
  // Can be called for any user - will restore state if available (typically after OAuth)
  const restoreFlowState = useCallback(() => {
    if (typeof window === 'undefined') return false;
    try {
      const saved = localStorage.getItem('auro_request_flow_state');
      if (!saved) return false;
      
      const flowState = JSON.parse(saved);
      // Only restore if saved within last 30 minutes (OAuth shouldn't take that long)
      const age = Date.now() - (flowState.timestamp || 0);
      if (age > 30 * 60 * 1000) {
        clearFlowState();
        return false;
      }
      
      // Check if URL has creator params that differ from saved state
      // If so, don't restore - let the URL params processing handle it
      const urlParams = new URLSearchParams(window.location.search);
      const urlCreatorSlug = urlParams.get('creatorSlug');
      const urlCreatorId = urlParams.get('creatorId');
      const savedCreatorSlug = flowState.requestData?.creatorSlug;
      const savedCreatorId = flowState.requestData?.creatorId;
      
      if (urlCreatorSlug || urlCreatorId) {
        // URL has creator params - verify they match saved state
        const creatorsMatch = 
          (urlCreatorSlug && savedCreatorSlug && urlCreatorSlug === savedCreatorSlug) ||
          (urlCreatorId && savedCreatorId && urlCreatorId === savedCreatorId) ||
          (!urlCreatorSlug && !urlCreatorId && !savedCreatorSlug && !savedCreatorId);
        
        if (!creatorsMatch) {
          console.log('[RequestPage] Not restoring state - URL creator differs from saved creator. URL:', { urlCreatorSlug, urlCreatorId }, 'Saved:', { savedCreatorSlug, savedCreatorId });
          clearFlowState();
          return false;
        }
      }
      
      // Support both 'step' (old format) and 'currentStep' (new format) for backward compatibility
      const stepToRestore = flowState.currentStep || flowState.step;
      
      if (stepToRestore && STEPS.includes(stepToRestore as Step)) {
        // Only restore if we're not already on a later step (don't go backwards)
        const currentIndex = STEPS.indexOf(currentStepRef.current);
        const restoreIndex = STEPS.indexOf(stepToRestore as Step);
        
        // Only restore if the saved step is at or after our current step
        // This prevents going backwards if user has already progressed
        if (restoreIndex >= currentIndex || currentIndex === 0) {
          // Restore the step
          setCurrentStep(stepToRestore);
          
          // Restore requestData if available (should always be present in new saves)
          // Merge with existing data to preserve any new data that might have been added
          if (flowState.requestData) {
            setRequestData(prev => ({
              ...prev,
              ...flowState.requestData,
              // Preserve current values if they exist and saved ones don't
              photos: flowState.requestData.photos || prev.photos,
              message: flowState.requestData.message || prev.message,
              consent: flowState.requestData.consent || prev.consent,
            }));
            console.log('[RequestPage] Restored flow state with data:', stepToRestore, {
              hasPhotos: !!(flowState.requestData.photos?.datingProfileScreenshots?.length || flowState.requestData.photos?.outfits?.length || flowState.requestData.photos?.roomTourPhotos?.length),
              hasMessage: !!flowState.requestData.message,
              hasCreator: !!(flowState.requestData.creatorId || flowState.requestData.creatorSlug),
            });
          } else {
            console.log('[RequestPage] Restored flow state (step only):', stepToRestore);
          }
          
          // Don't remove yet - let auth listener handle cleanup after advancing
          // It will be cleaned up when auth listener advances to payment step
          return true;
        } else {
          console.log('[RequestPage] Not restoring state - already on later step:', currentStepRef.current, 'vs', stepToRestore);
          // Clean up old state since we're already past it
          clearFlowState();
          return false;
        }
      } else if (stepToRestore) {
        clearFlowState();
        return false;
      }
    } catch (e) {
      console.warn('[RequestPage] Failed to restore flow state:', e);
      clearFlowState();
    }
    return false;
  }, []);

  // Check if user needs to authenticate before proceeding to payment
  // Allow users to browse through intro, creator-selection, photo-upload, prompt-answers, consent
  // Only require auth when they try to go to payment

  // Handle URL parameters to pre-populate creator selection
  // Process after auth check is complete (works for both authenticated and unauthenticated users)
  // Only runs once when auth is checked, not on every step change
  const urlParamsProcessed = useRef(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && authChecked && !urlParamsProcessed.current) {
      const urlParams = new URLSearchParams(window.location.search);
      const creatorSlug = urlParams.get('creatorSlug');
      const creatorId = urlParams.get('creatorId');
      const authCode = urlParams.get('authCode');
      
      // Process URL params if we have creator params (coming from app)
      // Don't require currentStep === 'intro' - we want to process these even if step changed
      if (creatorSlug || creatorId) {
        // Check if there's saved state with a different creator
        // If so, clear it to start fresh with the new creator
        try {
          const saved = localStorage.getItem('auro_request_flow_state');
          if (saved) {
            const flowState = JSON.parse(saved);
            const savedCreatorSlug = flowState.requestData?.creatorSlug;
            const savedCreatorId = flowState.requestData?.creatorId;
            
            // Check if the URL creator is different from saved creator
            const isDifferentCreator = 
              (creatorSlug && savedCreatorSlug && creatorSlug !== savedCreatorSlug) ||
              (creatorId && savedCreatorId && creatorId !== savedCreatorId) ||
              (creatorSlug && savedCreatorId && !savedCreatorSlug) ||
              (creatorId && savedCreatorSlug && !savedCreatorId);
            
            if (isDifferentCreator) {
              console.log('[RequestPage] New creator detected in URL, clearing old state. Old:', { savedCreatorSlug, savedCreatorId }, 'New:', { creatorSlug, creatorId });
              clearFlowState();
              // Reset requestData to start fresh
              setRequestData({
                photos: { outfits: [], roomTourPhotos: [], datingProfileScreenshots: [] },
                message: '',
                consent: {
                  shareOnSocial: undefined,
                  agreedAt: ''
                }
              });
              // Reset to intro step to start fresh
              setCurrentStep('intro');
            }
          }
        } catch (e) {
          console.warn('[RequestPage] Failed to check saved state for creator mismatch:', e);
        }
        
        // Try to restore flow state (for OAuth return) - but only if creators match
        // This will now only restore if we didn't clear it above (i.e., creators match)
        const restored = restoreFlowState();
        
        if (!restored) {
          // Only set creator if we didn't restore from saved state
          // Check if creator is already set (might have been set during auth code processing)
          const needsCreator = !requestData.creatorSlug && !requestData.creatorId;
          if (needsCreator) {
            if (creatorSlug) {
              setRequestData(prev => ({ ...prev, creatorSlug }));
            } else if (creatorId) {
              setRequestData(prev => ({ ...prev, creatorId }));
            }
          }
          
          // If we're coming from app (has authCode or creator params), skip to photo-upload
          // Only change step if we're still on intro or creator-selection (don't override if already advanced)
          if (authCode || creatorSlug || creatorId) {
            // Coming from app - skip directly to photo-upload
            // But only if we haven't already advanced past intro/creator-selection
            if (currentStep === 'intro' || currentStep === 'creator-selection') {
              console.log('[RequestPage] Processing creator params from app, advancing to photo-upload');
              setCurrentStep('photo-upload');
            }
          } else if (currentStep === 'intro') {
            // Coming from web directly - go to creator-selection
            setCurrentStep('creator-selection');
          }
        } else {
          // State was restored, but make sure creator is set if we have it in URL
          // (in case restored state didn't have creator)
          if (creatorSlug && !requestData.creatorSlug && !requestData.creatorId) {
            setRequestData(prev => ({ ...prev, creatorSlug }));
          } else if (creatorId && !requestData.creatorId && !requestData.creatorSlug) {
            setRequestData(prev => ({ ...prev, creatorId }));
          }
        }
        urlParamsProcessed.current = true;
          } else if (currentStep === 'intro' && !urlParamsProcessed.current) {
        // No creator params, but we're on intro - this is normal web flow
        urlParamsProcessed.current = true;
      }
    }
  }, [authChecked, currentStep, requestData.creatorSlug, requestData.creatorId, clearFlowState, restoreFlowState]);

  // Scroll to top on step change for better UX
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Use setTimeout to ensure DOM has updated after step change
    const scrollToTop = () => {
      try {
        // Scroll window to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // Also try scrolling the main container if it exists
        const container = document.querySelector('.request-content');
        if (container) {
          (container as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        // Scroll the document body/element as well for better compatibility
        if (document.documentElement) {
          document.documentElement.scrollTop = 0;
        }
        if (document.body) {
          document.body.scrollTop = 0;
        }
      } catch (error) {
        console.warn('Scroll to top failed:', error);
        // Fallback: instant scroll without smooth behavior
        window.scrollTo(0, 0);
      }
    };
    // Small delay to ensure step content has rendered
    const timeoutId = setTimeout(scrollToTop, 100);
    return () => clearTimeout(timeoutId);
  }, [currentStep]);

  useEffect(() => {
    // Initialize Supabase client only on the client side
    // CRITICAL: This should only run once on mount, not on every step change
    if (typeof window !== 'undefined') {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseKey) {
        try {
          // Use the existing supabase client from lib instead of creating a new one
          const client = supabaseClient;
          if (!client) {
            console.error('Supabase client is null - check environment variables');
            setSupabase(null);
            setIsInitializing(false);
            return;
          }
          setSupabase(client);
          // Generate or reuse a local upload session id for temp storage grouping
          try {
            const key = 'auro_upload_session_id';
            let sid = localStorage.getItem(key) || '';
            if (!sid) {
              sid = `sess_${Math.random().toString(36).slice(2)}_${Date.now()}`;
              localStorage.setItem(key, sid);
            }
            setRequestData(prev => ({ ...prev, uploadSessionId: sid }));
          } catch {}

          // Check if user is already authenticated - CRITICAL: Do this FIRST before any rendering
          const checkAuth = async () => {
            try {
              if (!client?.auth) {
                console.error('Supabase client or auth is null');
                setIsAuthenticated(false);
                setAuthChecked(true);
                setIsInitializing(false);
                return;
              }
              
              // Check for auth code from app (for seamless login)
              const urlParams = new URLSearchParams(window.location.search);
              const authCode = urlParams.get('authCode');
              
              if (authCode) {
                try {
                  // Exchange the code for session data
                  const response = await fetch(`/api/auth/app-session?code=${encodeURIComponent(authCode)}`);
                  if (response.ok) {
                    const { accessToken, refreshToken, user: userData } = await response.json();
                    if (accessToken && refreshToken && userData) {
                      // Set the session using both tokens
                      const { data: sessionData, error: sessionError } = await client.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                      });
                      
                      if (!sessionError && sessionData.session) {
                        const isRealUser = !!sessionData.session.user && (sessionData.session.user as any)?.app_metadata?.provider !== 'anon';
                        setIsAuthenticated(isRealUser);
                        
                        console.log('[RequestPage] Session established from app, user:', userData.id);
                        
                        // Process creator params immediately after auth code exchange
                        // This ensures creator is set and we advance to photo-upload even if URL params processing hasn't run yet
                        const creatorSlug = urlParams.get('creatorSlug');
                        const creatorId = urlParams.get('creatorId');
                        
                        if (creatorSlug || creatorId) {
                          console.log('[RequestPage] Processing creator params after auth code exchange');
                          if (creatorSlug) {
                            setRequestData(prev => ({ ...prev, creatorSlug }));
                          } else if (creatorId) {
                            setRequestData(prev => ({ ...prev, creatorId }));
                          }
                          // Advance to photo-upload since user came from app with selected reviewer
                          setCurrentStep('photo-upload');
                        }
                        
                        // Remove authCode from URL to clean it up
                        urlParams.delete('authCode');
                        const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
                        window.history.replaceState({}, '', newUrl);
                      } else {
                        console.warn('[RequestPage] Failed to set session:', sessionError);
                      }
                    }
                  } else {
                    console.warn('[RequestPage] Failed to exchange auth code:', response.status);
                  }
                } catch (error) {
                  console.warn('[RequestPage] Failed to exchange auth code:', error);
                  // Continue with normal auth check
                }
              }
              
              // Check session first (faster than getUser)
              // Retry logic: When coming back from OAuth, session might not be immediately available
              let session = null;
              let isRealUser = false;
              let retries = 0;
              const maxRetries = 3;
              
              while (retries < maxRetries) {
                const { data: { session: currentSession } } = await client.auth.getSession();
                if (currentSession?.user) {
                  session = currentSession;
                  isRealUser = !!session.user && (session.user as any)?.app_metadata?.provider !== 'anon';
                  break;
                }
                // Wait a bit before retrying (session might still be processing from OAuth)
                if (retries < maxRetries - 1) {
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
                retries++;
              }
              
              setIsAuthenticated(isRealUser);
              
              // Check if we should restore from saved state (for OAuth return)
              // IMPORTANT: Always try to restore state if it exists, regardless of auth status
              // The auth listener will handle advancing if needed
              const hasSavedState = typeof window !== 'undefined' && localStorage.getItem('auro_request_flow_state');
              
              if (hasSavedState) {
                // Always restore state if it exists (coming back from OAuth)
                // Note: State may have already been restored during initialization, but we check again
                // to ensure we have the latest requestData
                const restored = restoreFlowState();
                
                // If user is authenticated and we're on 'auth' step (either from init or restore),
                // advance to payment immediately
                if (isRealUser && currentStepRef.current === 'auth') {
                  console.log('[RequestPage] User authenticated and on auth step, advancing to payment');
                  setTimeout(() => {
                    setCurrentStep('payment');
                    try {
                      clearFlowState();
                    } catch {}
                  }, 200);
                } else if (restored && isRealUser) {
                  // User is authenticated and state was restored
                  // If we restored to 'auth' step, immediately advance to payment since user is already authenticated
                  setTimeout(() => {
                    if (currentStepRef.current === 'auth') {
                      console.log('[RequestPage] User authenticated and on auth step after restore, advancing to payment');
                      setCurrentStep('payment');
                      try {
                        clearFlowState();
                      } catch {}
                    }
                  }, 200);
                } else if (!restored && currentStepRef.current === 'intro') {
                  // Failed to restore, set to intro
                  setCurrentStep('intro');
                }
              } else if (!hasSavedState) {
                // No saved state, but if user is authenticated and on 'auth' step, advance to payment
                // This handles the case where state was cleared but user is still authenticated
                if (isRealUser && currentStepRef.current === 'auth') {
                  console.log('[RequestPage] User authenticated on auth step (no saved state), advancing to payment');
                  setTimeout(() => {
                    setCurrentStep('payment');
                  }, 200);
                } else if (currentStepRef.current === 'intro') {
                  // No saved state, just set initial step if needed
                  setCurrentStep('intro');
                }
              }
              
              // If no real user, still allow browsing but sign in anonymously for storage uploads
              try {
                const { data: { user } } = await client.auth.getUser();
                if (!user) {
                  await client.auth.signInAnonymously();
                }
              } catch (anonErr) {
                console.warn('Anonymous sign-in failed:', anonErr);
              }
              
              setAuthChecked(true);
              setIsInitializing(false);
            } catch (error) {
              console.error('Auth check error:', error);
              // On error, still allow browsing - don't reset step if user has progressed
              setIsAuthenticated(false);
              if (currentStepRef.current === 'intro') {
                setCurrentStep('intro');
              }
              setAuthChecked(true);
              setIsInitializing(false);
            }
          };
          
          // Run auth check immediately
          checkAuth();

          // Listen for auth changes
          if (!client?.auth) {
            console.error('Cannot set up auth listener - Supabase client or auth is null');
            return;
          }
          const { data: { subscription } } = client.auth.onAuthStateChange(async (event: any, session: any) => {
            const isRealUser = !!session?.user && (session.user as any)?.app_metadata?.provider !== 'anon';
            setIsAuthenticated(isRealUser);
            
            console.log('[RequestPage] Auth state change:', event, 'isRealUser:', isRealUser, 'currentStep:', currentStepRef.current);
            
            // Only auto-advance if user just completed authentication (not if they were already authenticated)
            // Use ref to get the latest currentStep value
            if (isRealUser && event === 'SIGNED_IN') {
              setRequestData(prev => ({ ...prev, userId: session!.user!.id }));
              
              // Check if we need to restore state (in case auth state change happened before state restoration)
              // This is critical for OAuth flows where session might be established after page load
              const savedState = localStorage.getItem('auro_request_flow_state');
              if (savedState) {
                try {
                  const flowState = JSON.parse(savedState);
                  const age = Date.now() - (flowState.timestamp || 0);
                  if (age <= 30 * 60 * 1000 && flowState.requestData) {
                    console.log('[RequestPage] Restoring state in auth listener:', flowState.currentStep || flowState.step);
                    // Restore the full state including requestData
                    setRequestData(flowState.requestData);
                    const stepToRestore = flowState.currentStep || flowState.step;
                      if (stepToRestore && STEPS.includes(stepToRestore as Step)) {
                      // Restore the step
                      setCurrentStep(stepToRestore);
                      
                      // If we restored to auth step but user is now authenticated, immediately advance to payment
                      if (stepToRestore === 'auth') {
                        console.log('[RequestPage] Restored to auth step but user is authenticated, advancing to payment');
                        setTimeout(() => {
                          setCurrentStep('payment');
                          // Clear saved state since we're advancing
                          try {
                              clearFlowState();
                          } catch {}
                        }, 300);
                        return; // Exit early since we're handling state restoration
                      }
                      } else if (stepToRestore) {
                        clearFlowState();
                    }
                  } else {
                    // State is expired, clean it up
                      clearFlowState();
                  }
                } catch (e) {
                  console.warn('[RequestPage] Failed to restore state in auth listener:', e);
                    clearFlowState();
                }
              }
              
              // If user was on auth step (or just restored to auth step), advance to payment
              // If they were on another step and just authenticated, stay on that step
              // Use setTimeout to ensure we're checking the latest step value
              setTimeout(() => {
                if (currentStepRef.current === 'auth') {
                  console.log('[RequestPage] Advancing from auth to payment after SIGNED_IN');
                  setCurrentStep('payment');
                  // Clear saved state since we're advancing
                  try {
                    clearFlowState();
                  } catch {}
                }
              }, 300);
            }
            
            // Ensure profile exists server-side whenever we get a real session
            if (isRealUser && session?.user) {
              try {
                fetch('/api/auth/ensure-profile', {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({ userId: session.user.id, email: (session.user as any).email || localStorage.getItem('auro_signup_email') || '', fullName: localStorage.getItem('auro_signup_full_name') || undefined })
                });
              } catch {}
            }
          });

          return () => subscription.unsubscribe();
        } catch (error) {
          console.error('Supabase initialization error:', error);
          // Set null to prevent infinite loading and show error
          setSupabase(null);
        } finally {
          setIsInitializing(false);
        }
      } else {
        // Set a dummy client if env vars are missing to prevent infinite loading
        console.warn('Supabase environment variables are missing');
        setSupabase(null);
        setIsInitializing(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const updateRequestData = (updates: Partial<RequestData>) => {
    setRequestData(prev => ({ ...prev, ...updates }));
    // Save state after update
    setTimeout(() => saveFlowState(), 100);
  };

  // Save flow state whenever step or data changes
  useEffect(() => {
    saveFlowState();
  }, [currentStep, requestData, saveFlowState]);

  useEffect(() => {
    if (!authChecked) return;
    if (currentStep === 'payment' && !isAuthenticated) {
      setCurrentStep('auth');
    }
  }, [authChecked, currentStep, isAuthenticated]);

  useEffect(() => {
    if (currentStep === 'download-app') {
      clearFlowState();
    }
  }, [currentStep, clearFlowState]);

  const nextStep = () => {
    const currentIndex = STEPS.indexOf(currentStep);
    if (currentIndex < STEPS.length - 1) {
      const nextStepName = STEPS[currentIndex + 1];
      
      // Require authentication before proceeding to payment step
      if (nextStepName === 'payment' && !isAuthenticated) {
        // Save current state and redirect to auth
        saveFlowState();
        setCurrentStep('auth');
        return;
      }
      
      setCurrentStep(nextStepName);
    }
  };

  const previousStep = useCallback(() => {
    // Use functional update to ensure we're using the latest state
    setCurrentStep(prevStep => {
      const prevIndex = STEPS.indexOf(prevStep);
      if (prevIndex > 0) {
        return STEPS[prevIndex - 1];
      }
      return prevStep;
    });
  }, []);

  const goToStep = (step: Step) => {
    setCurrentStep(step);
  };

  const getStepTitle = (step: Step) => {
    const titles = {
      'intro': 'Welcome',
      'creator-selection': 'Choose Your Reviewer',
      'photo-upload': 'Upload Your Photos',
      'prompt-answers': 'Tell Us About Yourself',
      'consent': 'Review Terms & Consent',
      'auth': 'Create Your Account',
      'payment': 'Complete Payment',
      'download-app': 'Get the App'
    };
    return titles[step];
  };

  const renderStep = () => {
    // Show error only after initialization is complete and Supabase is still null
    if (!isInitializing && supabase === null) {
      return (
        <div className="loading-container">
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <h3 style={{ color: '#ff4444', marginBottom: '16px' }}>⚠️ Configuration Error</h3>
            <p style={{ marginBottom: '16px' }}>
              The application is missing required environment variables for database connection.
            </p>
            <p style={{ fontSize: '14px', color: '#888' }}>
              Please ensure <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON</code> are configured.
            </p>
          </div>
        </div>
      );
    }

    // CRITICAL: Don't render ANY steps until auth is checked
    // This prevents unauthenticated users from seeing intro or other steps
    if (!authChecked || isInitializing) {
      return (
        <div className="loading-container">
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="loading-spinner" style={{ margin: '0 auto 20px' }}></div>
            <p style={{ color: '#fff', fontSize: '16px' }}>Loading...</p>
          </div>
        </div>
      );
    }

    // Guard: Prevent rendering payment step without authentication
    // This avoids state mutation during render issues
    if (currentStep === 'payment' && !isAuthenticated) {
      // Return null - useEffect will handle redirect to auth
      return null;
    }

    switch (currentStep) {
      case 'intro':
        return (
          <IntroStep
            onNext={nextStep}
          />
        );
      case 'creator-selection':
        return (
          <CreatorSelection
            selectedCreator={requestData.creatorId || requestData.creatorSlug}
            onSelect={(creatorId, creatorSlug) => {
              // Check if this is a different creator from what's currently saved
              const isDifferentCreator = 
                (creatorId && requestData.creatorId && creatorId !== requestData.creatorId) ||
                (creatorSlug && requestData.creatorSlug && creatorSlug !== requestData.creatorSlug) ||
                (creatorId && !requestData.creatorId && requestData.creatorSlug) ||
                (creatorSlug && !requestData.creatorSlug && requestData.creatorId);
              
              if (isDifferentCreator) {
                console.log('[RequestPage] Different creator selected, clearing old form data. Old:', { creatorId: requestData.creatorId, creatorSlug: requestData.creatorSlug }, 'New:', { creatorId, creatorSlug });
                // Clear old state and reset form data
                clearFlowState();
                // Update with new creator and reset form fields
                setRequestData({
                  creatorId,
                  creatorSlug,
                  photos: { outfits: [], roomTourPhotos: [], datingProfileScreenshots: [] },
                  message: '',
                  consent: {
                    shareOnSocial: undefined,
                    agreedAt: ''
                  },
                  uploadSessionId: requestData.uploadSessionId, // Keep upload session
                });
              } else {
                // Same creator, just update the creator info
                updateRequestData({ creatorId, creatorSlug });
              }
              nextStep();
            }}
            supabase={supabase}
            preselectedCreatorSlug={requestData.creatorSlug}
            preselectedCreatorId={requestData.creatorId}
            isInitializing={isInitializing}
          />
        );
      case 'photo-upload':
        return (
          <PhotoUpload
            photos={requestData.photos}
            onPhotosChange={(photos) => {
              updateRequestData({ photos });
            }}
            onNext={nextStep}
            onBack={previousStep}
            supabase={supabase}
            uploadSessionId={requestData.uploadSessionId}
          />
        );
      case 'prompt-answers':
        return (
          <PromptAnswers
            message={requestData.message}
            onMessageChange={(message) => updateRequestData({ message })}
            onNext={nextStep}
            onBack={previousStep}
            creatorId={requestData.creatorId}
            creatorSlug={requestData.creatorSlug}
            supabase={supabase}
          />
        );
      case 'consent':
        return (
          <ConsentForm
            consent={requestData.consent}
            onConsentChange={(consent) => updateRequestData({ consent })}
            onNext={nextStep}
            onBack={previousStep}
          />
        );
      case 'auth':
        return (
          <AuthStep
            isAuthenticated={isAuthenticated}
            onNext={nextStep}
            onBack={previousStep}
            supabase={supabase}
            requestData={requestData}
            onSaveState={saveFlowState}
          />
        );
      case 'payment':
        return (
          <PaymentStep
            requestData={requestData}
            onSuccess={(requestId) => {
              updateRequestData({ requestId });
              clearFlowState();
              nextStep();
            }}
            onBack={previousStep}
            supabase={supabase}
          />
        );
      case 'download-app':
        return (
          <DownloadApp
            requestId={requestData.requestId}
            onBack={previousStep}
          />
        );
    }
  };

  // Modern Stepper Component
  const Stepper = () => {
    const stepConfigs = [
      { id: 'intro', label: 'Intro', icon: '🎯' },
      { id: 'creator-selection', label: 'Reviewer', icon: '👤' },
      { id: 'photo-upload', label: 'Photos', icon: '📸' },
      { id: 'prompt-answers', label: 'Details', icon: '✍️' },
      { id: 'consent', label: 'Terms', icon: '📋' },
      { id: 'auth', label: 'Account', icon: '🔐' },
      { id: 'payment', label: 'Payment', icon: '💳' },
      { id: 'download-app', label: 'Done', icon: '✅' }
    ];

    const currentIndex = STEPS.indexOf(currentStep);

    return (
      <div className="w-full px-2 py-3 md:px-4 md:py-6 bg-gradient-to-b from-background/50 to-transparent">
        <div className="flex items-center justify-between relative max-w-6xl mx-auto">
          {/* Progress line */}
          <div className="absolute top-4 md:top-6 left-0 right-0 h-0.5 bg-white/10">
            <div 
              className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 ease-out shadow-sm shadow-primary/50"
              style={{ width: `${(currentIndex / (stepConfigs.length - 1)) * 100}%` }}
            />
          </div>
          
          {stepConfigs.map((stepItem, idx) => {
            const isCompleted = currentIndex > idx;
            const isCurrent = currentIndex === idx;
            const isClickable = currentIndex > idx;
            
            return (
              <div
                key={stepItem.id}
                className="flex flex-col items-center relative z-10 flex-1"
                onClick={isClickable ? () => goToStep(stepItem.id as Step) : undefined}
                style={{ cursor: isClickable ? 'pointer' : 'default' }}
              >
                <div
                  className={`
                    w-7 h-7 md:w-12 md:h-12 rounded-full flex items-center justify-center text-xs md:text-base font-semibold
                    transition-all duration-300 ease-out
                    ${isCompleted 
                      ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30' 
                      : isCurrent 
                        ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-xl shadow-primary/50 scale-110' 
                        : 'bg-white/10 border border-white/20 text-gray-400'
                    }
                  `}
                >
                  {isCompleted ? '✓' : stepItem.icon}
                </div>
                <span className={`
                  mt-1 md:mt-2 text-[10px] md:text-xs font-medium text-center px-0.5
                  hidden sm:block
                  ${isCurrent ? 'text-primary font-bold' : isCompleted ? 'text-white' : 'text-gray-500'}
                `}>
                  {stepItem.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Selected Reviewer Indicator Component
  const SelectedReviewerIndicator = () => {
    const [reviewerInfo, setReviewerInfo] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      // Only show on photo-upload step and if we have a creator selected
      if (currentStep !== 'photo-upload' || (!requestData.creatorId && !requestData.creatorSlug)) {
        setReviewerInfo(null);
        return;
      }

      const fetchReviewerInfo = async () => {
        if (!supabase) return;
        
        setLoading(true);
        try {
          let query = supabase
            .from('profiles')
            .select('id, first_name, last_name, username, avatar_url')
            .eq('is_reviewer', 'approved');

          if (requestData.creatorId) {
            query = query.eq('id', requestData.creatorId);
          } else if (requestData.creatorSlug) {
            query = query.eq('username', requestData.creatorSlug);
          }

          const { data, error } = await query.maybeSingle();

          if (error) throw error;

          if (data) {
            const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ') || data.username || 'Reviewer';
            setReviewerInfo({
              ...data,
              full_name: fullName
            });
          }
        } catch (error) {
          console.error('Error fetching reviewer info:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchReviewerInfo();
    }, [currentStep, requestData.creatorId, requestData.creatorSlug, supabase]);

    // Only render on photo-upload step and if we have reviewer info
    if (currentStep !== 'photo-upload' || !reviewerInfo) {
      return null;
    }

    return (
      <div className="w-full px-4 py-3 bg-gradient-to-r from-background/80 to-card/80 border-b border-white/10">
        <div className="max-w-6xl mx-auto flex items-center justify-center gap-3">
          <div className="flex items-center gap-3 bg-white/5 rounded-full px-4 py-2.5 border border-white/10 shadow-lg shadow-green-500/10">
            <div className="relative">
              <AsyncAvatar 
                avatarPathOrUrl={reviewerInfo.avatar_url} 
                alt={reviewerInfo.full_name}
                size={32}
              />
              <div className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-green-500 text-white text-[10px] font-bold border-2 border-background shadow-sm">
                ✓
              </div>
            </div>
            <span className="text-white font-medium text-sm md:text-base">
              Reviewing with <span className="font-semibold text-green-400">{reviewerInfo.full_name}</span>
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background text-white">
      <div className="w-full">
        <Stepper />
        <SelectedReviewerIndicator />
      </div>

      <div className="request-content px-4 max-w-6xl mx-auto">
        {renderStep()}
      </div>
    </div>
  );
}
