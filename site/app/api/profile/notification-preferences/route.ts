import { createClient } from '@supabase/supabase-js';
import { requireAuthenticatedUser } from '@/lib/require-authenticated-user';
import { normalizePhoneE164 } from '@/lib/notifications/preferences';

export async function GET(req: Request) {
  const gate = await requireAuthenticatedUser(req);
  if (!gate.ok) {
    return new Response(JSON.stringify(gate.body), { status: gate.status });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const admin = createClient(url, key);

  const { data: profile } = await admin
    .from('profiles')
    .select('preferences, email')
    .eq('id', gate.user.userId)
    .maybeSingle();

  const prefs = (profile?.preferences as Record<string, unknown>) || {};

  return new Response(
    JSON.stringify({
      email: profile?.email ?? gate.user.email ?? null,
      email_notifications: prefs.email_notifications !== false,
      sms_notifications: prefs.sms_notifications === true,
      phone: typeof prefs.phone === 'string' ? prefs.phone : null,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

export async function POST(req: Request) {
  const gate = await requireAuthenticatedUser(req);
  if (!gate.ok) {
    return new Response(JSON.stringify(gate.body), { status: gate.status });
  }

  let body: {
    email_notifications?: boolean;
    sms_notifications?: boolean;
    phone?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const admin = createClient(url, key);

  const { data: profile } = await admin
    .from('profiles')
    .select('preferences')
    .eq('id', gate.user.userId)
    .maybeSingle();

  const existing = (profile?.preferences as Record<string, unknown>) || {};
  const next: Record<string, unknown> = { ...existing };

  if (typeof body.email_notifications === 'boolean') {
    next.email_notifications = body.email_notifications;
  }
  if (typeof body.sms_notifications === 'boolean') {
    next.sms_notifications = body.sms_notifications;
  }
  if (body.phone !== undefined) {
    const normalized = body.phone ? normalizePhoneE164(body.phone) : null;
    if (body.phone && !normalized) {
      return new Response(JSON.stringify({ error: 'Invalid phone number' }), { status: 400 });
    }
    next.phone = normalized;
  }

  const { error } = await admin
    .from('profiles')
    .update({ preferences: next })
    .eq('id', gate.user.userId);

  if (error) {
    return new Response(JSON.stringify({ error: 'Failed to update preferences' }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true, preferences: next }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
