'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Prefs = {
  email: string | null;
  email_notifications: boolean;
  sms_notifications: boolean;
  phone: string | null;
};

export default function NotificationSettingsPage() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [phone, setPhone] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setError('Please sign in to manage notifications.');
        return;
      }
      const res = await fetch('/api/profile/notification-preferences', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to load preferences');
      setPrefs(body);
      setPhone(body.phone || '');
      setEmailNotifications(body.email_notifications !== false);
      setSmsNotifications(body.sms_notifications === true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onSave = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Not signed in');
      const res = await fetch('/api/profile/notification-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          phone: phone.trim() || null,
          email_notifications: emailNotifications,
          sms_notifications: smsNotifications && !!phone.trim(),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Save failed');
      setMessage('Preferences saved.');
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Link href="/app" className="text-sm text-white/60 hover:text-white">
        ← Back to dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-white">Notification settings</h1>
      <p className="mt-2 text-sm text-white/70">
        Choose how we reach you about reviews, payments, and deadlines.
      </p>

      {loading && <p className="mt-8 text-white/60">Loading…</p>}
      {error && <p className="mt-8 text-red-300">{error}</p>}

      {!loading && !error && (
        <div className="mt-8 space-y-6 rounded-xl border border-white/10 bg-white/5 p-6">
          {prefs?.email && (
            <p className="text-sm text-white/70">
              Account email: <span className="text-white">{prefs.email}</span>
            </p>
          )}

          <label className="flex items-center gap-3 text-white">
            <input
              type="checkbox"
              checked={emailNotifications}
              onChange={(e) => setEmailNotifications(e.target.checked)}
            />
            Email notifications
          </label>

          <div>
            <label htmlFor="settings-phone" className="block text-sm text-white/80 mb-2">
              Mobile number
            </label>
            <input
              id="settings-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
              className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-white"
            />
          </div>

          <label className="flex items-start gap-3 text-white text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={smsNotifications}
              onChange={(e) => setSmsNotifications(e.target.checked)}
              disabled={!phone.trim()}
            />
            <span>
              SMS/text notifications for review updates and deadlines. Message and data rates may apply.
            </span>
          </label>

          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="w-full rounded-lg bg-[#FF6B35] px-4 py-3 font-semibold text-white disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save preferences'}
          </button>

          {message && <p className="text-sm text-green-300">{message}</p>}
        </div>
      )}
    </div>
  );
}
