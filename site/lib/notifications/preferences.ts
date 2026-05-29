import type { ProfilePreferences } from '@/types';

export type NotificationRecipient = {
  userId: string;
  email: string | null;
  phone: string | null;
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushToken: string | null;
  firstName: string | null;
};

function parsePreferences(raw: unknown): ProfilePreferences {
  if (!raw || typeof raw !== 'object') return {};
  return raw as ProfilePreferences;
}

export function normalizePhoneE164(phone: string | null | undefined): string | null {
  if (!phone || typeof phone !== 'string') return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  if (phone.trim().startsWith('+')) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+${digits}`;
}

export function recipientFromProfileRow(row: {
  id: string;
  email?: string | null;
  preferences?: unknown;
  push_token?: string | null;
  first_name?: string | null;
}): NotificationRecipient {
  const prefs = parsePreferences(row.preferences);
  const phone =
    normalizePhoneE164(
      (typeof prefs.phone === 'string' ? prefs.phone : null) ||
        (typeof (prefs as { phone_number?: string }).phone_number === 'string'
          ? (prefs as { phone_number?: string }).phone_number
          : null)
    ) ?? null;

  return {
    userId: row.id,
    email: row.email ?? null,
    phone,
    emailNotifications: prefs.email_notifications !== false,
    smsNotifications: prefs.sms_notifications === true,
    pushToken: row.push_token ?? null,
    firstName: row.first_name ?? null,
  };
}
