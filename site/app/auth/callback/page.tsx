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
        
        // Wait for Supabase to process the OAuth callback
        // The session should be automatically extracted from URL params
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get the session after OAuth processing
        if (!supabase?.auth) {
          console.error('[AuthCallback] Supabase client or auth is null');
          setStatus('error');
          setMessage('Authentication service is not available. Please refresh the page.');
          return;
        }
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
          setTimeout(() => {
            router.push(redirectTo);
          }, 1500);
        } else {
          console.error('[AuthCallback] No session found after authentication');
          throw new Error('No session found after authentication');
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
