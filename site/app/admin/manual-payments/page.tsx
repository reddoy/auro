'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function ManualPaymentsAdminPage() {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

      // Check if user is admin
      const authResponse = await fetch('/api/admin/check-access', {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (!authResponse.ok) {
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

      setIsAuthorized(true);
    } catch (err: any) {
      console.error('Auth check error:', err);
      setIsAuthorized(false);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerPaymentDistribution = async () => {
    if (!confirm('This will check all completed requests and attempt to distribute payments to reviewers who have set up Stripe. Continue?')) {
      return;
    }

    setProcessing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/payments/retry-failed-distributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 50 })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process payments');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (isAuthorized === false) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '10px' }}>Access Denied</h1>
        <p>You do not have permission to access this page.</p>
        <p style={{ marginTop: '20px', color: '#666' }}>
          Please contact the administrator if you believe this is an error.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '10px' }}>Manual Payment Distribution</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Click the button below to manually check all completed requests and distribute payments to reviewers who have set up Stripe Connect.
      </p>

      {/* Action Button */}
      <div style={{ marginBottom: '30px' }}>
        <button
          onClick={handleTriggerPaymentDistribution}
          disabled={processing}
          style={{
            background: processing ? '#ccc' : '#4caf50',
            color: 'white',
            border: 'none',
            padding: '16px 32px',
            borderRadius: '8px',
            fontSize: '18px',
            fontWeight: '600',
            cursor: processing ? 'not-allowed' : 'pointer',
            boxShadow: processing ? 'none' : '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!processing) {
              e.currentTarget.style.background = '#45a049';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
            }
          }}
          onMouseLeave={(e) => {
            if (!processing) {
              e.currentTarget.style.background = '#4caf50';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            }
          }}
        >
          {processing ? '⏳ Processing...' : '🚀 Run Payment Distribution'}
        </button>
      </div>

      {/* Result Message */}
      {result && (
        <div style={{
          background: '#e8f5e9',
          border: '1px solid #4caf50',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3 style={{ marginTop: 0, color: '#2e7d32', marginBottom: '15px' }}>✅ Processing Complete</h3>
          <div style={{ background: 'white', padding: '15px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '14px' }}>
            <div><strong>Processed:</strong> {result.results?.processed || 0}</div>
            <div><strong>Successful:</strong> {result.results?.successful || 0}</div>
            <div><strong>Failed:</strong> {result.results?.failed || 0}</div>
            <div><strong>Skipped:</strong> {result.results?.skipped || 0}</div>
            {result.results?.errors && result.results.errors.length > 0 && (
              <div style={{ marginTop: '10px', color: '#d32f2f' }}>
                <strong>Errors:</strong>
                <pre style={{ background: '#ffebee', padding: '10px', borderRadius: '4px', overflow: 'auto', maxHeight: '200px' }}>
                  {JSON.stringify(result.results.errors.slice(0, 5), null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={{
          background: '#ffebee',
          border: '1px solid #f44336',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          color: '#c62828'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Info Box */}
      <div style={{
        background: '#e3f2fd',
        border: '1px solid #2196f3',
        padding: '20px',
        borderRadius: '8px',
        marginTop: '30px'
      }}>
        <h3 style={{ marginTop: 0, color: '#1565c0' }}>ℹ️ How This Works</h3>
        <ul style={{ color: '#666', lineHeight: '1.6' }}>
          <li>This checks all completed review requests that haven't been paid yet</li>
          <li>It attempts to distribute payments to reviewers who have set up Stripe Connect</li>
          <li>Payments are skipped if the reviewer hasn't set up Stripe yet (they'll be processed later)</li>
          <li>You can run this once a day or as needed</li>
        </ul>
      </div>
    </div>
  );
}

