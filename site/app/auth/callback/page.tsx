'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('[AuthCallback] Starting OAuth callback handling...');
        
        // Check if we're in a mobile app browser (Expo Go, React Native WebView, etc.)
        const isMobileAppBrowser = 
          typeof window !== 'undefined' && (
            window.navigator.userAgent.includes('Expo') ||
            window.navigator.userAgent.includes('ReactNative') ||
            window.navigator.userAgent.includes('wv') || // Android WebView
            (window as any).ReactNativeWebView !== undefined
          );
        
        console.log('[AuthCallback] Is mobile app browser:', isMobileAppBrowser);
        console.log('[AuthCallback] User agent:', typeof window !== 'undefined' ? window.navigator.userAgent : 'N/A');
        
        // If in mobile app browser, try to extract code and deep link back
        if (isMobileAppBrowser) {
          const code = searchParams.get('code');
          const error = searchParams.get('error');
          const errorDescription = searchParams.get('error_description');
          
          console.log('[AuthCallback] Mobile browser detected, code:', code ? 'Found' : 'Not found');
          
          if (error) {
            console.error('[AuthCallback] OAuth error:', error, errorDescription);
            setStatus('error');
            setMessage(errorDescription || error);
            
            // Try to deep link back to app with error
            try {
              window.location.href = `auro://auth/callback?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || '')}`;
            } catch (e) {
              console.error('[AuthCallback] Failed to deep link:', e);
            }
            return;
          }
          
          if (code) {
            console.log('[AuthCallback] Code found, attempting to deep link back to app...');
            setStatus('success');
            setMessage('Sign-in successful! Returning to app...');
            
            // Immediately try to deep link back to the app with the code
            // The app will extract the code and exchange it for a session
            try {
              // Use the app's deep link scheme - this should close the browser and open the app
              const deepLinkUrl = `auro://auth/callback?code=${encodeURIComponent(code)}`;
              console.log('[AuthCallback] Deep linking to:', deepLinkUrl);
              
              // Try multiple methods to ensure the deep link works
              window.location.href = deepLinkUrl;
              
              // Also try using window.open as a fallback
              setTimeout(() => {
                try {
                  window.open(deepLinkUrl, '_self');
                } catch (e) {
                  console.error('[AuthCallback] window.open failed:', e);
                }
              }, 100);
              
              // Try to close the browser if it's a WebView
              setTimeout(() => {
                try {
                  if ((window as any).ReactNativeWebView) {
                    (window as any).ReactNativeWebView.postMessage(JSON.stringify({ type: 'CLOSE' }));
                  }
                } catch (e) {
                  // Ignore errors
                }
              }, 500);
            } catch (e) {
              console.error('[AuthCallback] Failed to deep link:', e);
              setStatus('error');
              setMessage('Failed to return to app. Please close this browser and return to the app manually.');
            }
            return;
          }
          
          // No code yet, wait for Supabase to process it
          console.log('[AuthCallback] No code in URL yet, waiting for Supabase to process...');
        }
        
        if (!supabase?.auth) {
          console.error('[AuthCallback] Supabase client or auth is null');
          setStatus('error');
          setMessage('Authentication service is not available. Please refresh the page.');
          return;
        }
        
        // Wait a moment for Supabase to process the OAuth callback
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Try to get the session - Supabase should have processed the OAuth callback
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[AuthCallback] Session error:', error);
          throw error;
        }

        if (data.session) {
          console.log('[AuthCallback] Session found, user:', data.session.user.id);
          setStatus('success');
          setMessage('Successfully signed in!');
          
          // Store user info for profile creation
          try {
            const user = data.session.user;
            if (user) {
              localStorage.setItem('auro_signup_user_id', user.id);
              localStorage.setItem('auro_signup_email', user.email || '');
              
              // Extract name from Google OAuth metadata
              const metadata = user.user_metadata;
              if (metadata) {
                const fullName = metadata.full_name || metadata.name || '';
                const firstName = metadata.given_name || '';
                const lastName = metadata.family_name || '';
                
                if (fullName) localStorage.setItem('auro_signup_full_name', fullName);
                if (firstName) localStorage.setItem('auro_signup_first_name', firstName);
                if (lastName) localStorage.setItem('auro_signup_last_name', lastName);
              }
              
              // Ensure profile exists
              await fetch('/api/auth/ensure-profile', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ 
                  userId: user.id, 
                  email: user.email,
                  fullName: user.user_metadata?.full_name || user.user_metadata?.name
                })
              });
            }
          } catch (e) {
            console.error('[AuthCallback] Failed to store user info:', e);
          }
          
          // Redirect to the intended destination or default page
          const redirectTo = searchParams.get('redirect_to') || '/request';
          console.log('[AuthCallback] Redirecting to:', redirectTo);
          
          // Give time for session to be properly established
          setTimeout(() => {
            router.push(redirectTo);
          }, 1000);
        } else {
          // No session yet - set up auth state listener to wait for it
          console.log('[AuthCallback] No session yet, setting up auth listener...');
          
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
            console.log('[AuthCallback] Auth state change:', event, !!session);
            
            if (event === 'SIGNED_IN' && session) {
              console.log('[AuthCallback] Session established via listener, user:', session.user.id);
              subscription.unsubscribe();
              
              setStatus('success');
              setMessage('Successfully signed in!');
              
              // Store user info
              try {
                const user = session.user;
                localStorage.setItem('auro_signup_user_id', user.id);
                localStorage.setItem('auro_signup_email', user.email || '');
                
                const metadata = user.user_metadata;
                if (metadata) {
                  const fullName = metadata.full_name || metadata.name || '';
                  if (fullName) localStorage.setItem('auro_signup_full_name', fullName);
                }
              } catch (e) {
                console.error('[AuthCallback] Failed to store user info:', e);
              }
              
              const redirectTo = searchParams.get('redirect_to') || '/request';
              setTimeout(() => {
                router.push(redirectTo);
              }, 1000);
            }
          });
          
          // Timeout after 5 seconds if no session arrives
          setTimeout(() => {
            subscription.unsubscribe();
            if (status === 'loading') {
              console.error('[AuthCallback] Timeout waiting for session');
              setStatus('error');
              setMessage('Authentication timed out. Please try again.');
              setTimeout(() => {
                router.push('/request');
              }, 3000);
            }
          }, 5000);
        }
      } catch (error: any) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setMessage(error.message || 'Authentication failed');
        
        // Redirect to request page after showing error
        setTimeout(() => {
          router.push('/request');
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [router, searchParams]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      padding: '20px',
      textAlign: 'center'
    }}>
      {status === 'loading' && (
        <>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '20px'
          }}></div>
          <h2>Completing sign-in...</h2>
          <p>Please wait while we complete your authentication.</p>
        </>
      )}
      
      {status === 'success' && (
        <>
          <div style={{ 
            width: '60px', 
            height: '60px', 
            borderRadius: '50%',
            backgroundColor: '#4CAF50',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            fontSize: '30px',
            color: 'white'
          }}>
            ✓
          </div>
          <h2 style={{ color: '#4CAF50' }}>Success!</h2>
          <p>{message}</p>
          <p style={{ fontSize: '14px', color: '#666' }}>Redirecting you back to the app...</p>
        </>
      )}
      
      {status === 'error' && (
        <>
          <div style={{ 
            width: '60px', 
            height: '60px', 
            borderRadius: '50%',
            backgroundColor: '#f44336',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            fontSize: '30px',
            color: 'white'
          }}>
            ✗
          </div>
          <h2 style={{ color: '#f44336' }}>Authentication Failed</h2>
          <p>{message}</p>
          <p style={{ fontSize: '14px', color: '#666' }}>Redirecting you back to try again...</p>
        </>
      )}
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      padding: '20px',
      textAlign: 'center'
    }}>
      <div style={{ 
        width: '40px', 
        height: '40px', 
        border: '4px solid #f3f3f3',
        borderTop: '4px solid #3498db',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: '20px'
      }}></div>
      <h2>Loading...</h2>
      <p>Please wait while we complete your authentication.</p>
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
