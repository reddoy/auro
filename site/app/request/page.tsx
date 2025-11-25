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

export type RequestData = {
  creatorId?: string;
  creatorSlug?: string;
  photos: { outfits: string[]; roomTourPhotos: string[]; datingProfileScreenshots: string[] };
  message: string;
  consent: {
    shareOnSocial: boolean;
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
  // Start with 'intro' step - users can browse the flow without auth, auth required only for payment
  const [currentStep, setCurrentStep] = useState<Step>('intro');
  const [requestData, setRequestData] = useState<RequestData>({
    photos: { outfits: [], roomTourPhotos: [], datingProfileScreenshots: [] },
    message: '',
    consent: {
      shareOnSocial: false,
      agreedAt: ''
    }
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [supabase, setSupabase] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  // Check if Supabase client is properly configured
  if (!supabaseClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
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
        localStorage.removeItem('auro_request_flow_state');
        return false;
      }
      
      // Support both 'step' (old format) and 'currentStep' (new format) for backward compatibility
      const stepToRestore = flowState.currentStep || flowState.step;
      
      if (stepToRestore) {
        // Restore the step
        setCurrentStep(stepToRestore);
        
        // Restore requestData if available (should always be present in new saves)
        if (flowState.requestData) {
          setRequestData(flowState.requestData);
          console.log('[RequestPage] Restored flow state with data:', stepToRestore);
        } else {
          console.log('[RequestPage] Restored flow state (step only):', stepToRestore);
        }
        
        // Don't remove yet - let auth listener handle cleanup after advancing
        // It will be cleaned up when auth listener advances to payment step
        return true;
      }
    } catch (e) {
      console.warn('[RequestPage] Failed to restore flow state:', e);
      localStorage.removeItem('auro_request_flow_state');
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
    if (typeof window !== 'undefined' && authChecked && currentStep === 'intro' && !urlParamsProcessed.current) {
      const urlParams = new URLSearchParams(window.location.search);
      const creatorSlug = urlParams.get('creatorSlug');
      const creatorId = urlParams.get('creatorId');
      
      // Process URL params only if we're still on intro step and haven't processed them yet
      // Don't override if user has already progressed through the flow
      if (creatorSlug || creatorId) {
        // Try to restore flow state first (for OAuth return)
        const restored = restoreFlowState();
        
        if (!restored) {
          // Only set creator if we didn't restore from saved state
          if (creatorSlug) {
            setRequestData(prev => ({ ...prev, creatorSlug }));
          } else if (creatorId) {
            setRequestData(prev => ({ ...prev, creatorId }));
          }
          // Skip creator-selection step and go directly to photo-upload when coming from app
          // This provides a smoother experience when user has already selected a reviewer in the app
          setCurrentStep('photo-upload');
        }
        urlParamsProcessed.current = true;
      }
    }
  }, [authChecked, currentStep]);

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
              // IMPORTANT: Restore state AFTER checking auth, so we know if user is authenticated
              // But don't restore if user is authenticated and we're coming back from OAuth
              // (let the auth listener handle it to avoid race conditions)
              const hasSavedState = typeof window !== 'undefined' && localStorage.getItem('auro_request_flow_state');
              
              if (!isRealUser && hasSavedState) {
                // User not authenticated yet, but we have saved state - restore it
                // The auth listener will handle advancing when session is established
                const restored = restoreFlowState();
                if (!restored && currentStepRef.current === 'intro') {
                  setCurrentStep('intro');
                }
              } else if (isRealUser && hasSavedState) {
                // User is authenticated and we have saved state - restore and check if we need to advance
                const restored = restoreFlowState();
                if (restored && currentStepRef.current === 'auth') {
                  // User was on auth step and is now authenticated, advance to payment
                  setCurrentStep('payment');
                  try {
                    localStorage.removeItem('auro_request_flow_state');
                  } catch {}
                }
              } else if (!hasSavedState) {
                // No saved state, just set initial step if needed
                if (currentStepRef.current === 'intro') {
                  setCurrentStep('intro');
                }
              }
              
              // If no real user, still allow browsing but sign in anonymously for storage uploads
              if (!isRealUser) {
                try {
                  await client.auth.signInAnonymously();
                } catch (anonErr) {
                  console.warn('Anonymous sign-in failed:', anonErr);
                }
              }
              
              // Now sign in anonymously for storage uploads (only if needed)
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
                    if (stepToRestore) {
                      // Use setTimeout to ensure state updates are processed
                      setTimeout(() => {
                        setCurrentStep(stepToRestore);
                        // If we restored to auth step but user is now authenticated, advance to payment
                        if (stepToRestore === 'auth') {
                          setTimeout(() => {
                            setCurrentStep('payment');
                            // Clear saved state since we're advancing
                            try {
                              localStorage.removeItem('auro_request_flow_state');
                            } catch {}
                          }, 100);
                        }
                      }, 100);
                      return; // Exit early since we're handling state restoration
                    }
                  } else {
                    // State is expired, clean it up
                    localStorage.removeItem('auro_request_flow_state');
                  }
                } catch (e) {
                  console.warn('[RequestPage] Failed to restore state in auth listener:', e);
                  localStorage.removeItem('auro_request_flow_state');
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
                    localStorage.removeItem('auro_request_flow_state');
                  } catch {}
                }
              }, 200);
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

    // Render the actual step content
    // Only require auth for payment step - allow browsing other steps
    if (currentStep === 'payment' && !isAuthenticated) {
      // If somehow they got to payment without auth, redirect to auth
      setCurrentStep('auth');
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
              updateRequestData({ creatorId, creatorSlug });
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
      <div className="w-full px-2 py-3 md:px-4 md:py-6 bg-gradient-to-b from-[#0c0325]/50 to-transparent">
        <div className="flex items-center justify-between relative max-w-6xl mx-auto">
          {/* Progress line */}
          <div className="absolute top-4 md:top-6 left-0 right-0 h-0.5 bg-white/10">
            <div 
              className="h-full bg-gradient-to-r from-orange-500 to-purple-600 transition-all duration-500 ease-out shadow-sm shadow-orange-500/50"
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
                      ? 'bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow-lg shadow-orange-500/30' 
                      : isCurrent 
                        ? 'bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow-xl shadow-orange-500/50 scale-110' 
                        : 'bg-white/10 border border-white/20 text-gray-400'
                    }
                  `}
                >
                  {isCompleted ? '✓' : stepItem.icon}
                </div>
                <span className={`
                  mt-1 md:mt-2 text-[10px] md:text-xs font-medium text-center px-0.5
                  hidden sm:block
                  ${isCurrent ? 'text-orange-400 font-bold' : isCompleted ? 'text-white' : 'text-gray-500'}
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c0325] via-[#1a0b3d] to-[#0c0325] text-white">
      <div className="w-full">
        <Stepper />
      </div>

      <div className="request-content px-4 max-w-6xl mx-auto">
        {renderStep()}
      </div>
    </div>
  );
}
