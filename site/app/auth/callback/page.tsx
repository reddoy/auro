'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON;
        
        if (!supabaseUrl || !supabaseKey) {
          throw new Error('Supabase configuration missing');
        }

        const supabase = createClient(supabaseUrl, supabaseKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        });

        // Handle the OAuth callback
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }

        if (data.session) {
          setStatus('success');
          setMessage('Successfully signed in!');
          
          // Redirect to the intended destination or default page
          const redirectTo = searchParams.get('redirect_to') || '/request';
          setTimeout(() => {
            router.push(redirectTo);
          }, 1500);
        } else {
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
