'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
      
      if (flowState.currentStep && flowState.requestData) {
        setCurrentStep(flowState.currentStep);
        setRequestData(flowState.requestData);
        console.log('[RequestPage] Restored flow state:', flowState.currentStep);
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

  // Handle URL parameters to pre-populate creator selection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const creatorSlug = urlParams.get('creatorSlug');
      
      // Try to restore flow state first (for OAuth return)
      const restored = restoreFlowState();
      
      if (creatorSlug && !restored) {
        // Only set creator slug if we didn't restore from saved state
        setRequestData(prev => ({ ...prev, creatorSlug }));
        setCurrentStep('creator-selection');
      }
    }
  }, []);

  // Scroll to top on step change for better UX
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const container = document.querySelector('.request-content');
      if (container && 'scrollIntoView' in container) {
        (container as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (error) {
      console.warn('Scroll to top failed:', error);
    }
  }, [currentStep]);

  useEffect(() => {
    // Initialize Supabase client only on the client side
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

          // Check if user is already authenticated
          const checkAuth = async () => {
            try {
              if (!client?.auth) {
                console.error('Supabase client or auth is null');
                setIsAuthenticated(false);
                return;
              }
              const { data: { user } } = await client.auth.getUser();
              
              
              if (!user) {
                try {
                  // Ensure an authenticated session for storage uploads
                  await client.auth.signInAnonymously();
                } catch (anonErr) {
                  console.warn('Anonymous sign-in failed:', anonErr);
                }
              }
              const { data: { user: userAfter } } = await client.auth.getUser();
              const isRealUser = !!userAfter && (userAfter as any)?.app_metadata?.provider !== 'anon';
              
              setIsAuthenticated(isRealUser);
            } catch (error) {
              console.error('Auth check error:', error);
            }
          };
          checkAuth();

          // Listen for auth changes
          if (!client?.auth) {
            console.error('Cannot set up auth listener - Supabase client or auth is null');
            return;
          }
          const { data: { subscription } } = client.auth.onAuthStateChange((event: any, session: any) => {
            const isRealUser = !!session?.user && (session.user as any)?.app_metadata?.provider !== 'anon';
            setIsAuthenticated(isRealUser);
            
            // Only auto-advance if user just completed authentication (not if they were already authenticated)
            // Use ref to get the latest currentStep value
            if (isRealUser && currentStepRef.current === 'auth' && event === 'SIGNED_IN') {
              setRequestData(prev => ({ ...prev, userId: session!.user!.id }));
              setCurrentStep('payment');
              // Clear saved state since we're advancing
              try {
                localStorage.removeItem('auro_request_flow_state');
              } catch {}
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
  }, [currentStep]);

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
      setCurrentStep(STEPS[currentIndex + 1]);
    }
  };

  const previousStep = () => {
    const currentIndex = STEPS.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1]);
    }
  };

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

    // Show loading only for steps that don't have their own loading states
    // Skip showing loading for creator-selection since it has its own loading state
    if (isInitializing && currentStep !== 'creator-selection') {
      return (
        <div className="loading-container">
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="loading-spinner" style={{ margin: '0 auto 20px' }}></div>
            <p style={{ color: '#fff', fontSize: '16px' }}>Initializing...</p>
          </div>
        </div>
      );
    }

    // Render the actual step content

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
