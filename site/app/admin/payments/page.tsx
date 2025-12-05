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
    
    // Add global styles for input placeholder
    const style = document.createElement('style');
    style.textContent = `
      .admin-password-input::placeholder {
        color: rgba(199, 191, 217, 0.5) !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      // Cleanup on unmount
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, []);

  const [email, setEmail] = useState('');
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

    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    try {
      const response = await fetch('/api/admin/check-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Invalid credentials');
      }

      setIsAuthorized(true);
      setShowPasswordPrompt(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
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
      <div style={{ 
        padding: '40px', 
        textAlign: 'center', 
        maxWidth: '1400px', 
        margin: '0 auto',
        background: '#0C0225',
        minHeight: '100vh',
        color: '#FFFFFF'
      }}>
        <p style={{ color: '#C7BFD9' }}>Loading...</p>
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
        background: '#2A1B3D',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h1 style={{ fontSize: '28px', marginBottom: '10px', color: '#FFFFFF' }}>Pingle Pongle</h1>
        <p style={{ color: '#C7BFD9', marginBottom: '30px' }}>Enter email and password to continue</p>
        
        <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="admin-password-input"
            style={{
              padding: '12px 16px',
              fontSize: '16px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: '#1F1629',
              color: '#FFFFFF',
              width: '100%'
            }}
            autoFocus
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="admin-password-input"
            style={{
              padding: '12px 16px',
              fontSize: '16px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: '#1F1629',
              color: '#FFFFFF',
              width: '100%'
            }}
          />
          <button
            type="submit"
            style={{
              background: 'linear-gradient(90deg, #FF6F00 0%, #FF2D55 100%)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(255, 45, 85, 0.3)'
            }}
          >
            Sign In
          </button>
        </form>

        {error && (
          <div style={{
            marginTop: '20px',
            padding: '12px',
            background: 'rgba(255, 77, 79, 0.2)',
            border: '1px solid #FF4D4F',
            color: '#FF4D4F',
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
      <div style={{ 
        padding: '40px', 
        textAlign: 'center', 
        maxWidth: '1400px', 
        margin: '0 auto',
        background: '#0C0225',
        minHeight: '100vh',
        color: '#FFFFFF'
      }}>
        <h1 style={{ fontSize: '24px', marginBottom: '10px', color: '#FFFFFF' }}>Access Denied</h1>
        <p style={{ color: '#C7BFD9' }}>You do not have permission to access this page.</p>
      </div>
    );
  }

  const totalPending = pendingPayments.length;
  const totalPendingAmount = pendingPayments.reduce((sum, p) => sum + (p.reviewer_amount_cents || 0), 0);
  const withStripe = pendingPayments.filter(p => p.reviewer?.stripe_connect_account_id).length;
  const withoutStripe = pendingPayments.filter(p => !p.reviewer?.stripe_connect_account_id).length;

  return (
    <div style={{ 
      maxWidth: '1400px', 
      margin: '0 auto', 
      padding: '40px 20px',
      background: '#0C0225',
      minHeight: '100vh',
      color: '#FFFFFF'
    }}>
      <h1 style={{ fontSize: '32px', marginBottom: '10px', color: '#FFFFFF' }}>Pingle Pongle</h1>
      <p style={{ color: '#C7BFD9', marginBottom: '30px' }}>
        Payment management and distribution tools
      </p>

      {/* Stats Cards */}
      {stats && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '20px', 
          marginBottom: '30px' 
        }}>
          <div style={{ background: '#2A1B3D', padding: '20px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '5px', color: '#FFFFFF' }}>
              ${((stats.totalRevenue || 0) / 100).toFixed(2)}
            </div>
            <div style={{ color: '#C7BFD9' }}>Total Revenue</div>
          </div>
          <div style={{ background: '#2A1B3D', padding: '20px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '5px', color: '#FFFFFF' }}>
              ${((stats.totalPaidOut || 0) / 100).toFixed(2)}
            </div>
            <div style={{ color: '#C7BFD9' }}>Paid to Reviewers</div>
          </div>
          <div style={{ background: '#342346', padding: '20px', borderRadius: '8px', border: '1px solid #FF6F00' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '5px', color: '#FFFFFF' }}>
              ${((stats.pendingPayouts || 0) / 100).toFixed(2)}
            </div>
            <div style={{ color: '#C7BFD9' }}>Pending Payouts</div>
          </div>
          <div style={{ background: '#2A1B3D', padding: '20px', borderRadius: '8px', border: '1px solid #FF4D4F' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '5px', color: '#FF4D4F' }}>
              {stats.failedDistributions || 0}
            </div>
            <div style={{ color: '#C7BFD9' }}>Failed Distributions</div>
          </div>
          <div style={{ background: '#2A1B3D', padding: '20px', borderRadius: '8px', border: '1px solid #FF4D4F' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '5px', color: '#FF4D4F' }}>
              {stats.timeoutRequests || 0}
            </div>
            <div style={{ color: '#C7BFD9' }}>Timeout Requests</div>
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
            background: processing === 'retry' ? '#342346' : 'linear-gradient(90deg, #FF6F00 0%, #FF2D55 100%)',
            color: 'white',
            border: 'none',
            padding: '16px 24px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: processing !== null ? 'not-allowed' : 'pointer',
            boxShadow: processing === 'retry' ? 'none' : '0 2px 8px rgba(255, 45, 85, 0.3)',
            opacity: processing === 'retry' ? 0.6 : 1
          }}
        >
          {processing === 'retry' ? '⏳ Processing...' : '🔄 Retry Failed Distributions'}
        </button>

        <button
          onClick={handleProcessTimeoutRefunds}
          disabled={processing !== null}
          style={{
            background: processing === 'timeout' ? '#342346' : '#FF6F00',
            color: 'white',
            border: 'none',
            padding: '16px 24px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: processing !== null ? 'not-allowed' : 'pointer',
            boxShadow: processing === 'timeout' ? 'none' : '0 2px 8px rgba(255, 111, 0, 0.3)',
            opacity: processing === 'timeout' ? 0.6 : 1
          }}
        >
          {processing === 'timeout' ? '⏳ Processing...' : '⏰ Process Timeout Refunds'}
        </button>

        <button
          onClick={loadData}
          disabled={loading}
          style={{
            background: '#2A1B3D',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            padding: '16px 24px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? 'Refreshing...' : '🔄 Refresh Data'}
        </button>
      </div>

      {/* Result Message */}
      {result && (
        <div style={{
          background: '#2A1B3D',
          border: '1px solid #3DDC84',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3 style={{ marginTop: 0, color: '#3DDC84', marginBottom: '15px' }}>✅ Processing Complete</h3>
          <div style={{ background: '#1F1629', padding: '15px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '14px', color: '#C7BFD9' }}>
            {result.results && (
              <>
                <div style={{ color: '#FFFFFF' }}><strong>Processed:</strong> {result.results.processed || 0}</div>
                <div style={{ color: '#3DDC84' }}><strong>Successful:</strong> {result.results.successful || 0}</div>
                <div style={{ color: '#FF4D4F' }}><strong>Failed:</strong> {result.results.failed || 0}</div>
                <div style={{ color: '#FFB300' }}><strong>Skipped:</strong> {result.results.skipped || 0}</div>
              </>
            )}
            {result.message && <div style={{ color: '#C7BFD9', marginTop: '10px' }}><strong>Message:</strong> {result.message}</div>}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={{
          background: '#2A1B3D',
          border: '1px solid #FF4D4F',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          color: '#FF4D4F'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Pending Payments Summary */}
      <div style={{ 
        background: '#2A1B3D', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '30px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '15px', color: '#FFFFFF' }}>Pending Payments Summary</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#FFFFFF' }}>{totalPending}</div>
            <div style={{ color: '#C7BFD9', fontSize: '14px' }}>Total Pending</div>
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#FFFFFF' }}>${(totalPendingAmount / 100).toFixed(2)}</div>
            <div style={{ color: '#C7BFD9', fontSize: '14px' }}>Total Amount</div>
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3DDC84' }}>{withStripe}</div>
            <div style={{ color: '#C7BFD9', fontSize: '14px' }}>Ready to Pay</div>
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#FF6F00' }}>{withoutStripe}</div>
            <div style={{ color: '#C7BFD9', fontSize: '14px' }}>Waiting for Stripe</div>
          </div>
        </div>
      </div>

      {/* Pending Payments Table */}
      <div style={{ background: '#2A1B3D', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <h2 style={{ padding: '20px', margin: 0, borderBottom: '2px solid rgba(255, 255, 255, 0.1)', color: '#FFFFFF' }}>Pending Payments</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#1F1629' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid rgba(255, 255, 255, 0.1)', color: '#C7BFD9' }}>Request ID</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid rgba(255, 255, 255, 0.1)', color: '#C7BFD9' }}>Reviewer</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid rgba(255, 255, 255, 0.1)', color: '#C7BFD9' }}>Amount</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid rgba(255, 255, 255, 0.1)', color: '#C7BFD9' }}>Stripe</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid rgba(255, 255, 255, 0.1)', color: '#C7BFD9' }}>Attempts</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid rgba(255, 255, 255, 0.1)', color: '#C7BFD9' }}>Error</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid rgba(255, 255, 255, 0.1)', color: '#C7BFD9' }}>Completed</th>
              </tr>
            </thead>
            <tbody>
              {pendingPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#C7BFD9' }}>
                    No pending payments! 🎉
                  </td>
                </tr>
              ) : (
                pendingPayments.map((payment) => (
                  <tr key={payment.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '12px', color: '#C7BFD9' }}>
                      {payment.id.slice(0, 8)}...
                    </td>
                    <td style={{ padding: '12px', color: '#FFFFFF' }}>
                      {payment.reviewer?.username || payment.reviewer?.email || 'Unknown'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#FFFFFF' }}>
                      ${((payment.reviewer_amount_cents || 0) / 100).toFixed(2)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {payment.reviewer?.stripe_connect_account_id ? (
                        <span style={{ color: '#3DDC84', fontWeight: '600' }}>✅</span>
                      ) : (
                        <span style={{ color: '#FF6F00', fontWeight: '600' }}>⏸️</span>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#C7BFD9' }}>
                      {payment.payment_distribution_attempts || 0}
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#C7BFD9', maxWidth: '300px' }}>
                      {payment.payment_distribution_error ? (
                        <span title={payment.payment_distribution_error}>
                          {payment.payment_distribution_error.length > 50 
                            ? payment.payment_distribution_error.substring(0, 50) + '...'
                            : payment.payment_distribution_error}
                        </span>
                      ) : (
                        <span style={{ color: '#666' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#C7BFD9' }}>
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
