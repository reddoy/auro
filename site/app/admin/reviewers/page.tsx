'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import AdminNav from '@/app/admin/components/AdminNav';

type ReviewerTab = 'pending' | 'approved' | 'rejected' | 'users';

type ProfileRow = {
  id: string;
  email: string | null;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  bio: string | null;
  skills: string[] | null;
  hourly_rate: number | null;
  avatar_url: string | null;
  links: Record<string, unknown> | null;
  is_reviewer: string | null;
  created_at: string | null;
  stripe_connect_account_id: string | null;
  is_admin?: boolean | null;
};

function profileAvatarViewUrl(avatar_url: string | null | undefined): string | undefined {
  if (!avatar_url) return undefined;
  if (/^https?:\/\//i.test(avatar_url)) return avatar_url;
  return `/api/storage/signed-view?path=${encodeURIComponent(avatar_url)}&bucket=avatars`;
}

function displayName(p: ProfileRow): string {
  const parts = [p.first_name, p.last_name].filter(Boolean);
  if (parts.length) return parts.join(' ');
  if (p.username) return p.username;
  return p.email || p.id.slice(0, 8);
}

export default function AdminReviewersPage() {
  const [loading, setLoading] = useState(true);
  /** null = still resolving; true = admin session; false = not signed in; 'forbidden' = signed in but not admin */
  const [isAuthorized, setIsAuthorized] = useState<boolean | 'forbidden' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ReviewerTab>('pending');
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [userTotal, setUserTotal] = useState<number | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const authHeader = useCallback(async (): Promise<string | null> => {
    if (!supabase?.auth) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? `Bearer ${session.access_token}` : null;
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      if (!supabase?.auth) {
        setIsAuthorized(false);
        setLoading(false);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const h = await authHeader();
        if (h) {
          const authResponse = await fetch('/api/admin/check-access', { headers: { Authorization: h } });
          if (authResponse.ok) {
            setIsAuthorized(true);
            setLoading(false);
            return;
          }
        }
        setIsAuthorized('forbidden');
        setLoading(false);
        return;
      }
      setIsAuthorized(false);
      setLoading(false);
    } catch {
      setIsAuthorized(false);
      setLoading(false);
    }
  }, [authHeader]);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  const loadList = useCallback(async () => {
    const h = await authHeader();
    if (!h) return;
    setError(null);
    if (tab === 'users') {
      const res = await fetch('/api/admin/users?limit=150&offset=0', { headers: { Authorization: h } });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error || 'Failed to load users');
        setProfiles([]);
        return;
      }
      setProfiles(j.profiles || []);
      setUserTotal(typeof j.count === 'number' ? j.count : null);
      return;
    }
    const res = await fetch(`/api/admin/reviewers?status=${encodeURIComponent(tab)}`, {
      headers: { Authorization: h },
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(j.error || 'Failed to load reviewers');
      setProfiles([]);
      return;
    }
    setProfiles(j.profiles || []);
    setUserTotal(null);
  }, [authHeader, tab]);

  useEffect(() => {
    if (isAuthorized !== true) return;
    void loadList();
  }, [isAuthorized, loadList]);

  const decide = async (userId: string, action: 'approve' | 'reject') => {
    const label = action === 'approve' ? 'Approve' : 'Reject';
    if (!confirm(`${label} this reviewer application?`)) return;
    const h = await authHeader();
    if (!h) return;
    setActingId(userId);
    setError(null);
    try {
      const res = await fetch('/api/admin/reviewers/decision', {
        method: 'POST',
        headers: { Authorization: h, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Request failed');
      await loadList();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setActingId(null);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          padding: '40px',
          textAlign: 'center',
          maxWidth: '1400px',
          margin: '0 auto',
          background: '#0C0225',
          minHeight: '100vh',
          color: '#FFFFFF',
        }}
      >
        <p style={{ color: 'rgba(255,255,255,0.72)' }}>Loading...</p>
      </div>
    );
  }

  if (isAuthorized === false) {
    return (
      <div
        style={{
          padding: '40px',
          textAlign: 'center',
          maxWidth: '560px',
          margin: '0 auto',
          background: '#0C0225',
          minHeight: '100vh',
          color: '#FFFFFF',
        }}
      >
        <h1 style={{ fontSize: '24px', marginBottom: '12px' }}>Sign in required</h1>
        <p style={{ color: 'rgba(255,255,255,0.72)', marginBottom: '20px', lineHeight: 1.5 }}>
          Sign in with your Auro account. Admins need <code style={{ color: '#F26955' }}>is_admin = true</code> on
          their profile in Supabase, or to be listed in{' '}
          <code style={{ color: '#F26955' }}>MASTER_ADMIN_EMAILS</code> /{' '}
          <code style={{ color: '#F26955' }}>MASTER_ADMIN_USER_IDS</code> in the site environment.
        </p>
        <Link
          href="/auth/sign-in?redirect_to=/admin/reviewers"
          style={{
            display: 'inline-block',
            background: '#F26955',
            color: '#0C0225',
            padding: '12px 22px',
            borderRadius: '8px',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (isAuthorized === 'forbidden') {
    return (
      <div
        style={{
          padding: '40px',
          textAlign: 'center',
          maxWidth: '560px',
          margin: '0 auto',
          background: '#0C0225',
          minHeight: '100vh',
          color: '#FFFFFF',
        }}
      >
        <h1 style={{ fontSize: '24px', marginBottom: '12px' }}>Not an admin</h1>
        <p style={{ color: 'rgba(255,255,255,0.72)', marginBottom: '20px', lineHeight: 1.5 }}>
          You are signed in, but this account is not allowed to use admin tools. Ask the project owner to set{' '}
          <code style={{ color: '#F26955' }}>is_admin = true</code> on your row in the{' '}
          <code style={{ color: '#F26955' }}>profiles</code> table, or add your email to{' '}
          <code style={{ color: '#F26955' }}>MASTER_ADMIN_EMAILS</code>.
        </p>
        <Link href="/" style={{ color: '#F26955' }}>
          Back to home
        </Link>
      </div>
    );
  }

  const tabBtn = (id: ReviewerTab, label: string) => (
    <button
      type="button"
      key={id}
      onClick={() => setTab(id)}
      style={{
        padding: '8px 14px',
        borderRadius: '8px',
        border: tab === id ? 'none' : '1px solid rgba(255,255,255,0.15)',
        background: tab === id ? '#F26955' : 'rgba(255,255,255,0.06)',
        color: tab === id ? '#0C0225' : '#fff',
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '40px 20px',
        background: '#0C0225',
        minHeight: '100vh',
        color: '#FFFFFF',
      }}
    >
      <AdminNav current="people" />
      <h1 style={{ fontSize: '30px', marginBottom: '8px' }}>People & reviewers</h1>
      <p style={{ color: 'rgba(255,255,255,0.72)', marginBottom: '24px' }}>
        Pending applications, active reviewers, and all user profiles.
      </p>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {tabBtn('pending', 'Pending')}
        {tabBtn('approved', 'Approved reviewers')}
        {tabBtn('rejected', 'Rejected')}
        {tabBtn('users', 'All users')}
      </div>

      {tab === 'users' && userTotal !== null && (
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '16px' }}>
          Showing {profiles.length} of {userTotal} profiles (newest first).
        </p>
      )}

      {error && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px',
            background: 'rgba(255, 77, 79, 0.15)',
            border: '1px solid #FF4D4F',
            color: '#FFAAA8',
            borderRadius: '8px',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {profiles.map((p) => {
          const av = profileAvatarViewUrl(p.avatar_url || undefined);
          return (
            <div
              key={p.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '88px 1fr',
                gap: '16px',
                padding: '16px',
                background: '#2A1B3D',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div>
                {av ? (
                  <img
                    src={av}
                    alt=""
                    width={88}
                    height={88}
                    style={{ borderRadius: '12px', objectFit: 'cover', width: 88, height: 88 }}
                  />
                ) : (
                  <div
                    style={{
                      width: 88,
                      height: 88,
                      borderRadius: '12px',
                      background: 'rgba(255,255,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      color: 'rgba(255,255,255,0.5)',
                    }}
                  >
                    No photo
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '17px', marginBottom: '4px' }}>{displayName(p)}</div>
                <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '14px', marginBottom: '8px' }}>
                  {p.email}
                  {p.username ? (
                    <>
                      {' '}
                      · @{p.username}
                      {' '}
                      ·{' '}
                      <Link href={`/${encodeURIComponent(p.username)}`} style={{ color: '#F26955' }}>
                        Public profile
                      </Link>
                    </>
                  ) : null}
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', marginBottom: '6px' }}>
                  Reviewer status: <strong style={{ color: '#fff' }}>{p.is_reviewer ?? '—'}</strong>
                  {typeof p.is_admin === 'boolean' ? (
                    <>
                      {' '}
                      · Admin: <strong style={{ color: '#fff' }}>{p.is_admin ? 'yes' : 'no'}</strong>
                    </>
                  ) : null}
                  {p.stripe_connect_account_id ? ' · Stripe Connect linked' : ''}
                </div>
                {p.bio ? (
                  <p style={{ fontSize: '14px', lineHeight: 1.45, margin: '8px 0', color: 'rgba(255,255,255,0.85)' }}>
                    {p.bio}
                  </p>
                ) : null}
                {p.skills && p.skills.length > 0 ? (
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                    Skills: {p.skills.join(', ')}
                  </p>
                ) : null}
                {p.hourly_rate != null ? (
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                    Rate (USD): ${Number(p.hourly_rate).toFixed(2)}
                  </p>
                ) : null}
                {p.links && Object.keys(p.links).length > 0 ? (
                  <pre
                    style={{
                      fontSize: '12px',
                      background: 'rgba(0,0,0,0.25)',
                      padding: '8px',
                      borderRadius: '6px',
                      overflow: 'auto',
                      maxHeight: '120px',
                    }}
                  >
                    {JSON.stringify(p.links, null, 2)}
                  </pre>
                ) : null}
                {tab === 'pending' && p.is_reviewer === 'pending' ? (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                    <button
                      type="button"
                      disabled={actingId === p.id}
                      onClick={() => void decide(p.id, 'approve')}
                      style={{
                        background: '#2d6a4f',
                        color: '#fff',
                        border: 'none',
                        padding: '10px 18px',
                        borderRadius: '8px',
                        fontWeight: 600,
                        cursor: actingId === p.id ? 'wait' : 'pointer',
                      }}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={actingId === p.id}
                      onClick={() => void decide(p.id, 'reject')}
                      style={{
                        background: 'rgba(255, 77, 79, 0.25)',
                        color: '#ffb4b4',
                        border: '1px solid #FF4D4F',
                        padding: '10px 18px',
                        borderRadius: '8px',
                        fontWeight: 600,
                        cursor: actingId === p.id ? 'wait' : 'pointer',
                      }}
                    >
                      Reject
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {profiles.length === 0 && !error ? (
        <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '24px' }}>No rows for this filter.</p>
      ) : null}
    </div>
  );
}
