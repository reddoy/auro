import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';

// Step components (we'll create these)
import IntroStep from './components/IntroStep';
import CreatorSelectionStep from './components/CreatorSelectionStep';
import PhotoUploadStep from './components/PhotoUploadStep';
import PromptAnswersStep from './components/PromptAnswersStep';
import ConsentStep from './components/ConsentStep';
import PaymentStep from './components/PaymentStep';
import SuccessStep from './components/SuccessStep';

export type RequestData = {
  creatorId?: string;
  creatorSlug?: string;
  photos: {
    outfits: string[];
    roomTourPhotos: string[];
    datingProfileScreenshots: string[];
  };
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
  'payment',
  'success',
] as const;

type Step = typeof STEPS[number];

const STORAGE_KEY = 'auro_request_flow_state';

export default function RequestFlowScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ creatorId?: string; creatorSlug?: string }>();
  const insets = useSafeAreaInsets();
  
  const [currentStep, setCurrentStep] = useState<Step>('intro');
  const [requestData, setRequestData] = useState<RequestData>({
    photos: { outfits: [], roomTourPhotos: [], datingProfileScreenshots: [] },
    message: '',
    consent: {
      shareOnSocial: undefined,
      agreedAt: '',
    },
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Load saved state on mount
  useEffect(() => {
    const loadSavedState = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const flowState = JSON.parse(saved);
          const age = Date.now() - (flowState.timestamp || 0);
          // Only use saved state if it's recent (within 30 minutes)
          if (age <= 30 * 60 * 1000) {
            if (flowState.currentStep && STEPS.includes(flowState.currentStep as Step)) {
              setCurrentStep(flowState.currentStep as Step);
            }
            if (flowState.requestData) {
              setRequestData(flowState.requestData);
            }
          }
        }
      } catch (e) {
        console.warn('[RequestFlow] Failed to load saved state:', e);
      }
    };
    loadSavedState();
  }, []);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
      } catch (e) {
        setIsAuthenticated(false);
      } finally {
        setAuthChecked(true);
      }
    };
    checkAuth();
  }, []);

  // Handle preselected creator from params
  useEffect(() => {
    if (params.creatorId || params.creatorSlug) {
      setRequestData(prev => ({
        ...prev,
        creatorId: params.creatorId,
        creatorSlug: params.creatorSlug,
      }));
      // Skip intro if creator is preselected
      if (currentStep === 'intro') {
        setCurrentStep('creator-selection');
      }
    }
  }, [params.creatorId, params.creatorSlug]);

  // Save state to AsyncStorage
  const saveFlowState = useCallback(async () => {
    try {
      const flowState = {
        currentStep,
        requestData,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(flowState));
    } catch (e) {
      console.warn('[RequestFlow] Failed to save state:', e);
    }
  }, [currentStep, requestData]);

  // Update request data
  const updateRequestData = useCallback((updates: Partial<RequestData>) => {
    setRequestData(prev => ({ ...prev, ...updates }));
  }, []);

  // Navigation functions
  const nextStep = useCallback(() => {
    const currentIndex = STEPS.indexOf(currentStep);
    if (currentIndex < STEPS.length - 1) {
      const nextStepName = STEPS[currentIndex + 1];
      
      // Require authentication before payment
      if (nextStepName === 'payment' && !isAuthenticated) {
        // Redirect to auth, then come back
        router.push('/auth');
        return;
      }
      
      setCurrentStep(nextStepName);
    }
  }, [currentStep, isAuthenticated, router]);

  const previousStep = useCallback(() => {
    const currentIndex = STEPS.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1]);
    }
  }, [currentStep]);

  const goToStep = useCallback((step: Step) => {
    setCurrentStep(step);
  }, []);

  // Save state whenever it changes
  useEffect(() => {
    saveFlowState();
  }, [currentStep, requestData, saveFlowState]);

  // Clear state on success
  const handleSuccess = useCallback((requestId: string) => {
    AsyncStorage.removeItem(STORAGE_KEY);
    updateRequestData({ requestId });
    setCurrentStep('success');
  }, [updateRequestData]);

  const renderStep = () => {
    switch (currentStep) {
      case 'intro':
        return <IntroStep onNext={nextStep} />;
      
      case 'creator-selection':
        return (
          <CreatorSelectionStep
            requestData={requestData}
            onSelect={(creatorId, creatorSlug) => {
              updateRequestData({ creatorId, creatorSlug });
              nextStep();
            }}
            onBack={previousStep}
            supabase={supabase}
          />
        );
      
      case 'photo-upload':
        return (
          <PhotoUploadStep
            requestData={requestData}
            onPhotosChange={(photos) => updateRequestData({ photos })}
            onNext={nextStep}
            onBack={previousStep}
            supabase={supabase}
          />
        );
      
      case 'prompt-answers':
        return (
          <PromptAnswersStep
            requestData={requestData}
            onMessageChange={(message) => updateRequestData({ message })}
            onNext={nextStep}
            onBack={previousStep}
            supabase={supabase}
          />
        );
      
      case 'consent':
        return (
          <ConsentStep
            requestData={requestData}
            onConsentChange={(consent) => updateRequestData({ consent })}
            onNext={nextStep}
            onBack={previousStep}
          />
        );
      
      case 'payment':
        return (
          <PaymentStep
            requestData={requestData}
            onSuccess={handleSuccess}
            onBack={previousStep}
            supabase={supabase}
          />
        );
      
      case 'success':
        return (
          <SuccessStep
            requestId={requestData.requestId}
            onBack={() => router.replace('/(tabs)/requests')}
          />
        );
      
      default:
        return null;
    }
  };

  if (!authChecked) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderStep()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.brand.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
});
