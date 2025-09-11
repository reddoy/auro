'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Step components
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
  selfieUrl?: string | null;
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
  const [currentStep, setCurrentStep] = useState<Step>('creator-selection');
  const [requestData, setRequestData] = useState<RequestData>({
    photos: { outfits: [], roomTourPhotos: [], datingProfileScreenshots: [] },
    selfieUrl: null,
    message: '',
    consent: {
      shareOnSocial: false,
      agreedAt: ''
    }
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [supabase, setSupabase] = useState<any>(null);

  useEffect(() => {
    // Initialize Supabase client only on the client side
    if (typeof window !== 'undefined') {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON;
      
      if (supabaseUrl && supabaseKey) {
        try {
          const client = createClient(supabaseUrl, supabaseKey);
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
          const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
            const isRealUser = !!session?.user && (session.user as any)?.app_metadata?.provider !== 'anon';
            setIsAuthenticated(isRealUser);
            if (isRealUser && currentStep === 'auth') {
              setRequestData(prev => ({ ...prev, userId: session!.user!.id }));
              setCurrentStep('payment');
            }
            // Ensure profile exists server-side whenever we get a real session
            if (isRealUser && session?.user) {
              try {
                fetch('/api/auth/ensure-profile', {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({ userId: session.user.id, email: (session.user as any).email || '' })
                });
              } catch {}
            }
          });

          return () => subscription.unsubscribe();
        } catch (error) {
          console.error('Supabase initialization error:', error);
          // Set null to prevent infinite loading and show error
          setSupabase(null);
        }
      } else {
        // Set a dummy client if env vars are missing to prevent infinite loading
        console.warn('Supabase environment variables are missing');
        setSupabase(null);
      }
    }
  }, [currentStep]);

  const updateRequestData = (updates: Partial<RequestData>) => {
    setRequestData(prev => ({ ...prev, ...updates }));
  };

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
    // Show loading until Supabase is initialized
    if (supabase === null) {
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

    if (!supabase) {
      return (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      );
    }

    switch (currentStep) {
      case 'creator-selection':
        return (
          <CreatorSelection
            selectedCreator={requestData.creatorId || requestData.creatorSlug}
            onSelect={(creatorId, creatorSlug) => {
              updateRequestData({ creatorId, creatorSlug });
              nextStep();
            }}
            supabase={supabase}
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
            onSelfieChange={(url) => updateRequestData({ selfieUrl: url || null })}
            selfieUrl={requestData.selfieUrl || null}
          />
        );
      case 'prompt-answers':
        return (
          <PromptAnswers
            message={requestData.message}
            onMessageChange={(message) => updateRequestData({ message })}
            onNext={nextStep}
            onBack={previousStep}
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

  return (
    <div className="request-page">
      <div className="container">
        <div className="request-header">
          <h1>Request a Review</h1>
          <div className="progress-bar">
            {STEPS.map((step, index) => (
              <div
                key={step}
                className={`progress-step ${
                  STEPS.indexOf(currentStep) >= index ? 'active' : ''
                } ${STEPS.indexOf(currentStep) === index ? 'current' : ''}`}
                onClick={() => {
                  // Allow going back to previous steps
                  if (STEPS.indexOf(currentStep) > index) {
                    goToStep(step);
                  }
                }}
              >
                <div className="step-number">{index + 1}</div>
                <div className="step-title">{getStepTitle(step)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="request-content">
          {renderStep()}
        </div>
      </div>
    </div>
  );
}
