'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

interface PaymentStats {
  totalRequests: number;
  totalRevenue: number;
  totalFees: number;
  totalPaidOut: number;
  totalRefunded: number;
  pendingPayouts: number;
  failedDistributions: number;
  timeoutRequests: number;
}

interface PendingPayment {
  id: string;
  amount_cents: number;
  reviewer_amount_cents: number;
  payment_distribution_error: string | null;
  payment_distribution_attempts: number;
  created_at: string;
  reviewer: {
    username: string | null;
    email: string | null;
    stripe_connect_account_id: string | null;
  } | null;
}

export default function AdminPaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const [password, setPassword] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);

  const checkAuth = async () => {
    try {
      // First try email-based auth (if configured)
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const authResponse = await fetch('/api/admin/check-access', {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          }
        });

        if (authResponse.ok) {
          setIsAuthorized(true);
          loadData();
          return;
        }
      }

      // If email-based auth fails, show password prompt
      setShowPasswordPrompt(true);
      setLoading(false);
    } catch (err: any) {
      console.error('Auth check error:', err);
      // Fall back to password prompt
      setShowPasswordPrompt(true);
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch('/api/admin/check-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Invalid password');
      }

      setIsAuthorized(true);
      setShowPasswordPrompt(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Invalid password');
    }
  };

  const loadData = async () => {
    try {
      // Load stats
      const statsResponse = await fetch('/api/admin/payment-dashboard?period=30d');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

      // Load pending payments
      const pendingResponse = await fetch('/api/admin/pending-payments');
      if (pendingResponse.ok) {
        const pendingData = await pendingResponse.json();
        setPendingPayments(pendingData.pendingPayments || []);
      }
    } catch (err: any) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetryDistributions = async () => {
    if (!confirm('This will retry all failed payment distributions. Continue?')) return;

    setProcessing('retry');
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/payments/retry-failed-distributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 50 })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to process');
      setResult(data);
      setTimeout(() => loadData(), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleProcessTimeoutRefunds = async () => {
    if (!confirm('This will process timeout refunds for requests that exceeded deadlines. Continue?')) return;

    setProcessing('timeout');
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/payments/process-timeout-refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 25 })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to process');
      setResult(data);
      setTimeout(() => loadData(), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', maxWidth: '1400px', margin: '0 auto' }}>
        <p>Loading...</p>
      </div>
    );
  }

  // Show password prompt if not authorized yet
  if (showPasswordPrompt && !isAuthorized) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center', 
        maxWidth: '500px', 
        margin: '100px auto',
        background: '#f5f5f5',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ fontSize: '28px', marginBottom: '10px' }}>Admin Access</h1>
        <p style={{ color: '#666', marginBottom: '30px' }}>Enter admin password to continue</p>
        
        <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin Password"
            style={{
              padding: '12px 16px',
              fontSize: '16px',
              borderRadius: '8px',
              border: '1px solid #ddd',
              width: '100%'
            }}
            autoFocus
          />
          <button
            type="submit"
            style={{
              background: '#4caf50',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Sign In
          </button>
        </form>

        {error && (
          <div style={{
            marginTop: '20px',
            padding: '12px',
            background: '#ffebee',
            color: '#c62828',
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  if (isAuthorized === false) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '10px' }}>Access Denied</h1>
        <p>You do not have permission to access this page.</p>
      </div>
    );
  }

  const totalPending = pendingPayments.length;
  const totalPendingAmount = pendingPayments.reduce((sum, p) => sum + (p.reviewer_amount_cents || 0), 0);
  const withStripe = pendingPayments.filter(p => p.reviewer?.stripe_connect_account_id).length;
  const withoutStripe = pendingPayments.filter(p => !p.reviewer?.stripe_connect_account_id).length;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '10px' }}>Admin - Payment Management</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Manage payment distributions, refunds, and view payment statistics
      </p>

      {/* Stats Cards */}
      {stats && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '20px', 
          marginBottom: '30px' 
        }}>
          <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>
              ${((stats.totalRevenue || 0) / 100).toFixed(2)}
            </div>
            <div style={{ color: '#666' }}>Total Revenue</div>
          </div>
          <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>
              ${((stats.totalPaidOut || 0) / 100).toFixed(2)}
            </div>
            <div style={{ color: '#666' }}>Paid to Reviewers</div>
          </div>
          <div style={{ background: '#fff3e0', padding: '20px', borderRadius: '8px', border: '1px solid #ff9800' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>
              ${((stats.pendingPayouts || 0) / 100).toFixed(2)}
            </div>
            <div style={{ color: '#666' }}>Pending Payouts</div>
          </div>
          <div style={{ background: '#ffebee', padding: '20px', borderRadius: '8px', border: '1px solid #f44336' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>
              {stats.failedDistributions || 0}
            </div>
            <div style={{ color: '#666' }}>Failed Distributions</div>
          </div>
          <div style={{ background: '#ffebee', padding: '20px', borderRadius: '8px', border: '1px solid #f44336' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>
              {stats.timeoutRequests || 0}
            </div>
            <div style={{ color: '#666' }}>Timeout Requests</div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '15px', 
        marginBottom: '30px' 
      }}>
        <button
          onClick={handleRetryDistributions}
          disabled={processing !== null}
          style={{
            background: processing === 'retry' ? '#ccc' : '#4caf50',
            color: 'white',
            border: 'none',
            padding: '16px 24px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: processing !== null ? 'not-allowed' : 'pointer',
            boxShadow: processing === 'retry' ? 'none' : '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          {processing === 'retry' ? '⏳ Processing...' : '🔄 Retry Failed Distributions'}
        </button>

        <button
          onClick={handleProcessTimeoutRefunds}
          disabled={processing !== null}
          style={{
            background: processing === 'timeout' ? '#ccc' : '#ff9800',
            color: 'white',
            border: 'none',
            padding: '16px 24px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: processing !== null ? 'not-allowed' : 'pointer',
            boxShadow: processing === 'timeout' ? 'none' : '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          {processing === 'timeout' ? '⏳ Processing...' : '⏰ Process Timeout Refunds'}
        </button>

        <button
          onClick={loadData}
          disabled={loading}
          style={{
            background: '#2196f3',
            color: 'white',
            border: 'none',
            padding: '16px 24px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          {loading ? 'Refreshing...' : '🔄 Refresh Data'}
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
            {result.results && (
              <>
                <div><strong>Processed:</strong> {result.results.processed || 0}</div>
                <div><strong>Successful:</strong> {result.results.successful || 0}</div>
                <div><strong>Failed:</strong> {result.results.failed || 0}</div>
                <div><strong>Skipped:</strong> {result.results.skipped || 0}</div>
              </>
            )}
            {result.message && <div><strong>Message:</strong> {result.message}</div>}
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

      {/* Pending Payments Summary */}
      <div style={{ 
        background: '#f5f5f5', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '30px',
        border: '1px solid #ddd'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '15px' }}>Pending Payments Summary</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{totalPending}</div>
            <div style={{ color: '#666', fontSize: '14px' }}>Total Pending</div>
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>${(totalPendingAmount / 100).toFixed(2)}</div>
            <div style={{ color: '#666', fontSize: '14px' }}>Total Amount</div>
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#4caf50' }}>{withStripe}</div>
            <div style={{ color: '#666', fontSize: '14px' }}>Ready to Pay</div>
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ff9800' }}>{withoutStripe}</div>
            <div style={{ color: '#666', fontSize: '14px' }}>Waiting for Stripe</div>
          </div>
        </div>
      </div>

      {/* Pending Payments Table */}
      <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd' }}>
        <h2 style={{ padding: '20px', margin: 0, borderBottom: '2px solid #ddd' }}>Pending Payments</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Request ID</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Reviewer</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Amount</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Stripe</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Attempts</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Error</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Completed</th>
              </tr>
            </thead>
            <tbody>
              {pendingPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                    No pending payments! 🎉
                  </td>
                </tr>
              ) : (
                pendingPayments.map((payment) => (
                  <tr key={payment.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '12px' }}>
                      {payment.id.slice(0, 8)}...
                    </td>
                    <td style={{ padding: '12px' }}>
                      {payment.reviewer?.username || payment.reviewer?.email || 'Unknown'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                      ${((payment.reviewer_amount_cents || 0) / 100).toFixed(2)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {payment.reviewer?.stripe_connect_account_id ? (
                        <span style={{ color: '#4caf50', fontWeight: '600' }}>✅</span>
                      ) : (
                        <span style={{ color: '#ff9800', fontWeight: '600' }}>⏸️</span>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {payment.payment_distribution_attempts || 0}
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#666', maxWidth: '300px' }}>
                      {payment.payment_distribution_error ? (
                        <span title={payment.payment_distribution_error}>
                          {payment.payment_distribution_error.length > 50 
                            ? payment.payment_distribution_error.substring(0, 50) + '...'
                            : payment.payment_distribution_error}
                        </span>
                      ) : (
                        <span style={{ color: '#999' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>
                      {new Date(payment.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
